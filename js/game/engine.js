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

            // Center Stage focus scrolling
            const targetScrollTop = charSpan.offsetTop - (textDisplay.clientHeight / 2) + (charSpan.offsetHeight / 2);
            textDisplay.scrollTop = targetScrollTop;
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
        if (gameState.curriculum === 'mistakes') {
            const uniqueWords = gameState.currentLevelData.wordsInGroup || [];
            const wrongWords = [...(gameState.wordsWithMistakes || [])];
            const clearedWords = uniqueWords.filter(w => !gameState.wordsWithMistakes.has(w));
            if (window.StorageDB) {
                if (clearedWords.length > 0) StorageDB.removeMistakeWords(clearedWords).catch(e => console.error(e));
                if (wrongWords.length > 0) StorageDB.addMistakeWords(wrongWords).catch(e => console.error(e));
            }
        }

        // Trigger global complete callback in main.js
        const event = new CustomEvent('typingGameComplete', {
            detail: { wpm, accuracy, wordsTyped, won, levelId: gameState.currentLevelData.id, curriculum: gameState.curriculum }
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
        updateCaretPosition,
        abortGame
    };
})();
