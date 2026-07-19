(function () {
    const PASSAGE_LIBRARY = {
        easy: window.EXAM_PASSAGES_EASY || [],
        medium: window.EXAM_PASSAGES_MEDIUM || [],
        hard: window.EXAM_PASSAGES_HARD || []
    };

    const EXAMS_CONFIG = {
        'JKSSB Junior Assistant': {
            wpm: 35,
            accuracy: 90,
            maxMarks: 20,
            desc: 'Train under real test constraints with official-style evaluation, restricted correction and an auditable score out of 20.'
        },
        'SSC CGL': {
            wpm: 27,
            accuracy: 93,
            maxMarks: 0,
            desc: 'Staff Selection Commission CGL DEST (Data Entry Skill Test). Requires 2000 keystrokes in 15 minutes.'
        },
        'SSC CHSL': {
            wpm: 35,
            accuracy: 93,
            maxMarks: 0,
            desc: 'Staff Selection Commission CHSL typing test. Requires 35 WPM net speed with high accuracy.'
        },
        'RRB NTPC': {
            wpm: 30,
            accuracy: 95,
            maxMarks: 0,
            desc: 'Railway Recruitment Board NTPC typing test. Requires 30 WPM in English with a maximum of 5% error rate.'
        },
        'High Court Typist': {
            wpm: 40,
            accuracy: 90,
            maxMarks: 20,
            desc: 'High Court Clerk/Typist typing exam. Challenging test requiring 40 WPM speed and high precision.'
        }
    };

    let selectedDuration = 600, selectedDifficulty = 'medium', selectedExam = 'JKSSB Junior Assistant';
    let remaining = 600, elapsed = 0, intervalId = null, passage = null, running = false, callbacks = {}, pendingConfirmation = null;
    let blindTranscript = false;
    let examWordIndices = [], examCharTimestamps = [], examWordPauses = [], examLastKeystrokeTime = null;
    let userProfile = null, lastResult = null, showingOriginal = false, examLastActiveIdx = null;
    const $ = id => document.getElementById(id);

    function normalizeString(str) {
        if (!str) return '';
        return str
            .replace(/[’‘`´]/g, "'")
            .replace(/[“”]/g, '"')
            .replace(/[–—]/g, '-');
    }

    function init(options = {}) {
        callbacks = options;
        userProfile = options.profile || {};

        // Restore saved settings from profile database
        if (userProfile.lastExamDuration) selectedDuration = Number(userProfile.lastExamDuration);
        if (userProfile.lastExamDifficulty) selectedDifficulty = userProfile.lastExamDifficulty;
        if (userProfile.lastExamBlind !== undefined) blindTranscript = userProfile.lastExamBlind;
        if (userProfile.lastExamName) selectedExam = userProfile.lastExamName;

        const profileName = options.profile && options.profile.username;
        const candidateNameEl = $('exam-candidate-name');
        if (candidateNameEl) {
            if (profileName && profileName !== 'You') {
                candidateNameEl.textContent = profileName.toUpperCase();
                candidateNameEl.classList.remove('placeholder-name');
            } else {
                candidateNameEl.textContent = 'Set Name';
                candidateNameEl.classList.add('placeholder-name');
            }
            if (!candidateNameEl.dataset.listenerBound) {
                candidateNameEl.addEventListener('click', () => {
                    if (candidateNameEl.textContent === 'Set Name') {
                        const settingsBtn = document.getElementById('settings-btn');
                        if (settingsBtn) settingsBtn.click();
                    }
                });
                candidateNameEl.dataset.listenerBound = 'true';
            }
        }

        // Bind and activate initial state buttons
        document.querySelectorAll('.exam-duration-btn').forEach(btn => {
            const isActive = Number(btn.dataset.duration) === selectedDuration;
            btn.classList.toggle('active', isActive);
            btn.addEventListener('click', () => selectDuration(btn));
        });
        document.querySelectorAll('.exam-difficulty-btn').forEach(btn => {
            const isActive = btn.dataset.difficulty === selectedDifficulty;
            btn.classList.toggle('active', isActive);
            btn.addEventListener('click', () => selectDifficulty(btn));
        });

        $('start-exam-btn').addEventListener('click', () => start());
        $('exam-cancel-btn').addEventListener('click', cancel);
        $('exam-submit-btn').addEventListener('click', () => finish(false));
        $('exam-result-close').addEventListener('click', closeResult);
        $('exam-result-publish').addEventListener('click', showAnalysis);
        $('exam-response').addEventListener('keydown', restrictBackspace);
        $('exam-response').addEventListener('input', updateWordCount);
        $('exam-response').addEventListener('paste', event => event.preventDefault());
        $('exam-confirm-stay').addEventListener('click', closeConfirmation);
        $('exam-confirm-proceed').addEventListener('click', confirmPendingAction);

        const closeInfoModal = () => {
            $('exam-info-modal').classList.remove('active');
        };
        $('exam-header-info-btn').addEventListener('click', () => {
            $('exam-info-modal').classList.add('active');
        });
        $('exam-info-modal-close').addEventListener('click', closeInfoModal);
        $('exam-info-modal-ok').addEventListener('click', closeInfoModal);
        $('exam-reset-btn').addEventListener('click', requestReset);
        
        // Custom exam selection dropdown
        const dropBtn = $('exam-dropdown-btn');
        const dropMenu = $('exam-dropdown-menu');
        const dropdownWrap = document.querySelector('.custom-exam-dropdown');
        if (dropBtn && dropMenu) {
            dropBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownWrap.classList.toggle('open');
                dropMenu.classList.toggle('show');
            });
            document.addEventListener('click', () => {
                dropdownWrap.classList.remove('open');
                dropMenu.classList.remove('show');
            });
            const items = dropMenu.querySelectorAll('.exam-dropdown-item');
            items.forEach(item => {
                const isActive = item.dataset.value === selectedExam;
                item.classList.toggle('active', isActive);
                item.addEventListener('click', () => {
                    items.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    selectExam(item.dataset.value);
                });
            });
        }

        const toggleEl = $('blind-transcript-toggle');
        if (toggleEl) {
            toggleEl.checked = blindTranscript;
            toggleEl.addEventListener('change', event => {
                blindTranscript = event.target.checked;
                if (running) updateWordCount();
                saveExamSettings();
            });
        }

        const infoBtn = $('blind-info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.showToast) {
                    window.showToast('Blind Transcript disables highlighting and auto-scrolling to simulate real SSC/Railway exam environments where you type from a static prompt.');
                }
            });
        }
        
        selectExam(selectedExam, true);
    }

    function selectDuration(button) {
        selectedDuration = Number(button.dataset.duration);
        document.querySelectorAll('.exam-duration-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        saveExamSettings();
    }

    function selectDifficulty(button) {
        selectedDifficulty = button.dataset.difficulty;
        document.querySelectorAll('.exam-difficulty-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        saveExamSettings();
    }

    function selectExam(value, isInit = false) {
        selectedExam = value;
        $('exam-hub-exam-name').textContent = selectedExam;
        $('exam-console-exam-name').textContent = selectedExam;
        $('exam-result-exam-name').textContent = selectedExam;

        const config = EXAMS_CONFIG[value] || EXAMS_CONFIG['JKSSB Junior Assistant'];
        
        // Update description
        const descEl = document.querySelector('.exam-hub-copy > p');
        if (descEl) descEl.textContent = config.desc;

        // Auto toggle blind transcript based on typical exam standard (only if not loading saved settings)
        if (!isInit) {
            const isBlindExam = value.startsWith('SSC') || value.startsWith('RRB');
            const toggleEl = $('blind-transcript-toggle');
            if (toggleEl) {
                toggleEl.checked = isBlindExam;
                blindTranscript = isBlindExam;
            }
        }

        // Update pills
        const pillsEl = document.querySelector('.exam-standard-pills');
        if (pillsEl) {
            pillsEl.innerHTML = `
                <span><strong>${config.wpm}</strong> Net WPM</span>
                <span><strong>${config.accuracy}%</strong> Accuracy</span>
                <span><strong>${config.maxMarks ? config.maxMarks : 'Qualifying'}</strong> ${config.maxMarks ? 'Maximum marks' : 'Status'}</span>
            `;
        }
        
        saveExamSettings();
    }

    function saveExamSettings() {
        if (!userProfile) return;
        userProfile.lastExamDuration = selectedDuration;
        userProfile.lastExamDifficulty = selectedDifficulty;
        userProfile.lastExamBlind = blindTranscript;
        userProfile.lastExamName = selectedExam;

        if (window.StorageDB && window.StorageDB.saveUserProfile) {
            window.StorageDB.saveUserProfile(userProfile).catch(err => {
                console.error("Failed to save exam settings to profile database:", err);
            });
        }
    }

    function shuffleSentences(text) {
        if (text.includes('.') || text.includes('?') || text.includes('!')) {
            // Split into sentences, keeping punctuation
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            for (let i = sentences.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sentences[i], sentences[j]] = [sentences[j], sentences[i]];
            }
            return sentences.map(s => s.trim()).join(' ');
        } else {
            // Split easy passages (no punctuation) by common clause breaks
            const clauses = text.split(/(?=\b(?:when|after|before|because|and|starting|people|sharing|with|planting|watching|regular|steady|watering)\b)/i);
            for (let i = clauses.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [clauses[i], clauses[j]] = [clauses[j], clauses[i]];
            }
            return clauses.map(c => c.trim()).filter(Boolean).join(' ');
        }
    }

    function start(customPassage = null) {
        if (customPassage && !(customPassage instanceof Event)) {
            passage = { title: customPassage.title, text: customPassage.text };
        } else {
            const passages = PASSAGE_LIBRARY[selectedDifficulty];
            if (!passages || !passages.length) return;
            const seed = Math.floor(Math.random() * passages.length);
            const targetCharacters = Math.ceil((selectedDuration / 60) * 135 * 5) + 1000;
            let sourceText = '', offset = 0;
            while (sourceText.length < targetCharacters) {
                const rawText = passages[(seed + offset) % passages.length].text;
                const shuffledText = shuffleSentences(rawText);
                sourceText += (sourceText ? '\n\n' : '') + shuffledText;
                offset++;
            }
            passage = { title: passages[seed].title, text: sourceText };
        }
        remaining = selectedDuration; elapsed = 0; running = true;
        const analysisContainer = $('exam-analysis-container');
        const card = $('exam-result-card');
        const details = $('exam-scorecard-details');
        const publishBtn = $('exam-result-publish');
        if (analysisContainer) {
            analysisContainer.classList.add('hidden');
            analysisContainer.innerHTML = '';
        }
        if (card) card.classList.remove('wide');
        if (details) details.classList.remove('hidden');
        if (publishBtn) publishBtn.textContent = 'Publish';
        
        if (customPassage) {
            $('exam-passage-title').textContent = `${selectedExam} · Custom · ${passage.title}`;
        } else {
            $('exam-passage-title').textContent = `${selectedExam} · ${selectedDifficulty} · ${passage.title}`;
        }
        
        // Tokenize and build HTML with spans
        const words = passage.text.split(/(\s+)/);
        let wordHtml = '';
        let wordCounter = 0;
        words.forEach(token => {
            if (/\s+/.test(token)) {
                if (token.includes('\n')) {
                    wordHtml += `<span class="exam-enter-indicator">↵ Enter</span>` + token;
                } else {
                    wordHtml += token;
                }
            } else {
                wordHtml += `<span class="exam-word" id="word-${wordCounter}">${token}</span>`;
                wordCounter++;
            }
        });
        $('exam-source-passage').innerHTML = wordHtml;

        // Build character index to word index mapping
        examWordIndices = [];
        let currentWordIdx = 0;
        const textToType = passage.text;
        for (let i = 0; i < textToType.length; i++) {
            if (textToType[i] === ' ' || textToType[i] === '\n' || textToType[i] === '\t') {
                examWordIndices[i] = -1;
                if (i > 0 && textToType[i-1] !== ' ' && textToType[i-1] !== '\n' && textToType[i-1] !== '\t') {
                    currentWordIdx++;
                }
            } else {
                examWordIndices[i] = currentWordIdx;
            }
        }
        examCharTimestamps = [];
        examWordPauses = [];
        examLastKeystrokeTime = null;

        examLastActiveIdx = null;
        $('exam-response').value = '';
        $('exam-result-overlay').classList.add('hidden');
        $('exam-console').classList.remove('hidden');
        $('exam-console').setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        updateTimer(); updateWordCount();
        $('exam-response').focus();
        clearInterval(intervalId);
        intervalId = setInterval(() => { elapsed++; remaining--; updateTimer(); if (remaining <= 0) finish(true); }, 1000);
    }

    function restrictBackspace(event) {
        if (event.key !== 'Backspace') return;
        
        const isRestrictedMode = (selectedExam === 'JKSSB Junior Assistant' || selectedExam === 'High Court Typist');
        const field = event.currentTarget;
        const cursor = field.selectionStart;
        // Custom Cmd/Ctrl/Option + Backspace word deletion
        if (event.ctrlKey || event.metaKey || event.altKey) {
            event.preventDefault();
            if (field.selectionStart !== field.selectionEnd) {
                // Delete selected text
                const start = field.selectionStart;
                const end = field.selectionEnd;
                field.value = field.value.slice(0, start) + field.value.slice(end);
                field.selectionStart = field.selectionEnd = start;
                field.dispatchEvent(new Event('input'));
                return;
            }
            const prefix = field.value.slice(0, cursor);
            let deleteStart = 0;
            if (isRestrictedMode) {
                const lastWhitespace = Math.max(prefix.lastIndexOf(' '), prefix.lastIndexOf('\n'), prefix.lastIndexOf('\t'));
                deleteStart = lastWhitespace + 1;
            } else {
                let i = cursor - 1;
                // Skip trailing whitespace
                while (i >= 0 && /\s/.test(prefix[i])) {
                    i--;
                }
                // Skip word characters
                while (i >= 0 && !/\s/.test(prefix[i])) {
                    i--;
                }
                deleteStart = i + 1;
            }
            if (cursor > deleteStart) {
                field.value = field.value.slice(0, deleteStart) + field.value.slice(cursor);
                field.selectionStart = field.selectionEnd = deleteStart;
                field.dispatchEvent(new Event('input'));
            }
            return;
        }
        // If the exam is NOT JKSSB or High Court Typist (meaning it is SSC/RRB), allow full backspace
        if (!isRestrictedMode) {
            return;
        }
        if (field.selectionStart !== field.selectionEnd) { event.preventDefault(); return; }
        const prefix = field.value.slice(0, cursor);
        const lastWhitespace = Math.max(prefix.lastIndexOf(' '), prefix.lastIndexOf('\n'), prefix.lastIndexOf('\t'));
        const currentWordStart = lastWhitespace + 1;
        if (cursor <= currentWordStart) event.preventDefault();
    }

    function updateWordCount() {
        const responseText = $('exam-response').value;
        
        const typedIndex = responseText.length - 1;
        if (typedIndex >= 0) {
            const now = Date.now();
            examCharTimestamps[typedIndex] = now;
            
            const prefix = responseText.slice(0, typedIndex + 1);
            const typedWordIdx = prefix.trim().split(/\s+/).filter(Boolean).length - 1;
            const isFirstCharOfWord = /\S$/.test(prefix) && (prefix.length === 1 || /\s\S$/.test(prefix));
            
            if (typedWordIdx > 0 && isFirstCharOfWord) {
                let prevLastCharIdx = -1;
                let spaceSearchIdx = typedIndex - 1;
                while (spaceSearchIdx >= 0 && /\s/.test(responseText[spaceSearchIdx])) {
                    spaceSearchIdx--;
                }
                if (spaceSearchIdx >= 0 && !/\s/.test(responseText[spaceSearchIdx])) {
                    prevLastCharIdx = spaceSearchIdx;
                }
                
                if (prevLastCharIdx !== -1 && examCharTimestamps[prevLastCharIdx]) {
                    const pause = now - examCharTimestamps[prevLastCharIdx];
                    examWordPauses[typedWordIdx] = pause;
                }
            }
        }

        const words = responseText.trim().split(/\s+/).filter(Boolean).length;
        $('exam-word-count').textContent = `${words} word${words === 1 ? '' : 's'}`;

        const allSpans = $('exam-source-passage').querySelectorAll('.exam-word');
        if (blindTranscript) {
            allSpans.forEach(span => span.classList.remove('active'));
            return;
        }

        // Highlight active word in the source passage
        const typedWords = responseText.split(/\s+/);
        const activeIdx = responseText.endsWith(' ') || responseText.endsWith('\n') ? typedWords.filter(Boolean).length : Math.max(0, typedWords.filter(Boolean).length - 1);

        allSpans.forEach((span, idx) => {
            if (idx === activeIdx) {
                span.classList.add('active');
                if (activeIdx !== examLastActiveIdx) {
                    examLastActiveIdx = activeIdx;
                    span.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                span.classList.remove('active');
            }
        });
    }

    function updateTimer() {
        $('exam-timer').textContent = formatTime(remaining);
        $('exam-timer').parentElement.classList.toggle('urgent', remaining <= 60);
    }

    function tokenize(value) {
        return value.trim().match(/\S+/g) || [];
    }

    function wordParts(token) {
        if (!token) return { lexical: '', canonical: '', punctuation: '' };
        const normalized = normalizeString(token);
        const lexical = normalized.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
        const punctuation = normalized.slice(0, normalized.indexOf(lexical) < 0 ? 0 : normalized.indexOf(lexical)) + normalized.slice(normalized.indexOf(lexical) + lexical.length);
        return { lexical, canonical: lexical.toLocaleLowerCase('en-IN'), punctuation };
    }

    // Align whole words so one omission/addition cannot shift and invalidate the rest
    // of the passage. This mirrors the full/half-mistake method used in government tests.
    // Align typed words against the source passage using a lookahead scanning strategy.
    // This replicates how actual evaluation software scans for omissions and insertions.
    function alignWords(sourceTokens, typedTokens) {
        // If highlights are enabled (non-blind mode), the candidate is guided word-for-word in lockstep.
        // Therefore, we align strictly index-to-index to prevent lookahead greedy sync errors.
        // We only evaluate up to the typed words (untyped trailing words are ignored, not treated as errors).
        if (!blindTranscript) {
            const pairs = [];
            const len = Math.min(sourceTokens.length, typedTokens.length);
            for (let i = 0; i < len; i++) {
                const sToken = sourceTokens[i];
                const tToken = typedTokens[i];
                const sParts = wordParts(sToken);
                const tParts = wordParts(tToken);
                if (sParts.canonical === tParts.canonical) {
                    pairs.push({ action: 'match', source: sToken, typed: tToken });
                } else {
                    pairs.push({ action: 'wrong', source: sToken, typed: tToken });
                }
            }
            for (let i = len; i < typedTokens.length; i++) {
                pairs.push({ action: 'add', source: '', typed: typedTokens[i] });
            }
            return pairs;
        }

        // If in Blind Transcript mode, the candidate can skip or add words freely.
        // We use a dynamic programming Levenshtein-based alignment to find insertions and omissions robustly.
        // To prevent penalizing untyped text at the end of long articles, we limit the DP matching boundary.
        // We use scaled integer costs (Match=0, Substitution=3, Insertion/Deletion=2) to avoid floating point precision hazards.
        const N = typedTokens.length;
        const M = Math.min(sourceTokens.length, N + 30);
        const dp = Array.from({ length: M + 1 }, () => new Int32Array(N + 1));
        
        for (let i = 0; i <= M; i++) dp[i][0] = i * 2;
        for (let j = 0; j <= N; j++) dp[0][j] = j * 2;
        
        for (let i = 1; i <= M; i++) {
            const sLower = wordParts(sourceTokens[i - 1]).canonical;
            for (let j = 1; j <= N; j++) {
                const tLower = wordParts(typedTokens[j - 1]).canonical;
                const cost = sLower === tLower ? 0 : 3; // Cost of 3 (scaled) prefers a substitution over insertion + deletion (cost 4)
                
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1] + cost, // subst/match
                    dp[i - 1][j] + 2,       // omit (deletion)
                    dp[i][j - 1] + 2        // add (insertion)
                );
            }
        }
        
        // Find the best ending index in the source text that minimizes edit distance for the typed tokens
        let bestI = N;
        let minVal = Infinity;
        for (let i = Math.max(0, N - 30); i <= M; i++) {
            if (dp[i][N] < minVal) {
                minVal = dp[i][N];
                bestI = i;
            }
        }

        const pairs = [];
        let i = bestI, j = N;
        while (i > 0 || j > 0) {
            const lastI = i;
            const lastJ = j;
            
            if (i > 0 && j > 0) {
                const sToken = sourceTokens[i - 1];
                const tToken = typedTokens[j - 1];
                const sLower = wordParts(sToken).canonical;
                const tLower = wordParts(tToken).canonical;
                const cost = sLower === tLower ? 0 : 3;
                
                if (dp[i][j] === dp[i - 1][j - 1] + cost) {
                    if (cost === 0) {
                        pairs.push({ action: 'match', source: sToken, typed: tToken });
                    } else {
                        pairs.push({ action: 'wrong', source: sToken, typed: tToken });
                    }
                    i--; j--;
                    continue;
                }
            }
            if (i > 0 && dp[i][j] === dp[i - 1][j] + 2) {
                pairs.push({ action: 'omit', source: sourceTokens[i - 1], typed: '' });
                i--;
                continue;
            }
            if (j > 0 && dp[i][j] === dp[i][j - 1] + 2) {
                pairs.push({ action: 'add', source: '', typed: typedTokens[j - 1] });
                j--;
                continue;
            }
            
            // Safety fallback: if floating point rounding or matching logic gets stuck, force decrement to prevent hanging
            if (i === lastI && j === lastJ) {
                if (i > 0 && j > 0) {
                    pairs.push({ action: 'wrong', source: sourceTokens[i - 1], typed: typedTokens[j - 1] });
                    i--; j--;
                } else if (i > 0) {
                    pairs.push({ action: 'omit', source: sourceTokens[i - 1], typed: '' });
                    i--;
                } else {
                    pairs.push({ action: 'add', source: '', typed: typedTokens[j - 1] });
                    j--;
                }
            }
        }
        return pairs.reverse();
    }

    function evaluateText(text, reference, seconds) {
        const duration = Math.max(1, seconds);
        const minutes = duration / 60;
        const sourceTokens = tokenize(reference), typedTokens = tokenize(text);
        const alignment = alignWords(sourceTokens, typedTokens);
        
        let fullMistakes = 0, halfMistakes = 0;
        const wrongExamWords = [];
        alignment.forEach(pair => {
            if (pair.action === 'spacing-merge' || pair.action === 'spacing-split') { halfMistakes += 1; return; }
            if (pair.action !== 'match') {
                fullMistakes += 1;
                if (pair.source) wrongExamWords.push(pair.source);
                return;
            }
            const expected = wordParts(pair.source), actual = wordParts(pair.typed);
            let hasHalf = false;
            if (expected.lexical !== actual.lexical) { halfMistakes += 1; hasHalf = true; } // wrong capitalisation
            if (expected.punctuation !== actual.punctuation) { halfMistakes += 1; hasHalf = true; } // omitted/added/wrong punctuation
            if (hasHalf) {
                wrongExamWords.push(pair.source);
            }
        });
        // Government guidelines treat missing/extra separation as a half mistake.
        const repeatedSpaces = [...text.matchAll(/ {2,}/g)];
        repeatedSpaces.forEach(match => {
            const previous = text[match.index - 1];
            if (!(previous === '.' && match[0].length === 2)) halfMistakes += 1;
        });

        const isHighCourt = selectedExam === 'High Court Typist';
        const grossWpm = (text.length / 5) / minutes;
        const errorUnits = fullMistakes + (halfMistakes * 0.5);
        let netWpm = 0;
        let accuracy = 0;

        if (isHighCourt) {
            netWpm = Math.max(0, grossWpm - (0.2 * errorUnits / minutes)); // 80% reduced speed penalty
            const penalizedNet = Math.max(0, grossWpm - (errorUnits / minutes));
            accuracy = grossWpm > 0 ? (penalizedNet / grossWpm) * 100 : 0;
        } else {
            netWpm = Math.max(0, grossWpm - (errorUnits / minutes));
            accuracy = grossWpm > 0 ? Math.max(0, (netWpm / grossWpm) * 100) : 0;
        }
        const config = EXAMS_CONFIG[selectedExam] || EXAMS_CONFIG['JKSSB Junior Assistant'];
        const qualified = netWpm >= config.wpm && accuracy >= config.accuracy;
        const marks = config.maxMarks > 0 ? (qualified ? Math.min(config.maxMarks, netWpm * (config.maxMarks / 95)) : 0) : 0;
        return {
            duration, grossWpm: Number(grossWpm.toFixed(2)), wpm: Number(netWpm.toFixed(2)),
            accuracy: Number(accuracy.toFixed(2)), fullMistakes, halfMistakes,
            errorUnits: Number(errorUnits.toFixed(2)), marks: Number(marks.toFixed(2)),
            status: qualified ? 'QUALIFIED' : 'DISQUALIFIED',
            alignment,
            wrongExamWords
        };
    }

    function calculate(text) {
        return { ...evaluateText(text, passage.text, elapsed), passageTitle: passage.title, examName: selectedExam, difficulty: selectedDifficulty };
    }

    async function finish(autoSubmitted) {
        if (!running) return;
        running = false; clearInterval(intervalId);
        const result = calculate($('exam-response').value);
        lastResult = result;
        const config = EXAMS_CONFIG[result.examName] || EXAMS_CONFIG['JKSSB Junior Assistant'];
        try { 
            await StorageDB.saveExamAttempt(result); 
            if (result.wrongExamWords && result.wrongExamWords.length > 0 && StorageDB.addMistakeWords) {
                await StorageDB.addMistakeWords(result.wrongExamWords);
            }
        } catch (error) { 
            console.error('Could not save exam result or mistakes:', error); 
        }
        $('exam-result-status').textContent = result.status;
        if (config.maxMarks > 0) {
            $('exam-result-marks').textContent = result.marks.toFixed(2);
            $('exam-result-marks-max').textContent = `/ ${config.maxMarks}`;
            $('exam-result-marks').parentElement.style.display = 'block';
        } else {
            $('exam-result-marks').parentElement.style.display = 'none';
        }
        $('exam-result-wpm').textContent = `${result.wpm.toFixed(2)} WPM`;
        $('exam-result-accuracy').textContent = `${result.accuracy.toFixed(2)}%`;
        $('exam-result-duration').textContent = formatTime(result.duration);
        
        // Calculate and set rhythm stats
        const pauses = (examWordPauses || []).filter(v => typeof v === 'number');
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
        $('exam-result-avg-pause').textContent = averagePause > 0 ? `${averagePause} ms` : '-';
        $('exam-result-max-pause').textContent = longestPause > 0 ? `${longestPause} sec` : '-';
        $('exam-result-flow').textContent = averagePause > 0 ? `${(flow / 10).toFixed(1)}/10` : '-';

        $('exam-result-errors').textContent = `Gross speed: ${result.grossWpm.toFixed(2)} WPM · Full mistakes: ${result.fullMistakes} · Half mistakes: ${result.halfMistakes}`;
        $('exam-result-message').textContent = autoSubmitted ? 'Time expired and your response was submitted automatically.' : (result.status === 'QUALIFIED' ? 'You met the minimum speed and accuracy requirements.' : `Qualification requires at least ${config.wpm} WPM and ${config.accuracy}% accuracy.`);
        $('exam-result-overlay').querySelector('.exam-result-card').classList.toggle('is-fail', result.status !== 'QUALIFIED');
        $('exam-result-overlay').classList.remove('hidden');
        
        // Play success or failure sound
        if (window.SoundEngine) {
            if (result.status === 'QUALIFIED') {
                if (window.SoundEngine.playVictoryChime) window.SoundEngine.playVictoryChime();
            } else {
                if (window.SoundEngine.playDefeatChime) window.SoundEngine.playDefeatChime();
            }
        }

        if (callbacks.onHistoryChanged) callbacks.onHistoryChanged();
    }

    function showConfirmation(type, title, message, proceedLabel) {
        pendingConfirmation = type;
        $('exam-confirm-title').textContent = title;
        $('exam-confirm-message').textContent = message;
        $('exam-confirm-proceed').textContent = proceedLabel;
        $('exam-confirm-overlay').classList.remove('hidden');
    }
    function closeConfirmation() {
        pendingConfirmation = null;
        $('exam-confirm-overlay').classList.add('hidden');
        if (running) $('exam-response').focus();
    }
    function confirmPendingAction() {
        const action = pendingConfirmation;
        closeConfirmation();
        if (action === 'cancel') {
            running = false; clearInterval(intervalId); closeConsole();
        } else if (action === 'reset') {
            start(passage);
        }
    }
    function requestReset() {
        if (!running) return;
        showConfirmation('reset', 'Restart this test?', 'Everything typed so far will be cleared and the timer will restart from the beginning.', 'Restart');
    }
    function cancel() {
        if (!running) { closeConsole(); return; }
        showConfirmation('cancel', 'Cancel this test?', 'Your current response will be discarded and this attempt will not be saved.', 'Cancel test');
    }
    function closeResult() {
        $('exam-result-overlay').classList.add('hidden');
        const container = $('exam-analysis-container');
        const card = $('exam-result-card');
        const details = $('exam-scorecard-details');
        const publishBtn = $('exam-result-publish');
        if (container) {
            container.classList.add('hidden');
            container.innerHTML = '';
        }
        if (card) card.classList.remove('wide');
        if (details) details.classList.remove('hidden');
        if (publishBtn) publishBtn.textContent = 'Publish';
        closeConsole();
    }
    function showAnalysis() {
        const container = $('exam-analysis-container');
        const card = $('exam-result-card');
        const details = $('exam-scorecard-details');
        const publishBtn = $('exam-result-publish');
        if (!container || !card || !details || !publishBtn || !lastResult || !lastResult.alignment) return;

        const isShowingAnalysis = !container.classList.contains('hidden');
        if (isShowingAnalysis) {
            container.classList.add('hidden');
            details.classList.remove('hidden');
            card.classList.remove('wide');
            publishBtn.textContent = 'Publish';
            showingOriginal = false;
            return;
        }

        details.classList.add('hidden');
        card.classList.add('wide');
        container.classList.remove('hidden');
        publishBtn.textContent = 'Scorecard';
        showingOriginal = false;

        updateAnalysisUI();
    }

    function renderAnalysisHtml(showOriginal) {
        let html = '';
        lastResult.alignment.forEach(pair => {
            if (showOriginal) {
                if (pair.action === 'match') {
                    const expected = wordParts(pair.source), actual = wordParts(pair.typed);
                    const hasHalf = expected.lexical !== actual.lexical || expected.punctuation !== actual.punctuation;
                    if (hasHalf) {
                        html += `<span class="analysis-word-half" title="Typed: '${pair.typed}'">${pair.source}<sub style="font-size: 0.58rem; vertical-align: sub; opacity: 0.75; margin-left: 2px;">(half)</sub></span> `;
                    } else {
                        html += `<span class="analysis-word-correct">${pair.source}</span> `;
                    }
                } else if (pair.action === 'wrong') {
                    html += `<span class="analysis-word-wrong" title="Typed: '${pair.typed}'">${pair.source}<sub style="font-size: 0.58rem; vertical-align: sub; opacity: 0.75; margin-left: 2px;">(wrong)</sub></span> `;
                } else if (pair.action === 'omit') {
                    html += `<span class="analysis-word-omit" title="Omitted word">${pair.source}<sub style="font-size: 0.58rem; vertical-align: sub; opacity: 0.75; margin-left: 2px;">(missing)</sub></span> `;
                }
            } else {
                if (pair.action === 'match') {
                    const expected = wordParts(pair.source), actual = wordParts(pair.typed);
                    const hasHalf = expected.lexical !== actual.lexical || expected.punctuation !== actual.punctuation;
                    if (hasHalf) {
                        html += `<span class="analysis-word-half" title="Expected: '${pair.source}'">${pair.typed}<sub style="font-size: 0.58rem; vertical-align: sub; opacity: 0.75; margin-left: 2px;">(half)</sub></span> `;
                    } else {
                        html += `<span class="analysis-word-correct">${pair.typed}</span> `;
                    }
                } else if (pair.action === 'wrong') {
                    html += `<span class="analysis-word-wrong" title="Expected: '${pair.source}'">${pair.typed || '(space)'}<sub style="font-size: 0.58rem; vertical-align: sub; opacity: 0.75; margin-left: 2px;">(wrong)</sub></span> `;
                } else if (pair.action === 'omit') {
                    html += `<span class="analysis-word-omit" title="Missing word">${pair.source}<sub style="font-size: 0.58rem; vertical-align: sub; opacity: 0.75; margin-left: 2px;">(missing)</sub></span> `;
                } else if (pair.action === 'add') {
                    html += `<span class="analysis-word-add" title="Extra word">${pair.typed}<sub style="font-size: 0.58rem; vertical-align: sub; opacity: 0.75; margin-left: 2px;">(extra)</sub></span> `;
                }
            }
        });
        return html;
    }

    function updateAnalysisUI() {
        const container = $('exam-analysis-container');
        if (!container || !lastResult) return;

        let html = `
            <div class="flex justify-between items-center mb-2" style="border-bottom: 1px dashed var(--border-color); padding-bottom: 8px; width: 100%;">
                <div style="text-align: left;">
                    <div class="font-bold text-xs uppercase tracking-wider" style="color: var(--accent-secondary);">
                        Error Analysis Report (${showingOriginal ? 'Original Text' : 'Candidate Response'})
                    </div>
                    <div class="text-[0.74rem] leading-relaxed mt-1" style="color: var(--text-secondary);">
                        Legend: <span class="analysis-word-wrong" style="text-decoration: none;">Wrong</span> · <span class="analysis-word-half" style="text-decoration: none;">Half Mistake</span> · <span class="analysis-word-omit" style="text-decoration: none;">Omitted</span> · <span class="analysis-word-add" style="text-decoration: none;">Extra</span>
                    </div>
                </div>
                <button id="exam-analysis-toggle-view" class="exam-action secondary" style="padding: 6px 12px; font-size: 0.72rem; display: flex; align-items: center; gap: 6px; border-radius: 6px;" type="button">
                    <i class="${showingOriginal ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}"></i>
                    <span>${showingOriginal ? 'Show Typed' : 'Show Original'}</span>
                </button>
            </div>
            <div id="exam-analysis-text-block" style="flex: 1; overflow-y: auto; text-align: left; font-size: 1.05rem; line-height: 2.1; font-family: 'Roboto Mono', monospace; padding: 0.5rem; color: var(--text-secondary);">
                ${renderAnalysisHtml(showingOriginal)}
            </div>
        `;
        
        container.innerHTML = html;
        container.scrollTop = 0;
        
        $('exam-analysis-toggle-view').addEventListener('click', () => {
            showingOriginal = !showingOriginal;
            updateAnalysisUI();
        });
    }
    function closeConsole() { closeConfirmation(); $('exam-console').classList.add('hidden'); $('exam-console').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
    function formatTime(seconds) { const safe = Math.max(0, seconds); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`; }

    async function renderHistory() {
        const container = $('exam-cards-container');
        if (!container) return;
        const attempts = await StorageDB.getExamAttempts();
        if (!attempts.length) { container.innerHTML = '<div class="exam-empty-state"><span>⌨</span><strong>No exam attempts yet</strong><p>Your first official-style score card will appear here.</p></div>'; return; }
        container.innerHTML = attempts.map(item => {
            const pass = item.status === 'QUALIFIED';
            const marks = Number(item.marks) || 0;
            const config = EXAMS_CONFIG[item.examName] || EXAMS_CONFIG['JKSSB Junior Assistant'];
            const maxMarks = config ? config.maxMarks : 20;
            const hasMarks = maxMarks > 0;
            
            let tier = 'grey';
            let tierLabel = 'Developing';
            if (!pass) {
                tier = 'fail';
                tierLabel = 'Disqualified';
            } else if (hasMarks) {
                if (marks >= 17) {
                    tier = 'green';
                    tierLabel = 'Elite (17-20)';
                } else if (marks >= 15) {
                    tier = 'pink';
                    tierLabel = 'Superior (15-17)';
                } else if (marks >= 13) {
                    tier = 'blue';
                    tierLabel = 'Good (13-15)';
                } else if (marks >= 11) {
                    tier = 'violet';
                    tierLabel = 'Average (11-13)';
                } else if (marks >= 8) {
                    tier = 'orange';
                    tierLabel = 'Improving (8-11)';
                } else {
                    tier = 'grey';
                    tierLabel = 'Qualified (5-8)';
                }
            } else {
                tier = 'green';
                tierLabel = 'Qualified';
            }
            
            const date = new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
            const scoreHtml = hasMarks ? `${marks.toFixed(2)}<i>/${maxMarks}</i>` : `Qualifying`;
            return `<article class="exam-history-card tier-${tier}"><div class="exam-card-accent"></div><header><div class="exam-card-icon">${pass ? '✓' : '!'}</div><div><span class="exam-card-date">${escapeHTML(date)} · ${escapeHTML(item.difficulty || 'medium')}</span><h4>${escapeHTML(item.examName || 'JKSSB Junior Assistant')}</h4><em>${escapeHTML(item.passageTitle || 'Mock Typing Test')}</em></div><span class="exam-card-status">${pass ? 'Qualified' : 'Disqualified'}</span></header><div class="exam-card-score"><div><small>Score</small><strong>${scoreHtml}</strong></div><span>${tierLabel}</span></div><div class="exam-card-metrics"><div><small>Net speed</small><strong>${Number(item.wpm).toFixed(1)} <i>WPM</i></strong></div><div><small>Accuracy</small><strong>${Number(item.accuracy).toFixed(1)}<i>%</i></strong></div><div><small>Mistakes</small><strong>${item.fullMistakes != null ? `${item.fullMistakes}<i>F</i> ${item.halfMistakes}<i>H</i>` : '—'}</strong></div></div></article>`;
        }).join('');
    }
    function escapeHTML(value) { const node = document.createElement('span'); node.textContent = String(value); return node.innerHTML; }
    function updateProfile(profile) {
        userProfile = profile;
        const profileName = profile && profile.username;
        const candidateNameEl = $('exam-candidate-name');
        if (candidateNameEl) {
            if (profileName && profileName !== 'You') {
                candidateNameEl.textContent = profileName.toUpperCase();
                candidateNameEl.classList.remove('placeholder-name');
            } else {
                candidateNameEl.textContent = 'Set Name';
                candidateNameEl.classList.add('placeholder-name');
            }
        }
    }
    window.ExamEngine = { init, renderHistory, calculate, evaluateText, updateProfile, start };
})();
