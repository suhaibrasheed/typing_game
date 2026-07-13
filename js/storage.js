(function() {
    const DB_NAME = "ProTyperUltimateDB";
    const DB_VERSION = 4;
    let dbInstance = null;

    function initDB() {
        return new Promise((resolve, reject) => {
            if (dbInstance) return resolve(dbInstance);

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB initialization error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const txn = event.target.transaction;

                // 1. user_profile store (key-value store for user configurations)
                if (!db.objectStoreNames.contains("user_profile")) {
                    db.createObjectStore("user_profile");
                }

                // 2. runs_history store (tracks game stats per level attempt)
                let runStore;
                if (!db.objectStoreNames.contains("runs_history")) {
                    runStore = db.createObjectStore("runs_history", { keyPath: "id", autoIncrement: true });
                } else {
                    runStore = txn.objectStore("runs_history");
                }
                if (!runStore.indexNames.contains("curriculum")) {
                    runStore.createIndex("curriculum", "curriculum", { unique: false });
                }
                if (!runStore.indexNames.contains("levelId")) {
                    runStore.createIndex("levelId", "levelId", { unique: false });
                }
                if (!runStore.indexNames.contains("timestamp")) {
                    runStore.createIndex("timestamp", "timestamp", { unique: false });
                }

                // 3. keystroke_analytics store (tracks typed character latency)
                let keyStore;
                if (!db.objectStoreNames.contains("keystroke_analytics")) {
                    keyStore = db.createObjectStore("keystroke_analytics", { keyPath: "id", autoIncrement: true });
                } else {
                    keyStore = txn.objectStore("keystroke_analytics");
                }
                if (!keyStore.indexNames.contains("char")) {
                    keyStore.createIndex("char", "char", { unique: false });
                }

                // 4. exams_history store (tracks mock exams taken by user)
                let examStore;
                if (!db.objectStoreNames.contains("exams_history")) {
                    examStore = db.createObjectStore("exams_history", { keyPath: "id", autoIncrement: true });
                } else {
                    examStore = txn.objectStore("exams_history");
                }
                if (!examStore.indexNames.contains("timestamp")) {
                    examStore.createIndex("timestamp", "timestamp", { unique: false });
                }

                // 5. mistakes_bucket store (tracks mistyped words)
                if (!db.objectStoreNames.contains("mistakes_bucket")) {
                    db.createObjectStore("mistakes_bucket", { keyPath: "word" });
                }
            };
        });
    }

    function getStore(storeName, mode = "readonly") {
        const tx = dbInstance.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    // User Profile Operations
    function getUserProfile() {
        return new Promise((resolve) => {
            const store = getStore("user_profile", "readonly");
            const request = store.get("config");
            request.onsuccess = () => {
                const defaultProfile = {
                    username: "You",
                    playerIcon: "Ship",
                    aiWpm: 70,
                    soundTheme: "Keyboard",
                    colorTheme: "theme-dark",
                    dailyStreak: 0,
                    lastPlayedDate: null,
                    totalWordsTyped: 0
                };
                resolve(request.result ? { ...defaultProfile, ...request.result } : defaultProfile);
            };
            request.onerror = () => resolve(null);
        });
    }

    function saveUserProfile(profile) {
        return new Promise((resolve, reject) => {
            const store = getStore("user_profile", "readwrite");
            const request = store.put(profile, "config");
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Stats / Attempts Operations
    function saveAttempt(attempt) {
        return new Promise((resolve, reject) => {
            const store = getStore("runs_history", "readwrite");
            const request = store.add({
                ...attempt,
                timestamp: Date.now()
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Unification feature preserved: logs are separated by curriculum
    function getAttempts(curriculum) {
        return new Promise((resolve) => {
            const store = getStore("runs_history", "readonly");
            const index = store.index("curriculum");
            const request = index.getAll(curriculum);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    }

    function getAllAttempts() {
        return new Promise((resolve) => {
            const store = getStore("runs_history", "readonly");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    }

    // Keystroke Analytics Operations
    function saveKeystrokeDelay(char, delayMs) {
        if (!char || char.length !== 1) return;
        const store = getStore("keystroke_analytics", "readwrite");
        store.add({
            char: char.toLowerCase(),
            delayMs: delayMs,
            timestamp: Date.now()
        });
    }

    // Mistakes Bucket Operations
    function addMistakeWords(wordsArray) {
        return new Promise((resolve) => {
            const store = getStore("mistakes_bucket", "readwrite");
            let completed = 0;
            if (wordsArray.length === 0) return resolve();
            
            // Clean up and deduplicate word list to prevent concurrent IndexedDB race conditions on the same key
            const uniqueCleanWords = [...new Set(wordsArray.map(w => w.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim()))].filter(Boolean);
            if (uniqueCleanWords.length === 0) return resolve();
            
            uniqueCleanWords.forEach(wordClean => {
                const getReq = store.get(wordClean);
                getReq.onsuccess = () => {
                    const existing = getReq.result || { word: wordClean, weight: 0, streak: 0 };
                    existing.weight = (existing.weight || 0) + 1;
                    existing.streak = 0; // reset streak on mistake
                    existing.timestamp = Date.now();
                    const putReq = store.put(existing);
                    putReq.onsuccess = putReq.onerror = () => {
                        completed++;
                        if (completed === uniqueCleanWords.length) resolve();
                    };
                };
                getReq.onerror = () => {
                    const putReq = store.put({ word: wordClean, weight: 1, streak: 0, timestamp: Date.now() });
                    putReq.onsuccess = putReq.onerror = () => {
                        completed++;
                        if (completed === uniqueCleanWords.length) resolve();
                    };
                };
            });
        });
    }

    function getMistakeWords() {
        return new Promise((resolve) => {
            const store = getStore("mistakes_bucket", "readonly");
            const request = store.getAll();
            request.onsuccess = () => {
                const list = request.result || [];
                // Sort by weight descending, then timestamp descending
                list.sort((a, b) => (b.weight || 1) - (a.weight || 1) || b.timestamp - a.timestamp);
                resolve(list.map(item => item.word));
            };
            request.onerror = () => resolve([]);
        });
    }

    function getMistakeWordsRaw() {
        return new Promise((resolve) => {
            const store = getStore("mistakes_bucket", "readonly");
            const request = store.getAll();
            request.onsuccess = () => {
                const list = request.result || [];
                // Sort by weight descending
                list.sort((a, b) => (b.weight || 1) - (a.weight || 1) || b.timestamp - a.timestamp);
                resolve(list);
            };
            request.onerror = () => resolve([]);
        });
    }

    function removeMistakeWords(wordsArray) {
        return new Promise((resolve) => {
            const store = getStore("mistakes_bucket", "readwrite");
            let completed = 0;
            if (wordsArray.length === 0) return resolve();
            
            // Clean up and deduplicate word list to prevent concurrent IndexedDB race conditions
            const uniqueCleanWords = [...new Set(wordsArray.map(w => w.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim()))].filter(Boolean);
            if (uniqueCleanWords.length === 0) return resolve();

            uniqueCleanWords.forEach(wordClean => {
                const getReq = store.get(wordClean);
                getReq.onsuccess = () => {
                    const existing = getReq.result;
                    if (existing) {
                        const currentWeight = existing.weight || 1;
                        if (currentWeight <= 1) {
                            // Graduate word - delete it entirely since error count hit 0
                            const delReq = store.delete(wordClean);
                            delReq.onsuccess = delReq.onerror = () => {
                                completed++;
                                if (completed === uniqueCleanWords.length) resolve();
                            };
                        } else {
                            // Reduce weight by 1
                            existing.weight = currentWeight - 1;
                            existing.streak = (existing.streak || 0) + 1;
                            const putReq = store.put(existing);
                            putReq.onsuccess = putReq.onerror = () => {
                                completed++;
                                if (completed === uniqueCleanWords.length) resolve();
                            };
                        }
                    } else {
                        completed++;
                        if (completed === uniqueCleanWords.length) resolve();
                    }
                };
                getReq.onerror = () => {
                    completed++;
                    if (completed === uniqueCleanWords.length) resolve();
                };
            });
        });
    }

    function getKeyLatencies() {
        return new Promise((resolve) => {
            const store = getStore("keystroke_analytics", "readonly");
            const request = store.getAll();
            request.onsuccess = () => {
                const data = request.result || [];
                const keyGroups = {};
                data.forEach(item => {
                    if (!keyGroups[item.char]) {
                        keyGroups[item.char] = { sum: 0, count: 0 };
                    }
                    keyGroups[item.char].sum += item.delayMs;
                    keyGroups[item.char].count += 1;
                });
                const latencies = {};
                for (const char in keyGroups) {
                    latencies[char] = Math.round(keyGroups[char].sum / keyGroups[char].count);
                }
                resolve(latencies);
            };
            request.onerror = () => resolve({});
        });
    }

    function saveExamAttempt(attempt) {
        return new Promise((resolve, reject) => {
            const store = getStore("exams_history", "readwrite");
            const request = store.add({
                ...attempt,
                timestamp: Date.now()
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    function getExamAttempts() {
        return new Promise((resolve) => {
            const store = getStore("exams_history", "readonly");
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result || [];
                // Sort by timestamp descending (newest first)
                results.sort((a, b) => b.timestamp - a.timestamp);
                resolve(results);
            };
            request.onerror = () => resolve([]);
        });
    }

    window.StorageDB = {
        initDB,
        getUserProfile,
        saveUserProfile,
        saveAttempt,
        getAttempts,
        getAllAttempts,
        saveKeystrokeDelay,
        getKeyLatencies,
        saveExamAttempt,
        getExamAttempts,
        addMistakeWords,
        getMistakeWords,
        getMistakeWordsRaw,
        removeMistakeWords
    };
})();
