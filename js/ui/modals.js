function showModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.add('active');
    }
}

function hideModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.remove('active');
    }
}

function setupModalCloseListeners() {
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
        el.addEventListener('click', (e) => {
            SoundEngine.playTapSound();
            const modal = e.target.closest('.modal-container');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// 1. Settings Modal UI
function renderSettingsModal(profile, onSaveCallback) {
    const usernameInput = document.getElementById('username-input');
    const aiSpeedSlider = document.getElementById('ai-speed-slider');
    const aiSpeedVal = document.getElementById('ai-speed-value');
    const iconSelector = document.getElementById('player-icon-selector');
    const soundSelector = document.getElementById('sound-selector');
    const themeSelector = document.getElementById('theme-selector');

    if (usernameInput) usernameInput.value = profile.username;
    if (aiSpeedSlider) {
        aiSpeedSlider.value = profile.aiWpm;
        aiSpeedVal.textContent = profile.aiWpm;
    }

    // Avatar pickers
    if (iconSelector) {
        iconSelector.innerHTML = PLAYER_ICONS.map(icon => {
            const svg = PLAYER_SVG_ICONS[icon] || '';
            return `
                <button class="setting-btn flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/5 transition ${icon === profile.playerIcon ? 'active' : ''}" data-icon="${icon}" title="${icon}">
                    <span class="w-6 h-6 flex items-center justify-center">${svg}</span>
                    <span class="text-[0.6rem] font-bold tracking-wider mt-0.5">${icon}</span>
                </button>
            `;
        }).join('');
    }

    // Sound picker clickers
    if (soundSelector) {
        soundSelector.innerHTML = SoundEngine.sounds.map(sound => {
            const svg = AUDIO_SVG_ICONS[sound.name] || '';
            return `
                <button class="setting-btn flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/5 transition ${sound.name === profile.soundTheme ? 'active' : ''}" data-sound="${sound.name}" title="${sound.name}">
                    <span class="w-5 h-5 flex items-center justify-center">${svg}</span>
                    <span class="text-[0.6rem] font-bold tracking-wider mt-0.5">${sound.name}</span>
                </button>
            `;
        }).join('');
    }

    // Theme pickers
    if (themeSelector) {
        const themes = [
            { id: 'theme-dark', name: 'Dark' },
            { id: 'theme-sepia', name: 'Sepia' },
            { id: 'theme-ocean', name: 'Ocean' }
        ];
        themeSelector.innerHTML = themes.map(t => `
            <button class="setting-btn text-xs py-2 px-3 rounded-md transition ${t.id === profile.colorTheme ? 'active' : ''}" data-theme="${t.id}">
                ${t.name}
            </button>
        `).join('');
    }

    // Modal listeners
    iconSelector.onclick = (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            SoundEngine.playTapSound();
            profile.playerIcon = btn.dataset.icon;
            onSaveCallback(profile);
            renderSettingsModal(profile, onSaveCallback);
        }
    };

    soundSelector.onclick = (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            profile.soundTheme = btn.dataset.sound;
            SoundEngine.playTypingSound(profile.soundTheme);
            onSaveCallback(profile);
            renderSettingsModal(profile, onSaveCallback);
        }
    };

    themeSelector.onclick = (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            SoundEngine.playTapSound();
            profile.colorTheme = btn.dataset.theme;
            
            // Swap body themes classes
            document.body.className = '';
            document.body.classList.add(profile.colorTheme);
            
            onSaveCallback(profile);
            renderSettingsModal(profile, onSaveCallback);
        }
    };

    aiSpeedSlider.oninput = (e) => {
        const val = parseInt(e.target.value);
        aiSpeedVal.textContent = val;
        profile.aiWpm = val;
    };
    aiSpeedSlider.onchange = () => onSaveCallback(profile);

    usernameInput.onchange = (e) => {
        profile.username = e.target.value.trim() || 'You';
        onSaveCallback(profile);
    };
}

