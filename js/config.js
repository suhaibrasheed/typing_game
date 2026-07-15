(function() {
    const RANKS = [
        { name: "Mr. Zero", threshold: 0, colors: ['#94a3b8', '#64748b'], class: 'tier-seedling' },
        { name: "Seed", threshold: 600, colors: ['#a3e635', '#65a30d'], class: 'tier-seedling' },
        { name: "Bud", threshold: 1200, colors: ['#4ade80', '#16a34a'], class: 'tier-seedling' },
        { name: "Sprout", threshold: 1800, colors: ['#34d399', '#059669'], class: 'tier-seedling' },
        { name: "Sapling", threshold: 2400, colors: ['#2dd4bf', '#0d9488'], class: 'tier-seedling' },
        { name: "Tree", threshold: 3000, colors: ['#22c55e', '#15803d'], class: 'tier-seedling' },
        
        { name: "Copper", threshold: 3800, colors: ['#f59e0b', '#b45309'], class: 'tier-metallurgy' },
        { name: "Iron", threshold: 4600, colors: ['#a8a29e', '#78716c'], class: 'tier-metallurgy' },
        { name: "Steel", threshold: 5400, colors: ['#d4d4d8', '#a1a1aa'], class: 'tier-metallurgy' },
        { name: "Silver", threshold: 6200, colors: ['#e5e7eb', '#9ca3af'], class: 'tier-metallurgy silver-glow' },
        { name: "Gold", threshold: 7000, colors: ['#facc15', '#eab308'], class: 'tier-metallurgy gold-glow' },
        
        { name: "Amber", threshold: 8000, colors: ['#fbbf24', '#f59e0b'], class: 'tier-gemstones' },
        { name: "Opal", threshold: 9000, colors: ['#c084fc', '#9333ea'], class: 'tier-gemstones' },
        { name: "Jade", threshold: 10000, colors: ['#34d399', '#059669'], class: 'tier-gemstones emerald-glow' },
        { name: "Amethyst", threshold: 11000, colors: ['#a78bfa', '#7c3aed'], class: 'tier-gemstones' },
        { name: "Topaz", threshold: 12000, colors: ['#fcd34d', '#fbbf24'], class: 'tier-gemstones' },
        { name: "Sapphire", threshold: 13200, colors: ['#60a5fa', '#2563eb'], class: 'tier-gemstones sapphire-glow' },
        { name: "Emerald", threshold: 14400, colors: ['#4ade80', '#16a34a'], class: 'tier-gemstones emerald-glow' },
        { name: "Ruby", threshold: 15600, colors: ['#f87171', '#ef4444'], class: 'tier-gemstones' },
        { name: "Diamond", threshold: 16800, colors: ['#93c5fd', '#3b82f6'], class: 'tier-gemstones sapphire-glow' },
        { name: "Onyx", threshold: 18000, colors: ['#52525b', '#3f3f46'], class: 'tier-gemstones' },
        
        { name: "Knight", threshold: 19400, colors: ['#a1a1aa', '#71717a'], class: 'tier-combatants' },
        { name: "Champion", threshold: 20800, colors: ['#eab308', '#ca8a04'], class: 'tier-combatants' },
        { name: "Warrior", threshold: 22200, colors: ['#ef4444', '#dc2626'], class: 'tier-combatants' },
        { name: "Victor", threshold: 23600, colors: ['#a855f7', '#9333ea'], class: 'tier-combatants' },
        { name: "Hero", threshold: 25000, colors: ['#ec4899', '#db2777'], class: 'tier-combatants' },
        
        { name: "Swift", threshold: 26600, colors: ['#67e8f9', '#0891b2'], class: 'tier-speedsters' },
        { name: "Rapid", threshold: 28200, colors: ['#38bdf8', '#0284c7'], class: 'tier-speedsters' },
        { name: "Quick", threshold: 29800, colors: ['#0ea5e9', '#0369a1'], class: 'tier-speedsters' },
        { name: "Speedy", threshold: 31400, colors: ['#2563eb', '#1d4ed8'], class: 'tier-speedsters' },
        { name: "Sonic", threshold: 33000, colors: ['#4f46e5', '#4338ca'], class: 'tier-speedsters' },
        
        { name: "Force", threshold: 35000, colors: ['#d946ef', '#c026d3'], class: 'tier-celestial' },
        { name: "Power", threshold: 38000, colors: ['#f43f5e', '#e11d48'], class: 'tier-celestial' },
        { name: "Energy", threshold: 40000, colors: ['#eab308', '#f59e0b'], class: 'tier-celestial' },
        { name: "Strength", threshold: 42000, colors: ['#84cc16', '#65a30d'], class: 'tier-celestial' },
        { name: "Might", threshold: 44000, colors: ['#f97316', '#ea580c'], class: 'tier-celestial' },
        
        { name: "Star", threshold: 46000, colors: ['#fde047', '#facc15'], class: 'tier-cosmic' },
        { name: "Comet", threshold: 48000, colors: ['#7dd3fc', '#38bdf8'], class: 'tier-cosmic' },
        { name: "Planet", threshold: 50000, colors: ['#818cf8', '#6366f1'], class: 'tier-cosmic' },
        { name: "Galaxy", threshold: 53000, colors: ['#c084fc', '#a855f7'], class: 'tier-cosmic' },
        { name: "Nebula", threshold: 56000, colors: ['#f472b6', '#ec4899'], class: 'tier-cosmic' },
        
        { name: "Legend", threshold: 60000, colors: ['#fca5a5', '#ef4444', '#facc15', '#eab308'], class: 'tier-legends' },
        { name: "Myth", threshold: 65000, colors: ['#fdba74', '#fb923c', '#c084fc', '#a855f7'], class: 'tier-legends' },
        { name: "Epic", threshold: 70000, colors: ['#67e8f9', '#22d3ee', '#a78bfa', '#8b5cf6'], class: 'tier-legends' },
        { name: "Titan", threshold: 75000, colors: ['#e5e7eb', '#d1d5db', '#f59e0b', '#d97706'], class: 'tier-legends' },
        { name: "Divine", threshold: 80000, colors: ['#fde047', '#facc15', '#f1f5f9', '#e2e8f0'], class: 'tier-legends' },
        
        { name: "Ultimate", threshold: 85000, colors: ['#f87171', '#ef4444', '#4f46e5', '#4338ca'], class: 'tier-eternals' },
        { name: "Supreme", threshold: 90000, colors: ['#4ade80', '#22c55e', '#facc15', '#eab308'], class: 'tier-eternals' },
        { name: "Immortal", threshold: 95000, colors: ['#c084fc', '#a855f7', '#f472b6', '#ec4899'], class: 'tier-eternals' },
        { name: "Eternal", threshold: 100000, colors: ['#fbbf24', '#f59e0b', '#f43f5e', '#e11d48', '#d946ef', '#c026d3'], class: 'tier-eternals' }
    ];

    const RANK_MESSAGES = [
        "The journey begins now.", "A tiny Seed of potential!", "Your skills are budding.", "Sprouting towards greatness.",
        "Growing stronger every day.", "From little acorns...", "Forged in practice.", "Solid as Iron.",
        "Tempered and sharp.", "A shining achievement.", "Pure typing gold.", "Preserved in skill.",
        "Precious and tough.", "A gem of a typist.", "Regal and refined.", "Brilliant and bright.",
        "A true typing jewel.", "Flawless and green.", "Burning with speed.", "Unbreakable focus.",
        "Darkly powerful.", "A knight of the keyboard.", "Champion of the craft.", "A true word warrior.",
        "Victory is yours!", "A heroic pace.", "Swift as the wind.", "Rapid-fire fingers.",
        "Too quick to catch.", "Speed defines you.", "A sonic boom of words.", "A force of nature.",
        "Unleash your power.", "Full of energy.", "Strength in every stroke.", "Mighty and masterful.",
        "A rising star.", "Blazing a trail.", "Out of this world.", "A galaxy of words.",
        "Creating new constellations.", "Truly a Legend.", "A Myth in the making.", "An Epic performance.",
        "A Titan of typing.", "Simply Divine speed.", "The Ultimate typist.", "A Supreme talent.",
        "Your skill is Immortal.", "An Eternal legacy."
    ];

    const POWER_QUOTES = [
        "Your only limit is your mind.",
        "Mistakes are proof that you are trying.",
        "Slow progress is better than no progress.",
        "Consistency beats talent when talent fails to work.",
        "Type like nobody is watching.",
        "Speed will follow your accuracy.",
        "Keep your eyes on the screen, not the keys.",
        "Action is the foundational key to all success.",
        "You don't have to be perfect to start.",
        "Success is the sum of small efforts repeated daily.",
        "Great things never came from comfort zones.",
        "Focus on progress, not perfection.",
        "Every expert was once a beginner.",
        "Believe you can and you're halfway there.",
        "Be stronger than your excuses.",
        "Do something today that your future self will thank you for.",
        "The secret of getting ahead is getting started.",
        "Doubt kills more dreams than failure ever will.",
        "Work hard in silence, let your success make the noise.",
        "It always seems impossible until it's done.",
        "Your speed is a reflection of your focus.",
        "Smooth is fast, and fast is precise.",
        "Focus on the rhythm of your strokes.",
        "Precision is the mother of velocity.",
        "One key at a time, one level at a time.",
        "Do it with passion or not at all.",
        "Push yourself, because no one else is going to do it for you.",
        "Success doesn't just find you; you have to go out and get it.",
        "Dream it. Believe it. Build it.",
        "Don't stop when you're tired. Stop when you're done.",
        "Wake up with determination. Go to bed with satisfaction.",
        "Little things make big things happen.",
        "It's going to be hard, but hard does not mean impossible.",
        "Don't wish for it. Work for it.",
        "To avoid errors, stay fully in the present moment.",
        "Your fingers will remember what your mind forgets.",
        "Strive for smooth flow, not frantic speed.",
        "Flow like water, strike like lightning.",
        "A steady rhythm unlocks incredible speed.",
        "Keep pushing your personal best.",
        "Errors are just lessons in disguise.",
        "You are building muscle memory for a lifetime.",
        "Stay calm, stay centered, and type.",
        "Mastery is a journey, not a destination.",
        "Celebrate every tiny speed improvement.",
        "Your concentration is your superpower.",
        "Stay relaxed; tension is the enemy of speed.",
        "Perfect practice makes perfect performance.",
        "You are faster today than you were yesterday.",
        "Your potential is unlimited.",
        "Every session makes you sharper.",
        "Keep your wrists up and your mind clear.",
        "Trust your fingers; they know the way.",
        "Calm fingers type the fastest records.",
        "Unleash your ultimate typing potential."
    ];

    const PLAYER_ICONS = ["Ship", "Cruiser", "Speedster", "Wing", "Rocket", "Bird", "Chopper", "Moto", "Tortoise", "bullet"];

    // Premium custom vector SVG definitions for Avatar Selectors & Lanes
    const PLAYER_SVG_ICONS = {
        Ship: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 17.5h18L12 2zm-1 11H6.5l4.5-8v8zm2-8v8h4.5l-4.5-8zM4 19.5V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5H4z"/></svg>`,
        Cruiser: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2v-1h8v1c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
        Speedster: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11c0-3.87-3.13-7-7-7H6c-1.1 0-2 .9-2 2v6H2v2h2v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4h2v-2h-2v-1zM7.5 17.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm10 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
        Wing: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" style="transform: rotate(90deg);"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l8 2.5z"/></svg>`,
        Rocket: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" style="transform: rotate(90deg);"><path d="M12 2C9 5 9 9 9 12c0 2 1.5 3.5 3 3.5s3-1.5 3-3.5c0-3 0-7-3-10zm0 8.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm-5 5.5v3c0 .6.4 1 1 1h2v-4H8c-.6 0-1 .4-1 1zm10-1v4h2c.6 0 1-.4 1-1v-3c0-.6-.4-1-1-1h-2zM11 21.5h2v2h-2z"/></svg>`,
        Bird: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>`,
        Chopper: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2v2H2v2h10v1.5c-3.3 0-6 2.7-6 6V18c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4.5c0-3.3-2.7-6-6-6V6h10V4H14V2h-2z"/></svg>`,
        Moto: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM5 12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm12.3-9.5c.3 0 .5-.2.5-.5V6c0-1.1-.9-2-2-2h-3.5c-.3 0-.6.1-.8.4L9.4 6.8 5 3.5 3 5l5.5 4h2.7l2.8-3H15c.3 0 .5.2.5.5V8c0 .3.2.5.5.5h1.3z"/></svg>`,
        Tortoise: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6c-3.3 0-6 2.7-6 6v1c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-1c0-3.3-2.7-6-6-6zm-7 8c0-.6-.4-1-1-1H7c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h2.5c.3 0 .5.2.5.5V9c0 .6.4 1 1 1h1.3c.3 0 .5.2.5.5V12c0 1.1-.9 2-2 2zm10.5-2.5c-.83 0-1.5.67-1.5 1.5V14c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-.5c0-1.1-.9-2-2-2zM4.5 17h1v2H4.5v-2zm12 0h1v2h-1v-2zm-7 0h1v2h-1v-2zm3.5 0h1v2h-1v-2z"/></svg>`,
        bullet: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M2 13h10a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H2v7zm16.5-6h-1c-.3 0-.5.2-.5.5v7c0 .3.2.5.5.5h1c.8 0 1.5-.7 1.5-1.5v-5c0-.8-.7-1.5-1.5-1.5zm4 1.5h-1c-.3 0-.5.2-.5.5v4c0 .3.2.5.5.5h1c.6 0 1-.4 1-1v-3c0-.6-.4-1-1-1z"/></svg>`
    };

    // Premium custom vector SVG definitions for Audio Selectors
    const AUDIO_SVG_ICONS = {
        Keyboard: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="14" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>`,
        Calm: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
        Water: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`,
        Laser: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
        Bubble: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="8" cy="8" r="2"></circle></svg>`,
        Wind: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>`,
        Synth: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
        Bell: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
        "Mechanical Clicky": `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM9 10h6M9 14h6"></path></svg>`,
        Pirate: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 0-5 5v3c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V7a5 5 0 0 0-5-5z"></path><path d="M9 18v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2"></path><circle cx="10" cy="10" r="1"></circle><circle cx="14" cy="10" r="1"></circle></svg>`
    };

    const AI_NAMES = ["Alex", "Ben", "Chloe", "David", "Eva", "Frank", "Grace", "Henry", "Ivy", "Jack"];

    const COLOR_PALETTE = ['#D7263D', '#E45A2A', '#F6C445', '#F4A1CF', '#B07BE3', '#6FA8F7', '#55C2EE', '#4FD0C0', '#5ED487', '#3BBF7D', '#25AC71', '#119822'];

    window.RANKS = RANKS;
    window.RANK_MESSAGES = RANK_MESSAGES;
    window.POWER_QUOTES = POWER_QUOTES;
    window.PLAYER_ICONS = PLAYER_ICONS;
    window.PLAYER_SVG_ICONS = PLAYER_SVG_ICONS;
    window.AUDIO_SVG_ICONS = AUDIO_SVG_ICONS;
    window.AI_NAMES = AI_NAMES;
    window.COLOR_PALETTE = COLOR_PALETTE;
})();
