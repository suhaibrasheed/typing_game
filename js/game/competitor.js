(function() {
    const competitorState = {
        name: 'Snail',
        avatarHtml: '',
        wpm: 30,
        progress: 0,
        type: 'snail', // snail, rabbit, professor, android
        isTyping: true,
        rabbitPauseTimer: 0
    };

    const DOMElements = {
        raceTrack: () => document.getElementById('race-track')
    };

    // Beautiful Premium Vector Icons (using theme-sensitive var(--accent-secondary))
    const RACER_ICONS = {
        snail: `<svg class="w-8 h-8 text-[var(--accent-secondary)] drop-shadow-[0_0_8px_var(--accent-secondary)]" viewBox="0 0 24 24" fill="currentColor"><path d="M20 16a3 3 0 0 0-3-3H6.5C5.12 13 4 11.88 4 10.5S5.12 8 6.5 8H18V6H6.5C3.46 6 1 8.46 1 11.5S3.46 17 6.5 17H17a1 1 0 0 1 1 1s-.9 2-2 2H5v2h11c3.31 0 6-2.69 6-6zM15 9.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z"/></svg>`,
        rabbit: `<svg class="w-8 h-8 text-[var(--accent-secondary)] drop-shadow-[0_0_8px_var(--accent-secondary)]" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9c.55 0 1-.45 1-1V4c0-1.66-1.34-3-3-3s-3 1.34-3 3v4c0 .55.45 1 1 1h4Zm-8-2V4c0-1.66-1.34-3-3-3S5 2.34 5 4v3c0 .55.45 1 1 1h4c.55 0 1-.45 1-1Zm6.5 4h-11C4.01 11 2.02 13.15 2 15.68V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-3.32c-.02-2.53-2.01-4.68-4.5-4.68Z"/></svg>`,
        professor: `<svg class="w-8 h-8 text-[var(--accent-secondary)] drop-shadow-[0_0_8px_var(--accent-secondary)]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3Zm0 14.5c-2.48 0-4.5-2.02-4.5-4.5h9c0 2.48-2.02 4.5-4.5 4.5Z"/></svg>`,
        android: `<svg class="w-8 h-8 text-[var(--accent-secondary)] drop-shadow-[0_0_8px_var(--accent-secondary)]" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6c0-3.87 3.13-7 7-7s7 3.13 7 7Zm-5-8.82A4.015 4.015 0 0 0 12 3a4.015 4.015 0 0 0-2 1.18V3a1 1 0 0 0-2 0v2.6c0 1.2.4 2.3 1.1 3.2C9.5 9.3 10.7 10 12 10s2.5-.7 3.9-2.2c.7-.9 1.1-2 1.1-3.2V3a1 1 0 0 0-2 0v1.18Z"/></svg>`
    };

    // 12 unique AI Opponents with different speed tiers: 4 slower, 5 average, 2 faster, 1 always-winning demon
    const AI_OPPONENTS = [
        { name: "Totla Tiger 🐯", type: "snail", speedType: "slower", speedOffset: -18, icon: RACER_ICONS.snail, desc: "A stuttering tiger. Very slow pace." },
        { name: "Lazy Lakhan 😴", type: "snail", speedType: "slower", speedOffset: -12, icon: RACER_ICONS.snail, desc: "A very sleepy racer. Linear but slow progress." },
        { name: "Potato Pandey 🥔", type: "android", speedType: "slower", speedOffset: -8, icon: RACER_ICONS.android, desc: "A slow, mechanical typewriter droid." },
        { name: "Chubby Chauhan 🐼", type: "rabbit", speedType: "slower", speedOffset: -5, icon: RACER_ICONS.rabbit, desc: "A chubby bunny who takes frequent pauses." },
        { name: "Chai Chacha ☕", type: "rabbit", speedType: "average", speedOffset: -2, icon: RACER_ICONS.rabbit, desc: "Takes tea breaks but has decent bursts." },
        { name: "Munna Master 🎓", type: "professor", speedType: "average", speedOffset: 0, icon: RACER_ICONS.professor, desc: "Extremely consistent academic pace." },
        { name: "Jugaadu Javed 🔧", type: "professor", speedType: "average", speedOffset: 2, icon: RACER_ICONS.professor, desc: "Finds clever shortcuts to keep a steady rhythm." },
        { name: "Pakoda Pandit 🥟", type: "professor", speedType: "average", speedOffset: 5, icon: RACER_ICONS.professor, desc: "Rhythmic key clicks, motivated by snacks." },
        { name: "Nitin Gadbadi 🤪", type: "android", speedType: "average", speedOffset: 8, icon: RACER_ICONS.android, desc: "Highly chaotic pacing, but surprisingly fast." },
        { name: "Legend Lallu 👑", type: "android", speedType: "faster", speedOffset: 12, icon: RACER_ICONS.android, desc: "A high-performance typist machine." },
        { name: "Chatur Chintu ⚡", type: "rabbit", speedType: "faster", speedOffset: 18, icon: RACER_ICONS.rabbit, desc: "A smart sprint specialist." },
        { name: "Gappu Genius 😈", type: "android", speedType: "demon", speedOffset: 35, icon: RACER_ICONS.android, desc: "The ultimate typing wizard. Always wins, zipping across!" }
    ];

    function setupCompetitor(profileSettings, bestWpm = 0, textLength) {
        const raceTrack = DOMElements.raceTrack();
        
        if (bestWpm > 0) {
            raceTrack.innerHTML = `
                <div class="lane-splitter" style="top: 33.3%;"></div>
                <div class="lane-splitter" style="top: 66.6%;"></div>
                <div class="finish-line"></div>
            `;
        } else {
            raceTrack.innerHTML = `
                <div class="lane-splitter" style="top: 50%;"></div>
                <div class="finish-line"></div>
            `;
        }

        const avgWpm = profileSettings.averageWpm || 40;
        const settingsWpm = profileSettings.aiWpm || 40;
        // User's benchmark capability is the average of their historical average WPM and the WPM set in settings
        const userBenchmarkWpm = Math.round((avgWpm + settingsWpm) / 2);

        // Select randomly from all 12 unique opponents
        const opponent = AI_OPPONENTS[Math.floor(Math.random() * AI_OPPONENTS.length)];

        competitorState.name = opponent.name;
        competitorState.type = opponent.type;
        competitorState.speedType = opponent.speedType;
        competitorState.avatarHtml = opponent.icon;
        competitorState.wpm = Math.max(25, Math.min(180, userBenchmarkWpm + opponent.speedOffset));
        competitorState.finishTime = null;
        competitorState.progress = 0;
        competitorState.isTyping = true;
        competitorState.rabbitPauseTimer = 0;

        const playerSelectedIcon = profileSettings.playerIcon || 'Ship';
        let playerAvatarHtml = PLAYER_SVG_ICONS[playerSelectedIcon] || PLAYER_SVG_ICONS.Ship;
        playerAvatarHtml = playerAvatarHtml.replace('class="w-6 h-6"', 'class="w-8 h-8 text-[var(--accent-primary)] drop-shadow-[0_0_8px_var(--accent-primary)]"');

        // Setup lanes based on personal best presence
        let racers = [];
        if (bestWpm > 0) {
            let ghostAvatarHtml = `<svg class="w-8 h-8 text-[var(--accent-primary)] opacity-40 drop-shadow-[0_0_4px_var(--accent-primary)]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 0 0-5 5v3c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V7a5 5 0 0 0-5-5zM9 18v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2"/></svg>`;
            racers = [
                { id: 'player-0', name: profileSettings.username, avatar: playerAvatarHtml, top: '20%' },
                { id: 'player-ghost', name: `${profileSettings.username}'s Ghost (${bestWpm} WPM)`, avatar: ghostAvatarHtml, top: '50%' },
                { id: 'player-1', name: competitorState.name, avatar: competitorState.avatarHtml, top: '80%' }
            ];
            competitorState.hasGhost = true;
            competitorState.ghostWpm = bestWpm;
            competitorState.ghostProgress = 0;
        } else {
            racers = [
                { id: 'player-0', name: profileSettings.username, avatar: playerAvatarHtml, top: '25%' },
                { id: 'player-1', name: competitorState.name, avatar: competitorState.avatarHtml, top: '75%' }
            ];
            competitorState.hasGhost = false;
            competitorState.ghostWpm = 0;
            competitorState.ghostProgress = 0;
        }

        racers.forEach(r => {
            const el = document.createElement('div');
            el.id = r.id;
            el.className = `player-icon absolute flex items-center`;
            el.style.top = r.top;
            el.style.left = '10px';
            el.innerHTML = `
                <span class="avatar flex items-center justify-center">${r.avatar}</span>
                <span class="nametag font-bold text-[0.7rem] bg-secondary/80 border border-white/5 px-2 py-0.5 rounded shadow-sm text-secondary">${r.name}</span>
            `;
            raceTrack.appendChild(el);
        });
    }

    function updateCompetitor(startTime, textLength) {
        if (!startTime) return;
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const aiPlayer = document.getElementById('player-1');
        if (!aiPlayer) return;

        let progressPercent = 0;

        if (competitorState.type === 'rabbit') {
            if (competitorState.isTyping) {
                if (Math.random() < 0.1) {
                    competitorState.isTyping = false;
                    competitorState.rabbitPauseTimer = Date.now() + (500 + Math.random() * 1000);
                }
            } else {
                if (Date.now() > competitorState.rabbitPauseTimer) {
                    competitorState.isTyping = true;
                }
            }
        }

        if (competitorState.isTyping) {
            if (competitorState.speedType === 'demon') {
                // Demon racer zips across and always wins.
                // We track correct chars typed by user and ensure Demon's progress scales to reach 100% when user is at 80%.
                const correctSpans = document.querySelectorAll('#text-display span.correct').length;
                const userProgress = textLength > 0 ? (correctSpans / textLength) * 100 : 0;
                
                // Let progress speed be faster or based on user's current progress.
                const baselineProgress = (userProgress / 80) * 100;
                const timeProgress = (elapsedSeconds * ((competitorState.wpm * 1.5) * 5 / 60) / textLength) * 100;
                progressPercent = Math.max(baselineProgress, timeProgress);
            } else {
                const charsPerSecond = (competitorState.wpm * 5) / 60;
                const totalCharsTypedByAI = charsPerSecond * elapsedSeconds;
                progressPercent = (totalCharsTypedByAI / textLength) * 100;
            }
        } else {
            const previousProgress = competitorState.progress;
            progressPercent = previousProgress;
        }

        competitorState.progress = Math.min(100, progressPercent);
        if (competitorState.progress >= 100 && !competitorState.finishTime) {
            competitorState.finishTime = Date.now();
        }
        aiPlayer.style.left = `calc(${Math.min(100, competitorState.progress)}% - 44px)`;

        // Update Ghost Racer position
        if (competitorState.hasGhost) {
            const ghostPlayer = document.getElementById('player-ghost');
            if (ghostPlayer) {
                const ghostCharsPerSecond = (competitorState.ghostWpm * 5) / 60;
                const totalCharsTypedByGhost = ghostCharsPerSecond * elapsedSeconds;
                const ghostProgressPercent = (totalCharsTypedByGhost / textLength) * 100;
                
                competitorState.ghostProgress = Math.min(100, ghostProgressPercent);
                ghostPlayer.style.left = `calc(${Math.min(100, competitorState.ghostProgress)}% - 44px)`;
            }
        }
    }

    function getCompetitorState() {
        return competitorState;
    }

    window.CompetitorAI = {
        competitorState,
        setupCompetitor,
        updateCompetitor,
        getCompetitorState
    };
})();