// 2. Results Modal UI
function renderResultsModal(wpm, accuracy, won, previousBestWpm, xpEarned, baseWords, onRetry, onNext, onMenu) {
    const title = document.getElementById('results-title');
    const wpmVal = document.getElementById('results-wpm');
    const accVal = document.getElementById('results-accuracy');
    const xpVal = document.getElementById('results-xp');
    const suggestion = document.getElementById('results-suggestion');
    const buttons = document.getElementById('results-buttons');

    if (title) title.textContent = won ? 'Victory!' : 'So Close!';
    if (wpmVal) wpmVal.textContent = wpm;
    if (accVal) accVal.textContent = `${accuracy}%`;
    if (xpVal) xpVal.textContent = `+${xpEarned}`;

    // Calculate smart feedback metrics dynamically based on the performance-weighted XP formula
    const currentXp = xpEarned;
    const baseW = baseWords || 30;
    const perfectAccXp = Math.max(1, Math.round(baseW * (wpm / 60) * 1.0));
    const targetWpm = Math.round(wpm * 1.1);
    const speedUpXp = Math.max(1, Math.round(baseW * (targetWpm / 60) * 1.0));

    // Intelligent, conversational performance coaching tips (7 granular cases)
    if (suggestion) {
        if (accuracy < 80) {
            suggestion.innerHTML = `🎯 Your accuracy fell to <strong>${accuracy}%</strong>. Typos are heavily discounting your score. Let's ignore speed entirely for a moment and focus solely on hitting the correct keys. Slow down as much as you need to find a steady rhythm.`;
        } else if (accuracy >= 80 && accuracy < 90) {
            const loss = perfectAccXp - currentXp;
            suggestion.innerHTML = `🎯 Your accuracy was <strong>${accuracy}%</strong>. You're hitting a good pace, but key slips are costing you. If you can tidy up those typos and maintain perfect accuracy, your score would jump to <span class="text-[var(--accent-primary)] font-bold">${perfectAccXp} XP</span> (an extra <strong>+${loss} XP</strong>). Focus on finger placement!`;
        } else if (accuracy >= 90 && accuracy < 96) {
            const loss = perfectAccXp - currentXp;
            suggestion.innerHTML = `🎯 You are so close! Your accuracy was <strong>${accuracy}%</strong>. Eliminating those last few minor slip-ups at your current speed would have secured you <span class="text-[var(--accent-primary)] font-bold">${perfectAccXp} XP</span> (a clean <strong>+${loss} XP</strong> boost). Just a tiny bit more concentration will get you there.`;
        } else if (wpm < 30) {
            suggestion.innerHTML = `🐢 Flawless precision at <strong>${accuracy}%</strong> accuracy! Now it's time to build up your finger momentum. If you can push your speed just slightly to <strong>${targetWpm} WPM</strong> while staying accurate, you will unlock <span class="text-[var(--accent-primary)] font-bold">${speedUpXp} XP</span> next time. Try looking slightly ahead at the next word!`;
        } else if (wpm >= 30 && wpm < 60) {
            suggestion.innerHTML = `🐢 Your typing is beautiful and precise (<strong>${accuracy}%</strong>)! Now, let's work on acceleration. If you can elevate your speed to <strong>${targetWpm} WPM</strong> while maintaining this precision, you will earn <span class="text-[var(--accent-primary)] font-bold">${speedUpXp} XP</span>. Focus on keeping your hands relaxed.`;
        } else if (wpm >= 60 && wpm < 90) {
            const gain = speedUpXp - currentXp;
            suggestion.innerHTML = `⚡ Great job! You are flying at <strong>${wpm} WPM</strong> with <strong>${accuracy}%</strong> accuracy. If you push your boundaries to reach <strong>${targetWpm} WPM</strong> with clean keystrokes, you will claim <span class="text-[var(--accent-primary)] font-bold">${speedUpXp} XP</span> (a solid <strong>+${gain} XP</strong> increase). You've got this!`;
        } else {
            const gain = speedUpXp - currentXp;
            suggestion.innerHTML = `👑 Elite typing! You clocked a blazing <strong>${wpm} WPM</strong> at <strong>${accuracy}%</strong> accuracy. If you challenge yourself to hit <strong>${targetWpm} WPM</strong> on your next run with this master precision, your score will soar to <span class="text-[var(--accent-primary)] font-bold">${speedUpXp} XP</span> (a <strong>+${gain} XP</strong> gain). Truly outstanding!`;
        }
    }

    if (buttons) {
        buttons.innerHTML = `
            <button id="res-btn-retry" class="btn btn-secondary w-full sm:w-auto">Retry</button>
            <button id="res-btn-next" class="btn btn-primary w-full sm:w-auto">Next Level</button>
            <button id="res-btn-menu" class="btn btn-secondary w-full sm:w-auto">MainMenu</button>
        `;

        document.getElementById('res-btn-retry').onclick = () => {
            SoundEngine.playTapSound();
            hideModal('results-modal');
            onRetry();
        };
        document.getElementById('res-btn-next').onclick = () => {
            SoundEngine.playTapSound();
            hideModal('results-modal');
            onNext();
        };
        document.getElementById('res-btn-menu').onclick = () => {
            SoundEngine.playTapSound();
            hideModal('results-modal');
            onMenu();
        };
    }

    if (won && accuracy >= 95) {
        triggerConfetti('confetti-container');
    }

    showModal('results-modal');
}

