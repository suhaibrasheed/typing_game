(function() {
    async function renderLevelSelector(protyperLevels, upscLevels, jkssbLevels, runsStats, activeTab, activeCategory) {
        renderCurriculumTabs(protyperLevels, upscLevels, jkssbLevels, activeTab);
        await renderCategoryFilters(protyperLevels, upscLevels, jkssbLevels, activeTab, activeCategory); // <-- Add 'await' here
        await renderLevelsGrid(protyperLevels, upscLevels, jkssbLevels, runsStats, activeTab, activeCategory);
    }

    function renderCurriculumTabs(protyperLevels, upscLevels, jkssbLevels, activeTab) {
        const tabsContainer = document.getElementById('curriculum-tabs');
        if (!tabsContainer) return;

        // Custom clean SVG tabs instead of Emojis
        const bookIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
        const shieldIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
        const briefIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
        const targetIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;

        tabsContainer.innerHTML = `
            <button class="px-6 py-3 font-extrabold text-sm border-b-2 transition flex items-center shrink-0 whitespace-nowrap ${
                activeTab === 'protyper'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-secondary hover:text-primary'
            }" data-tab="protyper">${bookIcon} Typing School</button>
            <button class="px-6 py-3 font-extrabold text-sm border-b-2 transition flex items-center shrink-0 whitespace-nowrap ${
                activeTab === 'upsc'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-secondary hover:text-primary'
            }" data-tab="upsc">${shieldIcon} Civil Service Prep</button>
            <button class="px-6 py-3 font-extrabold text-sm border-b-2 transition flex items-center shrink-0 whitespace-nowrap ${
                activeTab === 'jkssb'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-secondary hover:text-primary'
            }" data-tab="jkssb">${briefIcon} JKSSB FAA Prep</button>
            <button class="px-6 py-3 font-extrabold text-sm border-b-2 transition flex items-center shrink-0 whitespace-nowrap ${
                activeTab === 'mistakes'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-secondary hover:text-primary'
            }" data-tab="mistakes">${targetIcon} Mistakes</button>
        `;
    }

    async function renderCategoryFilters(protyperLevels, upscLevels, jkssbLevels, activeTab, activeCategory) {
        const filtersContainer = document.getElementById('level-category-tabs');
        if (!filtersContainer) return;

        filtersContainer.innerHTML = '';

        if (activeTab === 'mistakes') {
            filtersContainer.classList.add('hidden');
            return;
        } else {
            filtersContainer.classList.remove('hidden');
        }

        if (activeTab === 'protyper') {
            protyperLevels.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = `level-tab-btn px-4 py-2 text-xs font-bold rounded-full transition ${
                    activeCategory === cat.category
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-tertiary text-secondary hover:bg-secondary border border-white/5'
                }`;
                btn.textContent = cat.category;
                btn.dataset.category = cat.category;
                filtersContainer.appendChild(btn);
            });
        } else if (activeTab === 'jkssb') {
            const categories = ["All", "GK", "Accounts", "English", "Stats", "Science", "Economics", "Computers"];
            categories.forEach(catName => {
                const btn = document.createElement('button');
                btn.className = `level-tab-btn px-4 py-2 text-xs font-bold rounded-full transition ${
                    activeCategory === catName
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-tertiary text-secondary hover:bg-secondary border border-white/5'
                }`;
                btn.textContent = catName;
                btn.dataset.category = catName;
                filtersContainer.appendChild(btn);
            });
        } else {
            const categories = ["All", "Basic", "Essay", "GS-1", "GS-2", "GS-3", "GS-4", "GeoOP"];
            categories.forEach(catName => {
                const btn = document.createElement('button');
                btn.className = `level-tab-btn px-4 py-2 text-xs font-bold rounded-full transition ${
                    activeCategory === catName
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-tertiary text-secondary hover:bg-secondary border border-white/5'
                }`;
                btn.textContent = catName;
                btn.dataset.category = catName;
                filtersContainer.appendChild(btn);
            });
        }
    }

    const starSVG = (fillColor) => `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 fill-${fillColor} text-${fillColor} shrink-0" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

    function getMasteryStars(stats) {
        if (!stats || stats.length === 0) return { starsHtml: '', count: 0 };
        const validRuns = stats.filter(r => r.accuracy >= 90);
        if (validRuns.length === 0) return { starsHtml: '', count: 0 };

        const bestWpm = Math.max(...validRuns.map(r => r.wpm));
        const bestAcc = Math.max(...validRuns.map(r => r.accuracy));

        if (bestAcc >= 98 && bestWpm >= 80) {
            // Gold
            return { starsHtml: `<div class="flex gap-0.5">${starSVG('yellow-400')}${starSVG('yellow-400')}${starSVG('yellow-400')}</div>`, count: 3 };
        } else if (bestAcc >= 95 && bestWpm >= 50) {
            // Silver
            return { starsHtml: `<div class="flex gap-0.5">${starSVG('slate-300')}${starSVG('slate-300')}</div>`, count: 2 };
        }
        // Bronze
        return { starsHtml: `<div class="flex gap-0.5">${starSVG('amber-600')}</div>`, count: 1 };
    }

    async function renderLevelsGrid(protyperLevels, upscLevels, jkssbLevels, runsStats, activeTab, activeCategory) {
        const gridContainer = document.getElementById('level-grid');
        if (!gridContainer) return;

        gridContainer.innerHTML = '';
        
        if (activeTab === 'mistakes') {
            const rawMistakes = window.StorageDB && window.StorageDB.getMistakeWordsRaw ? await StorageDB.getMistakeWordsRaw() : [];
            if (rawMistakes.length === 0) {
                gridContainer.innerHTML = `
                    <div class="exam-empty-state col-span-full py-12 text-center border-dashed border border-white/5 rounded-2xl p-8" style="grid-column: 1 / -1;">
                        <span class="text-3xl opacity-50 block mb-2">🎉</span>
                        <strong class="block mt-2 text-sm text-primary">Your mistake bucket is empty!</strong>
                        <p class="text-xs text-secondary mt-1 max-w-sm mx-auto">Outstanding typing! Any words you misspell in Practice or Exam sessions will show up here as review lessons.</p>
                    </div>
                `;
                return;
            }
            // Group unique wrong words dynamically so the total typed words per lesson is always between 60 and 85 words
            const chunks = [];
            let currentChunk = [];
            let currentRepsSum = 0;

            for (let i = 0; i < rawMistakes.length; i++) {
                const item = rawMistakes[i];
                const weight = item.weight || 1;
                let reps = 3;
                if (weight >= 5) reps = 6;
                else if (weight >= 3) reps = 4;

                if (currentChunk.length > 0 && currentRepsSum + reps > 85) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                    currentRepsSum = 0;
                }
                currentChunk.push(item);
                currentRepsSum += reps;
            }
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
            }
            window.mistakesSessionsList = [];
            chunks.forEach((group, groupIdx) => {
                // Group is an array of objects: { word, weight, streak, timestamp }
                let totalWeight = 0;
                let totalStreak = 0;
                group.forEach(item => {
                    totalWeight += (item.weight || 1);
                    totalStreak += (item.streak || 0);
                });
                const avgWeight = (totalWeight / group.length).toFixed(1);
                const avgStreak = (totalStreak / group.length).toFixed(1);

                // Build lesson words using weighted spaced repetition
                const lessonWords = [];
                const wordRepCounts = group.map(item => {
                    const weight = item.weight || 1;
                    if (weight >= 5) return 6;
                    if (weight >= 3) return 4;
                    return 3;
                });

                const maxReps = Math.max(...wordRepCounts);
                for (let r = 0; r < maxReps; r++) {
                    const activeWordsInRound = [];
                    group.forEach((item, idx) => {
                        if (r < wordRepCounts[idx]) {
                            activeWordsInRound.push(item.word);
                        }
                    });
                    const shuffled = [...activeWordsInRound].sort(() => Math.random() - 0.5);
                    lessonWords.push(...shuffled);
                }

                const lessonText = lessonWords.join(' ');
                const wordsInGroup = group.map(item => item.word);

                window.mistakesSessionsList[groupIdx] = {
                    id: groupIdx,
                    name: `Precision Training ${groupIdx + 1}`,
                    text: lessonText,
                    curriculum: 'mistakes',
                    uniqueCount: group.length,
                    wordsInGroup: wordsInGroup,
                    rawGroup: group
                };
                const button = document.createElement('button');
                button.className = `level-btn p-5 rounded-2xl text-left transition duration-300 border flex flex-col justify-between group bg-secondary/40 backdrop-blur-md border-white/5 hover:border-[var(--accent-primary)] hover:shadow-[0_0_20px_rgba(129,140,248,0.15)] hover:-translate-y-1 cursor-pointer`;
                button.dataset.levelId = groupIdx;
                button.dataset.tab = 'mistakes';
                button.innerHTML = `
                    <div class="w-full flex flex-col justify-between h-full">
                        <div>
                            <p class="font-bold text-primary text-sm group-hover:text-[var(--accent-primary)] transition duration-200 leading-snug">Precision Training ${groupIdx + 1}</p>
                            <small class="text-[0.62rem] text-[var(--accent-primary)] font-bold mt-1 block">${group.length} words (Spaced Review)</small>
                            <div class="flex gap-2 mt-2">
                                <span class="text-[0.58rem] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/10">Avg Err: ${avgWeight}</span>
                                <span class="text-[0.58rem] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/10">Streak: ${avgStreak}/3</span>
                            </div>
                        </div>
                        <div class="w-full mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                            <span class="text-[0.65rem] text-secondary uppercase font-bold tracking-wider">Practice Lesson</span>
                            <span class="text-xs opacity-50">⚡</span>
                        </div>
                    </div>
                `;
                gridContainer.appendChild(button);
            });
            return;
        }

        let levelsToShow = [];
        let baseGlobalId = 0;

        if (activeTab === 'protyper') {
            let categoryIndex = protyperLevels.findIndex(c => c.category === activeCategory);
            if (categoryIndex === -1) categoryIndex = 0;
            
            for (let i = 0; i < categoryIndex; i++) {
                baseGlobalId += protyperLevels[i].levels.length;
            }

            levelsToShow = protyperLevels[categoryIndex].levels.map((lvl, idx) => ({
                ...lvl,
                id: baseGlobalId + idx,
                category: activeCategory
            }));
        } else if (activeTab === 'jkssb') {
            const allJkssbLevels = jkssbLevels[0].levels;
            levelsToShow = allJkssbLevels.map((lvl, idx) => ({
                ...lvl,
                id: idx,
                category: lvl.name.split(':')[0].trim()
            }));

            if (activeCategory !== 'All') {
                levelsToShow = levelsToShow.filter(lvl => lvl.category.includes(activeCategory));
            }
        } else {
            const allUpscLevels = upscLevels[0].levels;
            levelsToShow = allUpscLevels.map((lvl, idx) => ({
                ...lvl,
                id: idx,
                category: lvl.name.split(':')[0].trim()
            }));

            if (activeCategory !== 'All') {
                levelsToShow = levelsToShow.filter(lvl => lvl.category.includes(activeCategory));
            }
        }

        levelsToShow.forEach((level, index) => {
            const statKey = `${activeTab}_${level.id}`;
            const levelStats = runsStats[statKey] || [];
            
            const validRuns = levelStats.filter(r => r.accuracy >= 90);
            const bestRun = validRuns.reduce((best, run) => run.wpm > best.wpm ? run : best, { wpm: 0, accuracy: 0 });
            const { starsHtml } = getMasteryStars(levelStats);

            const isAbsoluteFirst = index === 0;
            const prevStatKey = `${activeTab}_${level.id - 1}`;
            const prevCompleted = !isAbsoluteFirst && runsStats[prevStatKey] && runsStats[prevStatKey].some(r => r.accuracy >= 90);
            const isUnlocked = isAbsoluteFirst || prevCompleted;

            const mastery = isUnlocked ? Math.min(100, levelStats.filter(r => r.accuracy >= 95).length * 20) : 0;
            let masteryClass = '';
            if (isUnlocked && mastery === 100) {
                masteryClass = 'premium-mastery-card';
            }

            const button = document.createElement('button');
            
            // Design Polish: Premium glassmorphism border card layout
            button.className = `level-btn p-5 rounded-2xl text-left transition duration-300 border flex flex-col justify-between group ${masteryClass} ${
                isUnlocked
                ? 'bg-secondary/40 backdrop-blur-md border-white/5 hover:border-[var(--accent-primary)] hover:shadow-[0_0_20px_rgba(129,140,248,0.15)] hover:-translate-y-1 cursor-pointer'
                : 'bg-secondary/20 border-white/5 opacity-40 cursor-not-allowed'
            }`;
            button.dataset.levelId = level.id;
            button.dataset.tab = activeTab;
            if (!isUnlocked) button.disabled = true;

            const lockIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-secondary opacity-50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

            button.innerHTML = `
                <div class="w-full flex justify-between items-start mb-2 gap-2">
                    <p class="font-bold text-primary text-sm group-hover:text-[var(--accent-primary)] transition duration-200 line-clamp-2 leading-snug">${level.name}</p>
                    <span class="text-xs shrink-0">${isUnlocked ? (starsHtml || '<span class="text-secondary opacity-40 text-[0.65rem] font-medium tracking-wide">Unplayed</span>') : lockIcon}</span>
                </div>
                <div class="w-full mt-auto pt-2 border-t border-white/5">
                    <div class="text-[0.68rem] text-secondary flex justify-between">
                        <span>Best WPM</span>
                        <span class="font-bold text-primary">${bestRun.wpm > 0 ? `${bestRun.wpm}` : '--'}</span>
                    </div>
                    <div class="text-[0.68rem] text-secondary flex justify-between mt-1">
                        <span>Accuracy</span>
                        <span class="font-bold text-primary">${bestRun.accuracy > 0 ? `${bestRun.accuracy}%` : '--'}</span>
                    </div>
                    ${isUnlocked ? `
                    <div class="w-full mt-4">
                        <div class="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden border border-white/5">
                            <div class="h-full rounded-full transition-all duration-500" style="width: ${mastery}%; background: ${mastery === 100 ? 'linear-gradient(90deg, #facc15, #f59e0b)' : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'};"></div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;

            gridContainer.appendChild(button);
        });
    }

    async function getLatestMistakeLevelData(groupIdx) {
        const rawMistakes = window.StorageDB && window.StorageDB.getMistakeWordsRaw ? await StorageDB.getMistakeWordsRaw() : [];
        if (rawMistakes.length === 0) return null;
        
        const chunks = [];
        let currentChunk = [];
        let currentRepsSum = 0;

        for (let i = 0; i < rawMistakes.length; i++) {
            const item = rawMistakes[i];
            const weight = item.weight || 1;
            let reps = 3;
            if (weight >= 5) reps = 6;
            else if (weight >= 3) reps = 4;

            if (currentChunk.length > 0 && currentRepsSum + reps > 85) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentRepsSum = 0;
            }
            currentChunk.push(item);
            currentRepsSum += reps;
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }
        
        const group = chunks[groupIdx];
        if (!group) return null;
        
        const lessonWords = [];
        const wordRepCounts = group.map(item => {
            const weight = item.weight || 1;
            if (weight >= 5) return 6;
            if (weight >= 3) return 4;
            return 3;
        });

        const maxReps = Math.max(...wordRepCounts);
        for (let r = 0; r < maxReps; r++) {
            const activeWordsInRound = [];
            group.forEach((item, idx) => {
                if (r < wordRepCounts[idx]) {
                    activeWordsInRound.push(item.word);
                }
            });
            const shuffled = [...activeWordsInRound].sort(() => Math.random() - 0.5);
            lessonWords.push(...shuffled);
        }

        const lessonText = lessonWords.join(' ');
        const wordsInGroup = group.map(item => item.word);

        return {
            id: groupIdx,
            name: `Precision Training ${groupIdx + 1}`,
            text: lessonText,
            curriculum: 'mistakes',
            uniqueCount: group.length,
            wordsInGroup: wordsInGroup,
            rawGroup: group
        };
    }

    window.LevelSelectorUI = {
        renderLevelSelector,
        getLatestMistakeLevelData
    };
})();
