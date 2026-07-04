function initGameScreenHandlers(onExitCallback) {
    const exitBtn = document.getElementById('game-exit-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            ModalsUI.showModal('abort-modal');
            
            document.getElementById('abort-confirm-ok').onclick = () => {
                ModalsUI.hideModal('abort-modal');
                onExitCallback();
            };
            
            document.getElementById('abort-confirm-cancel').onclick = () => {
                SoundEngine.playTapSound();
                ModalsUI.hideModal('abort-modal');
            };
        });
    }
}

function updateRaceTrackVisuals(playerProgress, competitorProgress) {
    const playerRacer = document.getElementById('player-0');
    const aiRacer = document.getElementById('player-1');

    if (playerRacer) {
        playerRacer.style.left = `calc(${Math.min(100, playerProgress)}% - 44px)`;
    }
    if (aiRacer) {
        aiRacer.style.left = `calc(${Math.min(100, competitorProgress)}% - 44px)`;
    }
}

function applyTypingStateColors(wpm, accuracy) {
    const wpmEl = document.getElementById('game-wpm');
    const accEl = document.getElementById('game-accuracy');

    if (wpmEl) {
        wpmEl.style.color = getWpmColor(wpm);
    }
    if (accEl) {
        accEl.style.color = getAccuracyColor(accuracy);
    }
}

function getWpmColor(wpm) {
    // Dynamic color matching the speed bracket (cold blue to hyper red)
    if (wpm < 30) return '#94a3b8'; // Slate
    if (wpm < 50) return '#10b981'; // Green
    if (wpm < 70) return '#3b82f6'; // Blue
    if (wpm < 90) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
}

function getAccuracyColor(accuracy) {
    if (accuracy < 85) return '#ef4444';
    if (accuracy < 95) return '#f59e0b';
    return '#10b981';
}

window.GameScreenUI = {
    initGameScreenHandlers,
    updateRaceTrackVisuals,
    applyTypingStateColors
};