// 3. Rank Modal UI
function renderRankModal(profile) {
    const modalRankName = document.getElementById('modal-rank-name');
    const modalTotalWords = document.getElementById('modal-total-words');
    const rankProgressBar = document.getElementById('rank-progress-bar');
    const progressText = document.getElementById('modal-progress-text');
    const currRankLabel = document.getElementById('modal-curr-rank-label');
    const nextRankLabel = document.getElementById('modal-next-rank-label');

    const words = profile.totalWordsTyped || 0;
    
    // Find current rank index
    let activeIdx = 0;
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (words >= RANKS[i].threshold) {
            activeIdx = i;
            break;
        }
    }
    const currentRank = RANKS[activeIdx];
    const nextRankObj = activeIdx < RANKS.length - 1 ? RANKS[activeIdx + 1] : null;

    if (modalRankName) {
        modalRankName.textContent = currentRank.name;
        // Apply color gradient dynamically
        modalRankName.style.backgroundImage = `linear-gradient(135deg, ${currentRank.colors.join(', ')})`;
        modalRankName.style.webkitBackgroundClip = 'text';
        modalRankName.style.webkitTextFillColor = 'transparent';
    }
    if (modalTotalWords) {
        modalTotalWords.textContent = `Total XP: ${Math.round(words).toLocaleString()}`;
    }
    if (currRankLabel) {
        currRankLabel.textContent = currentRank.name;
    }

    let progress = 100;
    let maxVal = currentRank.threshold;

    if (nextRankObj) {
        maxVal = nextRankObj.threshold;
        const thresholdDiff = nextRankObj.threshold - currentRank.threshold;
        const currentDiff = words - currentRank.threshold;
        progress = Math.min(100, Math.max(0, (currentDiff / thresholdDiff) * 100));

        if (nextRankLabel) nextRankLabel.textContent = nextRankObj.name;
    } else {
        if (nextRankLabel) nextRankLabel.textContent = "Max Rank reached!";
    }

    if (progressText) {
        progressText.textContent = `${Math.round(words).toLocaleString()} / ${maxVal.toLocaleString()}`;
    }

    if (rankProgressBar) {
        rankProgressBar.style.width = '0%';
        // Make gradient match rank coloring style
        rankProgressBar.style.background = `linear-gradient(135deg, ${currentRank.colors.join(', ')})`;
        setTimeout(() => {
            rankProgressBar.style.width = `${progress}%`;
        }, 150);
    }
}

// 4. Celebration Rank Up Modal
function triggerRankUpCelebration(oldRankName, newRankName, words, onContinue) {
    const message = document.getElementById('rank-up-witty-message');
    const newRankDisplay = document.getElementById('new-rank-display');
    const newRankText = document.getElementById('new-rank-name');
    const newRankFill = document.getElementById('new-rank-fill');
    const wordsTypedText = document.getElementById('rank-up-words-typed');
    const continueBtn = document.getElementById('rank-up-continue');

    const newIdx = RANKS.findIndex(r => r.name === newRankName);
    const oldIdx = RANKS.findIndex(r => r.name === oldRankName);
    const newRank = RANKS[newIdx];
    const oldRank = RANKS[oldIdx] || RANKS[0];

    const oldGradient = createDynamicGradient(oldRank.colors);
    const newGradient = createDynamicGradient(newRank.colors);

    if (message) {
        message.textContent = RANK_MESSAGES[newIdx] || "Amazing Progress!";
        message.style.backgroundImage = newGradient;
        message.style.webkitBackgroundClip = 'text';
        message.style.webkitTextFillColor = 'transparent';
    }

    if (wordsTypedText) {
        wordsTypedText.textContent = `You've accumulated a total of ${Math.round(words).toLocaleString()} XP!`;
    }

    if (newRankText) {
        newRankText.textContent = newRankName;
    }

    if (newRankDisplay) {
        newRankDisplay.style.background = oldGradient;
        newRankDisplay.className = '';
        newRankDisplay.classList.add(newRank.class);
    }

    if (newRankFill) {
        newRankFill.style.background = newGradient;
        newRankFill.style.transform = 'translateX(-100%)';
        // Anim fill sweep
        setTimeout(() => {
            newRankFill.style.transition = 'transform 1.8s cubic-bezier(0.25, 1, 0.5, 1)';
            newRankFill.style.transform = 'translateX(0)';
        }, 200);
    }

    if (continueBtn) {
        continueBtn.onclick = () => {
            SoundEngine.playTapSound();
            hideModal('rank-up-modal');
            onContinue();
        };
    }

    // Play fanfare
    SoundEngine.playRankUpSound();
    triggerConfetti('rank-confetti-container', 80);
    showModal('rank-up-modal');
}

function createDynamicGradient(colors) {
    if (!colors || colors.length === 0) return '#94a3b8';
    if (colors.length === 1) return colors[0];
    return `linear-gradient(135deg, ${colors.join(', ')})`;
}

// Confetti Particle Explosion helper
function triggerConfetti(containerId, count = 45) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'confetti';
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDelay = `${Math.random() * 1.5}s`;
        p.style.backgroundColor = `hsl(${Math.random() * 360}, 90%, 60%)`;
        container.appendChild(p);
    }
}

window.ModalsUI = {
    showModal,
    hideModal,
    setupModalCloseListeners,
    renderSettingsModal,
    renderResultsModal,
    renderRankModal,
    triggerRankUpCelebration
};
