(function() {
    // Application SPA States
    const appState = {
        profile: null,
        attempts: [],
        runsStats: {}, // grouped runs per level id: { protyper_0: [...], upsc_0: [...] }
        activeTab: 'mistakes', // protyper or upsc
        activeCategory: 'Review', // Basic, Intermediate, Advanced, etc.
        activeView: 'practice' // exam, dashboard or practice
    };

    const DOMElements = {
        mainTitle: () => document.getElementById('main-title-btn'),
        powerQuote: () => document.getElementById('power-quote'),
        rankBadge: () => document.getElementById('rank-badge'),
        rankBadgeName: () => document.getElementById('rank-badge-name'),
        settingsBtn: () => document.getElementById('settings-btn'),
        statsBtn: () => document.getElementById('stats-btn'),
        typingInput: () => document.getElementById('typing-input'),
        gameSessionView: () => document.getElementById('game-session-view'),
        levelSelectionView: () => document.getElementById('level-selection-view'),
        curriculumTabs: () => document.getElementById('curriculum-tabs'),
        categoryTabs: () => document.getElementById('level-category-tabs'),
        levelGrid: () => document.getElementById('level-grid'),
        viewDashboardBtn: () => document.getElementById('view-dashboard-btn'),
        viewPracticeBtn: () => document.getElementById('view-practice-btn'),
        viewExamBtn: () => document.getElementById('view-exam-btn'),
        donationBtn: () => document.getElementById('donation-btn')
    };

    function updateSplashProgress(percent) {
        const bar = document.getElementById('splash-loading-bar');
        if (bar) {
            bar.style.width = `${percent}%`;
        }
    }

    function hideSplashScreen() {
        const splash = document.getElementById('app-splash-screen');
        if (splash) {
            const card = splash.querySelector('div');
            if (card) {
                card.classList.add('scale-90', 'opacity-0');
            }
            splash.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                splash.remove();
            }, 800);
        }
    }

    // Bootstrap application on DOM ready
    document.addEventListener('DOMContentLoaded', async () => {
        const startTime = Date.now();
        
        // Start smooth 1.8s progress bar transition immediately
        setTimeout(() => {
            updateSplashProgress(100);
        }, 50);

        try {
            await StorageDB.initDB();
            appState.profile = await StorageDB.getUserProfile();
            
            // Setup configurations
            document.body.classList.add(appState.profile.colorTheme);
            SoundEngine.init();
            
            // Sync stats & streaks
            await syncDataAndDrawUI();
            
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, 1800 - elapsedTime);
            setTimeout(hideSplashScreen, remainingTime);
            
            checkDailyStreakBroken();
            rotatePowerQuote();
            
            // Setup tickers
            setInterval(rotatePowerQuote, 240000); // 4 minutes quote tick
            
            // Setup core listeners
            setupEventListeners();
            ExamEngine.init({
                profile: appState.profile,
                onHistoryChanged: renderExamHistory
            });
            ModalsUI.setupModalCloseListeners();
            initManualPassages();
            
            GameScreenUI.initGameScreenHandlers(() => {
                GameEngine.abortGame();
                showMainMenu();
            });

            // Initialize default view
            switchView('practice');
            
            console.log("ProTyper SPA Engine Loaded.");
        } catch (e) {
            console.error("Critical error bootstrapping application:", e);
            hideSplashScreen();
        }
    });

    async function syncDataAndDrawUI() {
        // Run database reads concurrently to optimize startup speed
        const [attempts, latencies] = await Promise.all([
            StorageDB.getAllAttempts(),
            StorageDB.getKeyLatencies()
        ]);
        
        appState.attempts = attempts || [];
        
        // Calculate average WPM from history
        const validAttemptsForAvg = appState.attempts.filter(r => r.wpm > 0);
        const averageWpm = validAttemptsForAvg.length > 0
            ? Math.round(validAttemptsForAvg.reduce((sum, r) => sum + r.wpm, 0) / validAttemptsForAvg.length)
            : 40;
        if (appState.profile) {
            appState.profile.averageWpm = averageWpm;
        }

        // Structure stats grouping: e.g. { protyper_12: [...], upsc_1: [...] }
        appState.runsStats = {};
        appState.attempts.forEach(run => {
            const key = `${run.curriculum}_${run.levelId}`;
            if (!appState.runsStats[key]) {
                appState.runsStats[key] = [];
            }
            appState.runsStats[key].push(run);
        });

        // Ranks UI update
        updateRanksProgressBadge();

        // Draw UI components
        DashboardUI.renderDashboard(appState.profile, appState.attempts, latencies);
        LevelSelectorUI.renderLevelSelector(
            PROTYPER_LEVELS, 
            UPSC_LEVELS, 
            JKSSB_LEVELS, 
            appState.runsStats, 
            appState.activeTab, 
            appState.activeCategory
        );
        StatsViewUI.renderStatsCharts(appState.attempts);
    }

    function switchView(viewName) {
        appState.activeView = viewName;
        
        const dashView = document.getElementById('dashboard-view');
        const practView = document.getElementById('practice-view');
        const examView = document.getElementById('exam-view');
        const dashBtn = DOMElements.viewDashboardBtn();
        const practBtn = DOMElements.viewPracticeBtn();
        const examBtn = DOMElements.viewExamBtn();
        const mainContent = document.getElementById('main-content');

        [dashView, practView, examView].forEach(view => view.classList.add('hidden'));
        [dashBtn, practBtn, examBtn].forEach(btn => btn.className = "px-5 py-2 rounded-full font-extrabold text-xs sm:text-sm transition duration-300 flex items-center gap-1.5 cursor-pointer text-secondary hover:text-primary");

        if (viewName === 'exam') {
            mainContent.classList.add('exam-active');
        } else {
            mainContent.classList.remove('exam-active');
        }

        if (viewName === 'dashboard') {
            dashView.classList.remove('hidden');
            dashBtn.className = "px-5 py-2 rounded-full font-extrabold text-xs sm:text-sm transition duration-300 flex items-center gap-1.5 cursor-pointer text-white border border-white/5 bg-[var(--accent-primary)] shadow-[0_0_12px_rgba(129,140,248,0.25)]";
        } else if (viewName === 'exam') {
            examView.classList.remove('hidden');
            examBtn.className = "px-5 py-2 rounded-full font-extrabold text-xs sm:text-sm transition duration-300 flex items-center gap-1.5 cursor-pointer text-white border border-white/5 bg-[var(--accent-primary)] shadow-[0_0_12px_rgba(129,140,248,0.25)]";
            renderExamHistory();
        } else {
            practView.classList.remove('hidden');
            practBtn.className = "px-5 py-2 rounded-full font-extrabold text-xs sm:text-sm transition duration-300 flex items-center gap-1.5 cursor-pointer text-white border border-white/5 bg-[var(--accent-primary)] shadow-[0_0_12px_rgba(129,140,248,0.25)]";
        }
    }

    async function renderExamHistory() {
        if (window.ExamEngine) await ExamEngine.renderHistory();
    }

    function updateRanksProgressBadge() {
        const badge = DOMElements.rankBadge();
        const badgeName = DOMElements.rankBadgeName();
        
        if (!badge || !badgeName) return;

        const words = appState.profile.totalWordsTyped || 0;
        
        // Find current rank details
        let currentIdx = 0;
        let currentRank = RANKS[0];
        for (let i = RANKS.length - 1; i >= 0; i--) {
            if (words >= RANKS[i].threshold) {
                currentRank = RANKS[i];
                currentIdx = i;
                break;
            }
        }
        
        appState.profile.currentRank = currentRank.name;
        badgeName.textContent = currentRank.name;
        
        // Calculate progress percentage to next rank for fill effect overlay
        const nextRank = RANKS[currentIdx + 1] || currentRank;
        const currentDiff = words - currentRank.threshold;
        const thresholdDiff = nextRank.threshold - currentRank.threshold;
        const progressPercent = thresholdDiff > 0 ? Math.min(100, Math.max(0, (currentDiff / thresholdDiff) * 100)) : 100;

        // Determine high-contrast rank theme colors dynamically
        const isLightTheme = document.body.classList.contains('theme-light');
        const activeColor = isLightTheme ? (currentRank.colors[1] || currentRank.colors[0]) : currentRank.colors[0];

        // Inline flow integration rather than absolute coordinates positioning
        badge.className = `relative overflow-hidden px-4 py-2 rounded-full font-extrabold text-xs flex items-center gap-2 transition hover:scale-105 cursor-pointer ${currentRank.class}`;
        
        // Helper to convert hex values to RGB for flexible alpha border/shadows
        const hexToRgb = (hex) => {
            const cleanHex = hex.replace(/^#/, '');
            const num = parseInt(cleanHex, 16);
            return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
        };
        
        badge.style.setProperty('--rank-text-color', activeColor);
        badge.style.setProperty('--rank-rgb', hexToRgb(activeColor));
        
        // Premium progress fill effect: capsule shape sliding inside parent track container
        const fill = document.getElementById('rank-badge-fill');
        if (fill) {
            fill.style.width = `${progressPercent}%`;
            fill.style.background = `linear-gradient(135deg, ${currentRank.colors.join(', ')})`;
            fill.style.opacity = '0.12'; // Keep backdrop translucent for supreme contrast
        }
    }

    function checkDailyStreakBroken() {
        if (!appState.profile.lastPlayedDate) {
            appState.profile.dailyStreak = 0;
            return;
        }
        const todayStr = new Date().toDateString();
        const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
        const lastPlayedStr = new Date(appState.profile.lastPlayedDate).toDateString();
        
        if (lastPlayedStr !== todayStr && lastPlayedStr !== yesterdayStr) {
            appState.profile.dailyStreak = 0;
            StorageDB.saveUserProfile(appState.profile);
        }
    }

    function incrementDailyStreak() {
        const todayStr = new Date().toDateString();
        const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
        const lastPlayedStr = appState.profile.lastPlayedDate 
            ? new Date(appState.profile.lastPlayedDate).toDateString() 
            : null;

        if (lastPlayedStr !== todayStr) {
            if (lastPlayedStr === yesterdayStr) {
                appState.profile.dailyStreak += 1;
            } else {
                appState.profile.dailyStreak = 1;
            }
            appState.profile.lastPlayedDate = new Date().toISOString();
            StorageDB.saveUserProfile(appState.profile);
        }
    }

    function rotatePowerQuote() {
        const quoteEl = DOMElements.powerQuote();
        if (!quoteEl) return;

        // Transition fade out softly
        quoteEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        quoteEl.style.opacity = '0';
        quoteEl.style.transform = 'translateY(-3px)';

        setTimeout(() => {
            const quote = POWER_QUOTES[Math.floor(Math.random() * POWER_QUOTES.length)];
            
            // Select dynamic color based on active rank profile
            const words = appState.profile ? appState.profile.totalWordsTyped : 0;
            let rankIdx = 0;
            for (let i = RANKS.length - 1; i >= 0; i--) {
                if (words >= RANKS[i].threshold) {
                    rankIdx = i;
                    break;
                }
            }
            const currentColors = RANKS[rankIdx].colors;

            quoteEl.textContent = quote;
            quoteEl.style.backgroundImage = `linear-gradient(135deg, ${currentColors.join(', ')})`;
            quoteEl.style.webkitBackgroundClip = 'text';
            quoteEl.style.webkitTextFillColor = 'transparent';
            
            // Fade back in softly
            quoteEl.style.opacity = '1';
            quoteEl.style.transform = 'translateY(0)';
        }, 400);
    }

    function showToast(message, options = {}) {
        const existing = document.getElementById('app-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = options.warning ? 'exam-warning-toast' : 'fixed bottom-6 right-6 z-[999] bg-secondary/95 backdrop-blur-md border border-[var(--border-color)] px-4 py-3 rounded-xl shadow-2xl text-xs text-primary max-w-xs transition-all duration-300 transform translate-y-10 opacity-0';
        if (options.warning) {
            toast.innerHTML = `<strong>Before you enter exam mode</strong><p>${message}</p><button type="button" aria-label="Dismiss notification">&times;</button>`;
            toast.querySelector('button').addEventListener('click', () => toast.remove());
        } else toast.textContent = message;
        document.body.appendChild(toast);

        if (!options.warning) setTimeout(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        }, 10);

        if (!options.persistent) setTimeout(() => {
            if (!toast.isConnected) return;
            if (options.warning) toast.remove();
            else { toast.classList.add('translate-y-10', 'opacity-0'); setTimeout(() => toast.remove(), 300); }
        }, options.duration || 6000);
    }
    window.showToast = showToast;

    function setupEventListeners() {
        const ghostInfoBtn = document.getElementById('ghost-info-btn');
        if (ghostInfoBtn) {
            ghostInfoBtn.addEventListener('click', () => {
                SoundEngine.playTapSound();
                showToast("Level Raceway: Race against AI. If you have completed this level before with passing accuracy, your Personal Best will appear as a semi-transparent Ghost Racer!");
            });
        }

        // 1. Home / Navigation clicks
        DOMElements.mainTitle().addEventListener('click', () => {
            SoundEngine.playTapSound();
            showMainMenu();
        });

        // View Toggles
        DOMElements.viewDashboardBtn().addEventListener('click', () => {
            SoundEngine.playTapSound();
            switchView('dashboard');
        });

        DOMElements.viewPracticeBtn().addEventListener('click', () => {
            SoundEngine.playTapSound();
            switchView('practice');
        });

        DOMElements.viewExamBtn().addEventListener('click', () => {
            SoundEngine.playTapSound();
            switchView('exam');
        });

        const donationBtn = DOMElements.donationBtn();
        if (donationBtn) {
            donationBtn.addEventListener('click', () => {
                SoundEngine.playTapSound();
                
                const overlay = document.getElementById('donation-overlay');
                const canvas = document.getElementById('confetti-canvas');
                if (!overlay || !canvas) return;

                // Show thank you modal overlay
                overlay.classList.remove('opacity-0', 'pointer-events-none');
                overlay.classList.add('opacity-100', 'pointer-events-auto');
                const modal = overlay.querySelector('div');
                if (modal) {
                    modal.classList.remove('scale-95');
                    modal.classList.add('scale-100');
                }

                // Initialize Canvas Context & Resize
                const ctx = canvas.getContext('2d');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;

                const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#ef4444'];
                const particles = [];

                // Create particles
                for (let i = 0; i < 150; i++) {
                    particles.push({
                        x: canvas.width / 2,
                        y: canvas.height / 2 + 50,
                        radius: Math.random() * 6 + 4,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        vx: (Math.random() - 0.5) * 15,
                        vy: (Math.random() - 0.7) * 20 - 5,
                        gravity: 0.5,
                        rotation: Math.random() * 360,
                        rotationSpeed: (Math.random() - 0.5) * 10
                    });
                }

                let animationId;
                function updateParticles() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    let active = false;

                    particles.forEach(p => {
                        p.x += p.vx;
                        p.y += p.vy;
                        p.vy += p.gravity;
                        p.rotation += p.rotationSpeed;

                        if (p.y < canvas.height) {
                            active = true;
                            ctx.save();
                            ctx.translate(p.x, p.y);
                            ctx.rotate((p.rotation * Math.PI) / 180);
                            ctx.fillStyle = p.color;
                            ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
                            ctx.restore();
                        }
                    });

                    if (active) {
                        animationId = requestAnimationFrame(updateParticles);
                    }
                }

                updateParticles();

                // Redirect after 8 seconds
                setTimeout(() => {
                    cancelAnimationFrame(animationId);
                    window.location.href = "https://rzp.io/rzp/civilskashsupport";
                }, 8000);
            });
        }

        const examInfoBtn = document.getElementById('exam-info-btn');
        if (examInfoBtn) examInfoBtn.addEventListener('click', () => {
            showToast("Government typing portals commonly provide little or no live error guidance. Many exams (like SSC or RRB) use a strict 'Blind Transcript' format with no word highlights or auto-scrolling, while others (like JKSSB) restrict backspacing on past words via a 'Word-Lock'. This simulator supports both modes, follows official full/half-mistake guidelines, and prepares you for real software constraints. Type carefully and prioritize accuracy.", { warning: true, persistent: true });
        });

        DOMElements.rankBadge().addEventListener('click', () => {
            SoundEngine.playTapSound();
            ModalsUI.renderRankModal(appState.profile);
            ModalsUI.showModal('rank-modal');
        });

        DOMElements.settingsBtn().addEventListener('click', () => {
            SoundEngine.playTapSound();
            ModalsUI.renderSettingsModal(appState.profile, async (updatedProfile) => {
                appState.profile = updatedProfile;
                await StorageDB.saveUserProfile(appState.profile);
                updateRanksProgressBadge();
                if (window.ExamEngine && window.ExamEngine.updateProfile) {
                    window.ExamEngine.updateProfile(updatedProfile);
                }
            });
            ModalsUI.showModal('settings-modal');
        });

        const appsBtn = document.getElementById('apps-btn');
        if (appsBtn) {
            appsBtn.addEventListener('click', () => {
                SoundEngine.playTapSound();
                ModalsUI.showModal('apps-modal');
            });
        }

        const statsBtn = DOMElements.statsBtn();
        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                SoundEngine.playTapSound();
                ModalsUI.hideModal('settings-modal');
                switchView('dashboard');
                setTimeout(() => {
                    const target = document.getElementById('stats-chart-placeholder');
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 150);
            });
        }

        // 2. Typing interactions
        const input = DOMElements.typingInput();
        input.addEventListener('input', GameEngine.handleTypingInput);
        input.addEventListener('keydown', GameEngine.handleKeyDown);

        const display = document.getElementById('text-display');
        if (display) {
            display.addEventListener('click', () => {
                input.focus();
            });
        }

        // 3. Tab Routing clicks (delegated)
        DOMElements.curriculumTabs().addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn) {
                SoundEngine.playTapSound();
                appState.activeTab = btn.dataset.tab;
                appState.activeCategory = appState.activeTab === 'protyper' ? 'Basic' : (appState.activeTab === 'mistakes' ? 'Review' : 'All');
                LevelSelectorUI.renderLevelSelector(
                    PROTYPER_LEVELS, 
                    UPSC_LEVELS, 
                    JKSSB_LEVELS, 
                    appState.runsStats, 
                    appState.activeTab, 
                    appState.activeCategory
                );
            }
        });

        DOMElements.categoryTabs().addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn) {
                SoundEngine.playTapSound();
                appState.activeCategory = btn.dataset.category;
                LevelSelectorUI.renderLevelSelector(
                    PROTYPER_LEVELS, 
                    UPSC_LEVELS, 
                    JKSSB_LEVELS, 
                    appState.runsStats, 
                    appState.activeTab, 
                    appState.activeCategory
                );
            }
        });

        DOMElements.levelGrid().addEventListener('click', async (e) => {
            const btn = e.target.closest('.level-btn');
            if (btn) {
                SoundEngine.playTapSound();
                const levelId = parseInt(btn.dataset.levelId);
                const tab = btn.dataset.tab;
                
                // Gather correct level details from correct array
                let levelData = null;
                if (tab === 'mistakes') {
                    levelData = await window.LevelSelectorUI.getLatestMistakeLevelData(levelId);
                } else if (tab === 'protyper') {
                    const flat = PROTYPER_LEVELS.flatMap(c => c.levels);
                    levelData = flat[levelId];
                } else if (tab === 'jkssb') {
                    levelData = JKSSB_LEVELS[0].levels[levelId];
                } else {
                    levelData = UPSC_LEVELS[0].levels[levelId];
                }

                if (levelData) {
                    if (tab !== 'mistakes') {
                        levelData.id = levelId;
                    }
                    // Get player best WPM for adaptive AI racer difficulty adjustments
                    const runsKey = `${tab}_${levelId}`;
                    const runs = appState.runsStats[runsKey] || [];
                    const validRuns = runs.filter(r => r.accuracy >= 90);
                    const bestWpm = validRuns.length > 0 ? Math.max(...validRuns.map(r => r.wpm)) : 0;
                    
                    GameEngine.startGame(levelData, tab, appState.profile, bestWpm);
                }
            }
        });
    }

    function showMainMenu() {
        DOMElements.gameSessionView().classList.add('hidden');
        DOMElements.levelSelectionView().classList.remove('hidden');
        const navContainer = document.getElementById('app-nav-container');
        if (navContainer) navContainer.classList.remove('hidden');
        syncDataAndDrawUI();
        switchView(appState.activeView);
    }

    // 4. Session complete callback handling
    window.addEventListener('typingGameComplete', async (e) => {
        const { wpm, accuracy, wordsTyped, won, levelId, curriculum, mistakeSummary } = e.detail;

        // Fetch previous best speed before syncing the new run
        const runsKey = `${curriculum}_${levelId}`;
        const runs = appState.runsStats[runsKey] || [];
        const validRuns = runs.filter(r => r.accuracy >= 90);
        const previousBestWpm = validRuns.length > 0 ? Math.max(...validRuns.map(r => r.wpm)) : 0;

        const handleRetry = async () => {
            const tab = curriculum;
            let levelData = null;
            if (tab === 'mistakes') {
                levelData = await window.LevelSelectorUI.getLatestMistakeLevelData(levelId);
            } else if (tab === 'protyper') {
                const flat = PROTYPER_LEVELS.flatMap(c => c.levels);
                levelData = flat[levelId];
            } else if (tab === 'jkssb') {
                levelData = JKSSB_LEVELS[0].levels[levelId];
            } else {
                levelData = UPSC_LEVELS[0].levels[levelId];
            }
            
            if (levelData) {
                if (tab !== 'mistakes') {
                    levelData.id = levelId;
                }
            }
            
            const rKey = `${tab}_${levelId}`;
            const rList = appState.runsStats[rKey] || [];
            const vRuns = rList.filter(r => r.accuracy >= 90);
            const bestWpm = vRuns.length > 0 ? Math.max(...vRuns.map(r => r.wpm)) : 0;
            
            GameEngine.startGame(levelData, tab, appState.profile, bestWpm);
        };

        const handleNext = async () => {
            const nextId = levelId + 1;
            const tab = curriculum;
            let levelData = null;
            let exists = false;

            if (tab === 'mistakes') {
                levelData = await window.LevelSelectorUI.getLatestMistakeLevelData(nextId);
                exists = !!levelData;
            } else if (tab === 'protyper') {
                const flat = PROTYPER_LEVELS.flatMap(c => c.levels);
                levelData = flat[nextId];
                exists = !!levelData;
            } else if (tab === 'jkssb') {
                levelData = JKSSB_LEVELS[0].levels[nextId];
                exists = !!levelData;
            } else {
                levelData = UPSC_LEVELS[0].levels[nextId];
                exists = !!levelData;
            }

            if (exists && levelData) {
                if (tab !== 'mistakes') {
                    levelData.id = nextId;
                }
                const rKey = `${tab}_${nextId}`;
                const rList = appState.runsStats[rKey] || [];
                const vRuns = rList.filter(r => r.accuracy >= 90);
                const bestWpm = vRuns.length > 0 ? Math.max(...vRuns.map(r => r.wpm)) : 0;
                
                GameEngine.startGame(levelData, tab, appState.profile, bestWpm);
            } else {
                showMainMenu();
            }
        };

        const handleMenu = () => {
            showMainMenu();
        };

        let xpEarned = 0;
        try {
            const oldWords = appState.profile.totalWordsTyped || 0;
            
            // Performance-weighted XP system: XP = Words * (WPM / 60) * (Accuracy / 100)^2
            const baseWords = wordsTyped || 0;
            const speedFactor = wpm / 60;
            const accuracyFactor = Math.pow(accuracy / 100, 2);
            xpEarned = Math.max(1, Math.round(baseWords * speedFactor * accuracyFactor));
            appState.profile.totalWordsTyped = oldWords + xpEarned;

            // Check if new rank is reached
            let oldRankName = 'Mr. Zero';
            let newRankName = 'Mr. Zero';
            
            for (let i = RANKS.length - 1; i >= 0; i--) {
                if (oldWords >= RANKS[i].threshold) {
                    oldRankName = RANKS[i].name;
                    break;
                }
            }
            for (let i = RANKS.length - 1; i >= 0; i--) {
                if (appState.profile.totalWordsTyped >= RANKS[i].threshold) {
                    newRankName = RANKS[i].name;
                    break;
                }
            }

            // Save attempt inside IndexedDB and increment streak
            incrementDailyStreak();
            await StorageDB.saveAttempt({
                levelId,
                curriculum,
                wpm,
                accuracy,
                wordsCount: wordsTyped
            });

            await StorageDB.saveUserProfile(appState.profile);
            await syncDataAndDrawUI();

            const competitorState = CompetitorAI.getCompetitorState();
            const username = appState.profile.username || 'You';

            if (newRankName !== oldRankName) {
                // Trigger celebratory screen instead of results modal directly
                ModalsUI.triggerRankUpCelebration(
                    oldRankName, 
                    newRankName, 
                    appState.profile.totalWordsTyped, 
                    () => {
                        ModalsUI.renderResultsModal(wpm, accuracy, won, previousBestWpm, xpEarned, wordsTyped, competitorState, username, handleRetry, handleNext, handleMenu, mistakeSummary);
                    }
                );
            } else {
                ModalsUI.renderResultsModal(wpm, accuracy, won, previousBestWpm, xpEarned, wordsTyped, competitorState, username, handleRetry, handleNext, handleMenu, mistakeSummary);
            }
        } catch (error) {
            console.error("Resilient recovery: error in game completion stats save:", error);
            // Always display the results modal to the user even if DB or rank checks fail
            const competitorState = CompetitorAI.getCompetitorState();
            const username = (appState.profile && appState.profile.username) || 'You';
            ModalsUI.renderResultsModal(wpm, accuracy, won, previousBestWpm, xpEarned, wordsTyped, competitorState, username, handleRetry, handleNext, handleMenu, null);
        }
    });

    function initManualPassages() {
        const manualPassageBtn = document.getElementById('manual-passage-btn');
        if (!manualPassageBtn) return;

        const modal = document.getElementById('manual-passage-modal');
        const tabLibraryBtn = document.getElementById('manual-tab-library-btn');
        const tabNewBtn = document.getElementById('manual-tab-new-btn');
        const viewLibrary = document.getElementById('manual-view-library');
        const viewNew = document.getElementById('manual-view-new');
        const libraryList = document.getElementById('manual-library-list');
        const pasteBtn = document.getElementById('manual-paste-btn');
        const saveBtn = document.getElementById('manual-save-btn');
        const startBtn = document.getElementById('manual-start-btn');
        const inputTitle = document.getElementById('manual-input-title');
        const inputText = document.getElementById('manual-input-text');

        // Render library list
        async function renderLibrary() {
            if (!libraryList) return;
            libraryList.innerHTML = '';
            const passages = await StorageDB.getManualPassages();

            if (passages.length === 0) {
                libraryList.innerHTML = `
                    <div class="text-center py-8 text-secondary font-medium text-xs">
                        <i class="fa-solid fa-folder-open text-2xl mb-2 opacity-50 block"></i>
                        No custom passages saved yet.
                    </div>
                `;
                return;
            }

            passages.forEach(p => {
                const item = document.createElement('div');
                item.className = 'manual-passage-item';
                
                const wordCount = p.text.trim().split(/\s+/).filter(Boolean).length;
                const date = new Date(p.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                item.innerHTML = `
                    <div class="manual-passage-info">
                        <span class="manual-passage-title">${escapeHTML(p.title)}</span>
                        <span class="manual-passage-meta">${date} · ${wordCount} words</span>
                    </div>
                    <div class="manual-passage-actions">
                        <button class="manual-action-btn play" title="Start exam with this passage" type="button">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        <button class="manual-action-btn delete" title="Delete passage" type="button">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;

                // Bind actions
                item.querySelector('.play').addEventListener('click', () => {
                    SoundEngine.playTapSound();
                    ModalsUI.hideModal('manual-passage-modal');
                    window.ExamEngine.start(p);
                });

                item.querySelector('.delete').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    SoundEngine.playTapSound();
                    await StorageDB.deleteManualPassage(p.id);
                    showToast('Passage deleted');
                    renderLibrary();
                });

                libraryList.appendChild(item);
            });
        }

        function escapeHTML(value) {
            const node = document.createElement('span');
            node.textContent = String(value);
            return node.innerHTML;
        }

        // Open Modal
        manualPassageBtn.addEventListener('click', () => {
            SoundEngine.playTapSound();
            ModalsUI.showModal('manual-passage-modal');
            // Reset to Library Tab
            switchTab('library');
            renderLibrary();
        });

        // Tab Switching
        function switchTab(tab) {
            if (tab === 'library') {
                tabLibraryBtn.className = 'flex-1 pb-3 text-xs font-black uppercase tracking-wider border-b-2 border-[var(--accent-primary)] text-primary';
                tabNewBtn.className = 'flex-1 pb-3 text-xs font-black uppercase tracking-wider border-b-2 border-transparent text-secondary hover:text-primary transition';
                viewLibrary.classList.remove('hidden');
                viewNew.classList.add('hidden');
            } else {
                tabNewBtn.className = 'flex-1 pb-3 text-xs font-black uppercase tracking-wider border-b-2 border-[var(--accent-primary)] text-primary';
                tabLibraryBtn.className = 'flex-1 pb-3 text-xs font-black uppercase tracking-wider border-b-2 border-transparent text-secondary hover:text-primary transition';
                viewNew.classList.remove('hidden');
                viewLibrary.classList.add('hidden');
            }
        }

        tabLibraryBtn.addEventListener('click', () => { SoundEngine.playTapSound(); switchTab('library'); });
        tabNewBtn.addEventListener('click', () => { SoundEngine.playTapSound(); switchTab('new'); });

        // Clipboard Paste
        pasteBtn.addEventListener('click', async () => {
            SoundEngine.playTapSound();
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    inputText.value = text;
                    showToast('Pasted from clipboard');
                } else {
                    showToast('Clipboard is empty', { warning: true });
                }
            } catch (err) {
                showToast('Clipboard access denied. Please use Ctrl+V/Cmd+V.', { warning: true });
            }
        });

        // Save to Library
        saveBtn.addEventListener('click', async () => {
            SoundEngine.playTapSound();
            const text = inputText.value.trim();
            let title = inputTitle.value.trim();
            if (!text) {
                showToast('Please enter some text first', { warning: true });
                return;
            }
            if (!title) {
                title = `Custom Passage - ${new Date().toLocaleDateString()}`;
            }

            await StorageDB.saveManualPassage({ title, text });
            showToast('Passage saved to library');
            
            // Reset fields
            inputTitle.value = '';
            inputText.value = '';
            
            switchTab('library');
            renderLibrary();
        });

        // Done & Start
        startBtn.addEventListener('click', async () => {
            SoundEngine.playTapSound();
            const text = inputText.value.trim();
            let title = inputTitle.value.trim();
            if (!text) {
                showToast('Please enter some text first', { warning: true });
                return;
            }
            if (!title) {
                title = `Custom Passage - ${new Date().toLocaleDateString()}`;
            }

            // Save to DB for future use
            const id = await StorageDB.saveManualPassage({ title, text });
            
            // Start exam mode
            ModalsUI.hideModal('manual-passage-modal');
            window.ExamEngine.start({ id, title, text });
            
            // Clear fields for next time
            inputTitle.value = '';
            inputText.value = '';
        });
    }

    window.syncDataAndDrawUI = syncDataAndDrawUI;
})();
