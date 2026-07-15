(function() {
    const KEYBOARD_ROWS = [
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"],
        ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "?"]
    ];

    function renderDashboard(profile, attempts, latencies) {
        renderKPIs(profile, attempts);
        renderStreakCalendar(profile);
        renderRecommendations(latencies);
        renderKeyboardHeatmap(latencies);
    }

    function renderKPIs(profile, attempts) {
        const validAttempts = attempts.filter(r => r.accuracy >= 90);
        const topWpm = validAttempts.length > 0 ? Math.max(...validAttempts.map(r => r.wpm)) : 0;
        const totalRuns = attempts.length;
        
        const avgWpm = totalRuns > 0 ? Math.round(attempts.reduce((sum, r) => sum + r.wpm, 0) / totalRuns) : 0;
        const avgAcc = totalRuns > 0 ? Math.round(attempts.reduce((sum, r) => sum + r.accuracy, 0) / totalRuns) : 0;

        document.getElementById('dash-avg-wpm').textContent = avgWpm;
        document.getElementById('dash-top-wpm').textContent = topWpm;
        document.getElementById('dash-avg-accuracy').textContent = `${avgAcc}%`;
        
        // Render XP using the clean "k" metric layout if it crosses 1000 (e.g. 1460 = 1.4k)
        const rawXp = profile.totalWordsTyped || 0;
        const formattedXp = rawXp >= 1000 
            ? `${(Math.floor(rawXp / 100) / 10).toFixed(1).replace(/\.0$/, '')}k` 
            : Math.round(rawXp).toString();

        document.getElementById('dash-total-words').textContent = formattedXp;
    }

    function renderStreakCalendar(profile) {
        const streakCountEl = document.getElementById('dash-streak-count');
        const streakDaysEl = document.getElementById('dash-streak-days');
        
        if (!streakCountEl || !streakDaysEl) return;

        streakCountEl.textContent = `${profile.dailyStreak || 0}-Day Streak`;
        
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const todayIndex = new Date().getDay();
        
        streakDaysEl.innerHTML = Array(7).fill(0).map((_, i) => {
            const dayIndex = (todayIndex - 6 + i + 7) % 7;
            const isActive = i >= (7 - (profile.dailyStreak || 0));
            return `
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isActive 
                    ? 'bg-[var(--streak-flame)] text-white scale-105 shadow-md' 
                    : 'bg-primary text-secondary border border-white/5'
                }">${days[dayIndex]}</div>
            `;
        }).join('');
    }

    function renderRecommendations(latencies) {
        const coachTextEl = document.getElementById('dash-coach-text');
        if (!coachTextEl) return;

        const slowKeys = Object.entries(latencies)
            .filter(([_, delay]) => delay > 300)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (slowKeys.length === 0) {
            coachTextEl.textContent = "Your typing pace looks clean and steady! Focus on pushing raw WPM boundaries in the Advanced curriculum.";
            return;
        }

        const slowChars = slowKeys.map(([char]) => `'${char.toUpperCase()}'`).join(', ');
        let recommendation = `You are experiencing high latency (${slowKeys.map(k => `${k[1]}ms`).join(', ')}) on keys: ${slowChars}. `;

        const firstSlowKey = slowKeys[0][0];
        if (['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'].includes(firstSlowKey)) {
            recommendation += "Try practicing 'Bottom Row Keys' in the Basic Curriculum to improve your muscle memory of these keys.";
        } else if (['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].includes(firstSlowKey)) {
            recommendation += "Practice 'Top Row Keys' in the Basic Curriculum to train upper finger reaches.";
        } else if ([';', ',', '.', '!', '@', '#', '$', '%', '&', '*'].includes(firstSlowKey)) {
            recommendation += "Run 'Symbols & Punctuation' in the Basic Curriculum to sharpen accuracy on special characters.";
        } else {
            recommendation += "Target 'Home Row Words' or alternate hand sequences to streamline pacing.";
        }

        coachTextEl.textContent = recommendation;
    }

    function applyHeatmapStyle(element, latency) {
        if (!latency) {
            element.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
            element.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            element.style.color = 'var(--text-secondary)';
            element.style.boxShadow = 'none';
            element.title = 'No latency data recorded yet';
            return;
        }

        element.title = `Average delay: ${Math.round(latency)}ms`;
        if (latency < 200) {
            element.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            element.style.borderColor = 'rgba(16, 185, 129, 0.35)';
            element.style.color = '#34d399';
            element.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.2)';
        } else if (latency < 320) {
            element.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
            element.style.borderColor = 'rgba(245, 158, 11, 0.35)';
            element.style.color = '#fbbf24';
            element.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.2)';
        } else {
            element.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            element.style.borderColor = 'rgba(239, 68, 68, 0.35)';
            element.style.color = '#f87171';
            element.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.2)';
        }
    }

    function renderKeyboardHeatmap(latencies) {
        const container = document.getElementById('dash-keyboard-heatmap');
        if (!container) return;

        container.innerHTML = '';
        const board = document.createElement('div');
        board.className = 'keyboard-layout';

        KEYBOARD_ROWS.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';

            row.forEach(keyChar => {
                const keyEl = document.createElement('div');
                keyEl.className = 'key';
                keyEl.textContent = keyChar;

                const charKey = keyChar.toLowerCase();
                const latency = latencies[charKey];

                applyHeatmapStyle(keyEl, latency);
                rowEl.appendChild(keyEl);
            });

            board.appendChild(rowEl);
        });

        // Space key row
        const spaceRow = document.createElement('div');
        spaceRow.className = 'keyboard-row';
        const spaceKey = document.createElement('div');
        spaceKey.className = 'key key-space';
        spaceKey.textContent = 'SPACE';
        
        const spaceLatency = latencies[' '];
        applyHeatmapStyle(spaceKey, spaceLatency);
        
        spaceRow.appendChild(spaceKey);
        board.appendChild(spaceRow);

        container.appendChild(board);
    }

    window.DashboardUI = {
        renderDashboard
    };
})();
