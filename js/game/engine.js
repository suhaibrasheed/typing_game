(function() {
    const gameState = {
        gameRunning: false,
        startTime: null,
        timerInterval: null,
        competitorInterval: null,
        currentLevelData: null,
        curriculum: null,
        lastKeystrokeTime: null,
        typosCount: 0,
        totalTyped: 0,
        textLength: 0,
        soundTheme: 'Keyboard'
    };

    const DOMElements = {
        textDisplay: () => document.getElementById('text-display'),
        typingInput: () => document.getElementById('typing-input'),
        gameWpm: () => document.getElementById('game-wpm'),
        gameAccuracy: () => document.getElementById('game-accuracy'),
        progressBar: () => document.getElementById('progress-bar'),
        mainContent: () => document.getElementById('main-content'),
        gameSessionView: () => document.getElementById('game-session-view'),
        levelSelectionView: () => document.getElementById('level-selection-view')
    };

    // Shuffles an array to create randomized practice content
    function shuffleArray(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    // Generate paragraph of 80-100 words for levels that consist of single words
    function generateParagraph(words) {
        const targetWordCount = 80 + Math.floor(Math.random() * 21);
        let paragraph = '';
        const shuffled = shuffleArray([...words]);
        
        if (shuffled.some(w => w.includes(' '))) {
            paragraph = shuffled.join(' ');
        } else {
            let currentWordCount = 0;
            let i = 0;
            while (currentWordCount < targetWordCount && i < shuffled.length * 30) {
                const word = shuffled[i % shuffled.length];
                paragraph += word + ' ';
                currentWordCount++;
                i++;
            }
        }
        return paragraph.trim();
    }

    function startGame(levelData, curriculum, profileSettings, bestWpm) {
        gameState.currentLevelData = levelData;
        gameState.curriculum = curriculum;
        gameState.gameRunning = false;
        gameState.startTime = null;
        gameState.lastKeystrokeTime = null;
        gameState.typosCount = 0;
        gameState.totalTyped = 0;
        gameState.soundTheme = profileSettings.soundTheme;
        gameState.lastTypedLength = 0;
        gameState.wordsWithMistakes = new Set();
        gameState.lastOffsetTop = null; // <-- Add this line

        clearInterval(gameState.timerInterval);
        clearInterval(gameState.competitorInterval);

        const textDisplay = DOMElements.textDisplay();
        const typingInput = DOMElements.typingInput();
        const gameWpm = DOMElements.gameWpm();
        const gameAccuracy = DOMElements.gameAccuracy();
        const progressBar = DOMElements.progressBar();

        typingInput.value = '';
        typingInput.disabled = false;
        gameWpm.textContent = '0';
        gameAccuracy.textContent = '100%';
        progressBar.style.width = '0%';
        progressBar.classList.remove('glowing-finish');

        // Parse content
        let finalContent = "";
        if (Array.isArray(levelData.words)) {
            finalContent = generateParagraph(levelData.words);
        } else {
            finalContent = levelData.content || levelData.text || "";
        }
        gameState.finalText = finalContent;
        gameState.textLength = finalContent.length;
        gameState.allWordsInLesson = finalContent.split(/\s+/).map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase()).filter(Boolean);

        // Build character index to word index mapping
        const wordIndices = [];
        let currentWordIdx = 0;
        for (let i = 0; i < finalContent.length; i++) {
            if (finalContent[i] === ' ' || finalContent[i] === '\n' || finalContent[i] === '\t') {
                wordIndices[i] = -1; // space separator
                if (i > 0 && finalContent[i-1] !== ' ' && finalContent[i-1] !== '\n' && finalContent[i-1] !== '\t') {
                    currentWordIdx++;
                }
            } else {
                wordIndices[i] = currentWordIdx;
            }
        }
        gameState.wordIndices = wordIndices;
        gameState.charTimestamps = [];
        gameState.wordPauses = [];

        // Render characters
        textDisplay.innerHTML = `<div id="caret"></div>${finalContent.split('').map(c => `<span>${c}</span>`).join('')}`;
        textDisplay.scrollTop = 0;

        // Setup positions
        updateCaretPosition(0);
        CompetitorAI.setupCompetitor(profileSettings, bestWpm, finalContent.length);

        // Swap view states
        DOMElements.levelSelectionView().classList.add('hidden');
        DOMElements.gameSessionView().classList.remove('hidden');
        const navContainer = document.getElementById('app-nav-container');
        if (navContainer) navContainer.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Focus immediately
        setTimeout(() => typingInput.focus(), 50);
    }

    function handleTypingInput() {
        const typingInput = DOMElements.typingInput();
        const textDisplay = DOMElements.textDisplay();
        const charSpans = textDisplay.querySelectorAll('span');
        const typedValue = typingInput.value;
        const now = Date.now();

        if (!gameState.gameRunning && typedValue.length > 0) {
            gameState.gameRunning = true;
            gameState.startTime = now;
            gameState.lastKeystrokeTime = now;
            
            // Start timers
            gameState.timerInterval = setInterval(updateLiveStats, 1000);
            gameState.competitorInterval = setInterval(() => {
                CompetitorAI.updateCompetitor(gameState.startTime, gameState.textLength);
            }, 300);
        }

        if (typedValue.length > 0 && gameState.lastKeystrokeTime) {
            const delay = now - gameState.lastKeystrokeTime;
            const lastChar = typedValue[typedValue.length - 1];
            StorageDB.saveKeystrokeDelay(lastChar, delay);
        }

        const typedIndex = typedValue.length - 1;
        if (typedIndex >= 0 && typedIndex < gameState.textLength) {
            gameState.charTimestamps[typedIndex] = now;
            const w = gameState.wordIndices[typedIndex];
            if (w > 0 && (typedIndex === 0 || gameState.wordIndices[typedIndex - 1] !== w)) {
                let prevLastCharIdx = -1;
                for (let scan = typedIndex - 1; scan >= 0; scan--) {
                    if (gameState.wordIndices[scan] === w - 1) {
                        prevLastCharIdx = scan;
                        break;
                    }
                }
                if (prevLastCharIdx !== -1 && gameState.charTimestamps[prevLastCharIdx]) {
                    const pause = now - gameState.charTimestamps[prevLastCharIdx];
                    gameState.wordPauses[w] = pause;
                }
            }
        }

        gameState.lastKeystrokeTime = now;
        gameState.totalTyped = Math.max(gameState.totalTyped, typedValue.length);

        let hasError = false;
        let correctChars = 0;

        charSpans.forEach((charSpan, index) => {
            const typedChar = typedValue[index];
            if (typedChar == null) {
                charSpan.className = '';
            } else if (typedChar === charSpan.textContent) {
                charSpan.className = 'correct';
                correctChars++;
            } else {
                charSpan.className = 'incorrect';
                hasError = true;
            }
        });

        // Update player-0 (user) position on the racetrack dynamically
        const player0 = document.getElementById('player-0');
        if (player0 && gameState.textLength > 0) {
            const playerProgress = (typedValue.length / gameState.textLength) * 100;
            player0.style.left = `calc(${Math.min(100, playerProgress)}% - 44px)`;
        }

        // Check if the input event was a character deletion
        const isDeletion = typedValue.length < (gameState.lastTypedLength || 0);
        gameState.lastTypedLength = typedValue.length;

        if (!isDeletion && typedValue.length > 0) {
            const lastIndex = typedValue.length - 1;
            const isNewCharCorrect = typedValue[lastIndex] === charSpans[lastIndex].textContent;

            if (!isNewCharCorrect) {
                // Newly typed character is incorrect - trigger error feedback
                gameState.typosCount++;
                const mainContainer = DOMElements.mainContent();
                if (mainContainer) {
                    mainContainer.classList.add('shake');
                    setTimeout(() => mainContainer.classList.remove('shake'), 300);
                }
                const word = getWordAtCharIndex(gameState.finalText || '', lastIndex);
                if (word) {
                    if (!gameState.wordsWithMistakes) gameState.wordsWithMistakes = new Set();
                    gameState.wordsWithMistakes.add(word);
                    if (gameState.curriculum !== 'mistakes') {
                        StorageDB.addMistakeWords([word]).catch(e => console.error(e));
                    }
                }
            } else {
                // Newly typed character is correct - play sound if overall session accuracy satisfies 97%
                const acc = (correctChars / typedValue.length) * 100;
                if (acc >= 97) {
                    SoundEngine.playTypingSound(gameState.soundTheme);
                }
            }
        }

        updateCaretPosition(typedValue.length);
        updateLiveStats();

        if (typedValue.length === charSpans.length) {
            endGame();
        }
    }

    function updateCaretPosition(index) {
        const textDisplay = DOMElements.textDisplay();
        const charSpans = textDisplay.querySelectorAll('span');
        const caret = document.getElementById('caret');
        if (!caret) return;

        if (index < charSpans.length) {
            const charSpan = charSpans[index];
            caret.style.left = `${charSpan.offsetLeft}px`;
            caret.style.top = `${charSpan.offsetTop}px`;
            caret.style.height = `${charSpan.offsetHeight}px`;
            
            // Toggle active-char and current-word classes for the current typing word/character
            const currentWordIdx = gameState.wordIndices ? gameState.wordIndices[index] : -1;
            charSpans.forEach((span, i) => {
                if (i === index) {
                    span.classList.add('active-char');
                } else {
                    span.classList.remove('active-char');
                }
                
                if (currentWordIdx !== -1 && gameState.wordIndices && gameState.wordIndices[i] === currentWordIdx) {
                    span.classList.add('current-word');
                } else {
                    span.classList.remove('current-word');
                }
            });

            // Scroll smoothly only when active line (offsetTop) changes
            if (charSpan.offsetTop !== gameState.lastOffsetTop) {
                gameState.lastOffsetTop = charSpan.offsetTop;
                charSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function updateLiveStats() {
        if (!gameState.startTime) return;
        const textDisplay = DOMElements.textDisplay();
        const charSpans = textDisplay.querySelectorAll('span');
        const typingInput = DOMElements.typingInput();
        const typedValue = typingInput.value;
        const correctChars = textDisplay.querySelectorAll('.correct').length;

        const progress = (typedValue.length / charSpans.length) * 100;
        const progressBar = DOMElements.progressBar();
        progressBar.style.width = `${progress}%`;

        if (progress >= 90) {
            progressBar.classList.add('glowing-finish');
        } else {
            progressBar.classList.remove('glowing-finish');
        }

        const accuracy = typedValue.length > 0 ? Math.round((correctChars / typedValue.length) * 100) : 100;
        const gameAccuracy = DOMElements.gameAccuracy();
        gameAccuracy.textContent = `${accuracy}%`;

        const elapsedTime = (Date.now() - gameState.startTime) / 1000;
        if (elapsedTime > 0) {
            const rawWpm = ((typedValue.length / 5) / (elapsedTime / 60));
            const accuracyVal = typedValue.length > 0 ? (correctChars / typedValue.length) : 1;
            const wpm = Math.round(rawWpm * accuracyVal);
            DOMElements.gameWpm().textContent = wpm > 0 ? wpm : 0;
        }
    }

    function progressToPercentage(charsTyped) {
        if (gameState.textLength === 0) return 0;
        return (charsTyped / gameState.textLength) * 100;
    }

    function endGame() {
        gameState.gameRunning = false;
        clearInterval(gameState.timerInterval);
        clearInterval(gameState.competitorInterval);
        DOMElements.typingInput().disabled = true;

        const elapsedTime = (Date.now() - gameState.startTime) / 1000;
        const typingInput = DOMElements.typingInput();
        const textDisplay = DOMElements.textDisplay();
        const correctChars = textDisplay.querySelectorAll('.correct').length;

        const accuracy = typingInput.value.length > 0 ? Math.round((correctChars / typingInput.value.length) * 100) : 100;
        const rawWpm = (typingInput.value.length / 5) / (elapsedTime / 60);
        const wpm = Math.round(rawWpm * (accuracy / 100));

        const wordsTyped = typingInput.value.trim().split(/\s+/).filter(Boolean).length;
        
        // Check if player won: player only wins if competitor has not finished yet, and player's accuracy is >= 90%.
        const competitorState = CompetitorAI.getCompetitorState();
        let won = !competitorState.finishTime || competitorState.progress < 100;
        if (accuracy < 90) {
            won = false;
        }

        // Trigger complete sound
        SoundEngine.playSuccessSound();

        // Manage mistake bucket clearance if curriculum is mistakes
        let mistakeSummary = null;
        if (gameState.curriculum === 'mistakes') {
            const uniqueWords = gameState.currentLevelData.wordsInGroup || [];
            const wrongWords = [...(gameState.wordsWithMistakes || [])];
            const clearedWords = uniqueWords.filter(w => !gameState.wordsWithMistakes.has(w));
            
            // Calculate graduated vs reduced using rawGroup metadata
            const rawGroup = gameState.currentLevelData.rawGroup || [];
            let graduatedCount = 0;
            let reducedCount = 0;
            
            clearedWords.forEach(w => {
                const record = rawGroup.find(item => item.word === w);
                if (record) {
                    if ((record.weight || 1) <= 1) {
                        graduatedCount++;
                    } else {
                        reducedCount++;
                    }
                } else {
                    graduatedCount++;
                }
            });
            
            mistakeSummary = {
                graduated: graduatedCount,
                reduced: reducedCount,
                remaining: wrongWords.length
            };
            
            if (window.StorageDB) {
                if (clearedWords.length > 0) StorageDB.removeMistakeWords(clearedWords).catch(e => console.error(e));
                if (wrongWords.length > 0) StorageDB.addMistakeWords(wrongWords).catch(e => console.error(e));
            }
        }

        const pauses = (gameState.wordPauses || []).filter(v => typeof v === 'number');
        let averagePause = 0;
        let longestPause = 0;
        let flow = 100;
        if (pauses.length > 0) {
            const sum = pauses.reduce((a, b) => a + b, 0);
            averagePause = Math.round(sum / pauses.length);
            longestPause = Number((Math.max(...pauses) / 1000).toFixed(2));
            const mean = sum / pauses.length;
            const variance = pauses.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pauses.length;
            const stdDev = Math.sqrt(variance);
            if (mean > 0) {
                flow = Math.max(0, Math.min(100, Math.round(100 * (1 - (stdDev / mean)))));
            }
        }

        // Trigger global complete callback in main.js
        const event = new CustomEvent('typingGameComplete', {
            detail: { wpm, accuracy, wordsTyped, won, levelId: gameState.currentLevelData.id, curriculum: gameState.curriculum, mistakeSummary, averagePause, longestPause, flow }
        });
        window.dispatchEvent(event);
    }

    function abortGame() {
        gameState.gameRunning = false;
        clearInterval(gameState.timerInterval);
        clearInterval(gameState.competitorInterval);
        const typingInput = DOMElements.typingInput();
        if (typingInput) {
            typingInput.value = '';
            typingInput.disabled = true;
        }
    }

    function handleKeyDown(event) {
        if (event.key !== 'Backspace') return;
        const field = event.currentTarget;
        const cursor = field.selectionStart;
        
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (field.selectionStart !== field.selectionEnd) {
                const start = field.selectionStart;
                const end = field.selectionEnd;
                field.value = field.value.slice(0, start) + field.value.slice(end);
                field.selectionStart = field.selectionEnd = start;
                field.dispatchEvent(new Event('input'));
                return;
            }
            
            const prefix = field.value.slice(0, cursor);
            let i = cursor - 1;
            // Skip trailing whitespace
            while (i >= 0 && /\s/.test(prefix[i])) {
                i--;
            }
            // Skip word characters
            while (i >= 0 && !/\s/.test(prefix[i])) {
                i--;
            }
            const deleteStart = i + 1;
            
            if (cursor > deleteStart) {
                field.value = field.value.slice(0, deleteStart) + field.value.slice(cursor);
                field.selectionStart = field.selectionEnd = deleteStart;
                field.dispatchEvent(new Event('input'));
            }
        }
    }

    function getWordAtCharIndex(text, index) {
        if (index < 0 || index >= text.length) return '';
        let start = index;
        while (start > 0 && /\S/.test(text[start - 1])) {
            start--;
        }
        let end = index;
        while (end < text.length && /\S/.test(text[end])) {
            end++;
        }
        return text.slice(start, end).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
    }

    window.GameEngine = {
        gameState,
        startGame,
        handleTypingInput,
        handleKeyDown,
        updateCaretPosition,
        abortGame
    };
})();
