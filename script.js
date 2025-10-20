class QuizGame {
    constructor() {
        // Constants
        this.CONSTANTS = {
            ANIMATION_DELAY: 100,
            FEEDBACK_DURATION: 2000,
            NOTIFICATION_DURATION: 4000,
            AI_ANSWER_DELAY: 2000,
            BOSS_FEEDBACK_DELAY: 1000,
            SCROLL_DELAY: 100,
            AI_SCORE_MULTIPLIER: 10,
            MAX_AI_BATTLE_POINTS: 1000,
            MAX_AI_BATTLE_QUESTIONS: 100,
            COMBO_BONUS_THRESHOLD: 5
        };

        // Debug mode (set to false for production)
        this.DEBUG_MODE = false;

        this.log('QuizGame constructor called');

        // Game state
        this.currentSubject = '';
        this.gameMode = 'classic'; // Removed duplicate declaration
        this.questions = [];
        this.score = 0;
        this.lives = 3;
        this.difficulty = 1;
        this.maxDifficulty = 1;
        this.questionsAnswered = 0;
        this.maxQuestions = 20;
        this.selectedQuestionCount = 20;
        this.startTime = null;

        // Combo system
        this.comboCount = 0;
        this.maxCombo = 0;

        // Custom quizzes
        this.customQuestions = [];
        this.customCategories = this.loadCustomCategories();

        // Data persistence
        this.quizHistory = this.loadQuizHistory();
        this.playerData = this.loadPlayerData();

        // Game systems
        this.avatars = this.initializeAvatars();
        this.achievements = this.initializeAchievements();
        this.initializeAICompetitors();
        this.updateCheatStatus();

        // Battle states
        this.isCurveball = false;
        this.isAIBattle = false;
        this.currentAI = null;
        this.aiScore = 0;
        this.aiLives = 3;

        // Daily challenges
        this.isDailyChallenge = false;
        this.currentDailyChallenge = null;

        // Theme, Sound, Timer, and Curveballs
        this.darkTheme = localStorage.getItem('darkTheme') === 'true';
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        this.timerEnabled = localStorage.getItem('timerEnabled') === 'true';
        this.curveballsEnabled = localStorage.getItem('curveballsEnabled') !== 'false';
        this.studyMode = localStorage.getItem('studyMode') === 'true';
        this.initializeTheme();
        this.initializeSounds();
        this.initializeTimer();
        this.initializeCurveballToggle();
        this.initializeStudyModeToggle();
        this.setupCommandBar();

        // Power-ups
        this.powerups = this.loadPowerups();
        this.infiniteLives = false;

        // New game modes
        this.isSurvivalMode = false;
        this.isLightningRound = false;
        this.isSuddenDeath = false;
        this.isBossRush = false;

        // Multiplier system
        this.currentMultiplier = 1;
        this.streakForMultiplier = 0;

        // Streak system
        this.dailyStreak = this.playerData.loginStreak || 0;
        this.lastLoginDate = this.playerData.lastLoginDate || null;
        this.checkDailyStreak();

        // Mystery box system
        this.mysteryBoxChance = 0.1; // 10% chance

        // Timer
        this.quizTimer = null;
        this.elapsedTime = 0;

        // Inventory and cosmetics
        this.inventory = this.loadInventory();
        this.equippedItems = this.loadEquippedItems();
        this.shopItems = this.initializeShopItems();
        this.avatars = this.initializeAvatars();
        this.featuredAchievements = this.loadFeaturedAchievements();

        // Cache DOM elements
        this.cachedElements = {};

        this.log('Initializing questions...');
        this.initializeQuestions();

        this.log('Binding events...');
        this.bindEvents();

        this.log('Initializing account system...');
        this.initializeAccountSystem();

        this.log('Showing initial screen...');
        this.showInitialScreen();
        this.renderCustomCategories();
        this.renderHistory();
        this.renderAvatar();
        this.renderAchievements();
        this.renderDailyChallenges();

        // Cheat code detection
        this.cheatCodeBuffer = '';
        this.cheatCodeActive = false;
        this.setupCheatCodeDetection();

        this.log('QuizGame constructor completed');
    }

    // Debug logging helper
    log(...args) {
        if (this.DEBUG_MODE) {
            console.log('[QuizMaster]', ...args);
        }
    }

    error(...args) {
        console.error('[QuizMaster ERROR]', ...args);
    }

    // Safe DOM element getter with caching
    getElement(id, cache = true) {
        if (cache && this.cachedElements[id]) {
            return this.cachedElements[id];
        }
        const element = document.getElementById(id);
        if (!element) {
            this.error(`Element not found: ${id}`);
        }
        if (cache && element) {
            this.cachedElements[id] = element;
        }
        return element;
    }

    // Cheat code detection setup
    setupCheatCodeDetection() {
        console.log('Setting up cheat code detection...');

        // Use window instead of document to ensure it captures all keypresses
        window.addEventListener('keypress', (e) => {
            console.log('Key pressed:', e.key);

            // Cheat code detection (only if not typing in input field)
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                this.cheatCodeBuffer += e.key.toLowerCase();

                // Keep only last 10 characters
                if (this.cheatCodeBuffer.length > 10) {
                    this.cheatCodeBuffer = this.cheatCodeBuffer.slice(-10);
                }

                // Debug: Show buffer in console
                console.log('Cheat buffer:', this.cheatCodeBuffer);

                // Check for cheat code "pttx3"
                if (this.cheatCodeBuffer.includes('pttx3')) {
                    console.log('Cheat code detected!');
                    if (!this.cheatCodeActive && !this.playerData.cheatCodeUsed) {
                        this.activateCheatCode();
                    } else if (this.playerData.cheatCodeUsed) {
                        alert('⚠️ Cheat code already used! It only works once.');
                    } else if (this.cheatCodeActive) {
                        alert('💀 Cheat code is already active!\n\nCheat Debt Remaining: ' + this.playerData.cheatDebt + ' points');
                    }
                    // Clear buffer after detection
                    this.cheatCodeBuffer = '';
                }
            }
        });

        // Also keep the keydown listener for Ctrl+Shift+R
        document.addEventListener('keydown', (e) => {
            // Reset account shortcut (Ctrl+Shift+R)
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                if (confirm('Reset all data and show account screen?')) {
                    localStorage.clear();
                    location.reload();
                }
                return;
            }
        });

        console.log('Cheat code detection setup complete!');
    }

    setupCommandBar() {
        const commandBar = document.getElementById('command-bar');
        if (!commandBar) return;

        // Command/cheat code mappings with unique effects
        const commands = {
            // Original cheat code - Answer Bot
            'pttx3': () => this.activateCheatCode(),

            // padio (PyAudio) - Coin boost with debt
            'padio': () => {
                if (this.playerData.codesUsed?.padio) {
                    alert('⚠️ Code already used!');
                    return;
                }
                this.playerData.coins = (this.playerData.coins || 0) + 1000;
                this.playerData.coinDebt = 1500;
                if (!this.playerData.codesUsed) this.playerData.codesUsed = {};
                this.playerData.codesUsed.padio = true;
                this.savePlayerData();
                this.updateCoinsDisplay();
                alert('🎵 PADIO CODE ACTIVATED!\n\n+1,000 coins!\n\n⚠️ Coin Debt: Next 1,500 coins earned go to debt!');
            },

            // tkiner (Tkinter) - Shows all codes with penalty
            'tkiner': () => {
                this.playerData.totalScore -= 2000;
                this.savePlayerData();
                this.updateNavPoints();
                alert('�  SECRET CODES LIST:\n\n' +
                    '• pttx3\n• padio\n• tkiner\n• gamep\n• loace\n• guido van rossum\n• abud\n' +
                    '• numpy\n• flask\n• django\n• scipy\n• matplotlib\n• requests\n• beautifulsoup\n• pytest\n\n' +
                    '❓ What do they do? Try them and find out!\n\n⚠️ Penalty: -2,000 points for peeking!');
            },

            // pytest - Testing reward (good code!)
            'pytest': () => {
                if (this.playerData.codesUsed?.pytest) {
                    alert('⚠️ Code already used!');
                    return;
                }
                this.playerData.coins = (this.playerData.coins || 0) + 5000;
                if (!this.playerData.codesUsed) this.playerData.codesUsed = {};
                this.playerData.codesUsed.pytest = true;
                this.savePlayerData();
                this.updateCoinsDisplay();
                alert('✅ PYTEST CODE ACTIVATED!\n\n+5,000 FREE COINS!\n\nThank you for testing! 🧪');
            },

            // matplotlib - Shows "illegal" hacks menu
            'matplotlib': () => {
                const choice = confirm('📊 MATPLOTLIB LIBRARY\n\n⚠️ ILLEGAL HACKS DETECTED\n\n' +
                    '💀 ACCOUNT RESET HACK\n' +
                    '• Reset ALL progress\n' +
                    '• Get 10% more coins permanently\n' +
                    '• Disable achievements forever\n\n' +
                    'Activate this hack?');

                if (choice) {
                    if (confirm('⚠️ FINAL WARNING!\n\nThis will DELETE everything!\n\nAre you ABSOLUTELY sure?')) {
                        this.playerData.totalScore = 0;
                        this.playerData.achievements = [];
                        this.playerData.achievementsDisabled = true;
                        this.playerData.coinBonus = 0.1;
                        this.playerData.coins = Math.floor((this.playerData.coins || 0) * 1.1);
                        this.savePlayerData();
                        alert('💀 HACK ACTIVATED!\n\nAll progress erased.\n+10% coin bonus.\nAchievements disabled forever.');
                        location.reload();
                    }
                }
            },

            // beautifulsoup - Hack code (dangerous)
            'beautifulsoup': () => {
                alert('🕷️ BEAUTIFULSOUP HACK\n\n⚠️ DANGER: This code scrapes your data!\n\n' +
                    '💀 Effects:\n' +
                    '• -5,000 points\n' +
                    '• Reveals all cheat codes\n' +
                    '• Marks account as "Hacker"\n\n' +
                    'Use at your own risk!');

                this.playerData.totalScore -= 5000;
                this.playerData.accountStatus = 'Hacker';
                this.savePlayerData();
                this.updateNavPoints();

                setTimeout(() => {
                    alert('📋 ALL CODES REVEALED:\n\n' +
                        '✅ GOOD CODES (No Penalties):\n' +
                        '• pytest = 5000 free coins\n' +
                        '• abud = infinite lives + 1000 coins\n\n' +
                        '⚠️ RISKY CODES (Penalties):\n' +
                        '• tkiner = shows code list (-2000 pts)\n' +
                        '• padio = 1000 coins + 1500 debt\n' +
                        '• loace = 2000 pts + 500 coins + 1000 debt\n' +
                        '• guido van rossum = 5000 pts - 2000 coins\n' +
                        '• numpy = 1000 pts - 500 pts\n' +
                        '• flask = 300 coins + 400 debt\n' +
                        '• django = 1500 pts - 800 pts\n' +
                        '• scipy = 800 pts + 200 coins - 600 pts\n' +
                        '• requests = 400 coins + 500 debt\n' +
                        '• gamep = random (-500 to +2000)\n\n' +
                        '💀 DANGEROUS:\n' +
                        '• pttx3 = answer bot (-10k pts + 15k debt)\n' +
                        '• matplotlib = account reset hack');
                }, 1000);
            },

            // gamep (Pygame) - Mystery reward
            'gamep': () => {
                const rewards = [500, 1000, 2000, -500, 0];
                const reward = rewards[Math.floor(Math.random() * rewards.length)];
                this.playerData.totalScore += reward;
                this.savePlayerData();
                this.updateNavPoints();
                alert(`🎮 GAMEP CODE!\n\nMystery reward: ${reward > 0 ? '+' : ''}${reward} points!`);
            },

            // loace (Lovelace) - Risky boost
            'loace': () => {
                if (this.playerData.codesUsed?.loace) {
                    alert('⚠️ Code already used!');
                    return;
                }
                this.playerData.totalScore += 2000;
                this.playerData.coins = (this.playerData.coins || 0) + 500;
                this.playerData.coinDebt = 1000;
                if (!this.playerData.codesUsed) this.playerData.codesUsed = {};
                this.playerData.codesUsed.loace = true;
                this.savePlayerData();
                this.updateNavPoints();
                this.updateCoinsDisplay();
                alert('💻 LOACE CODE!\n\nAda Lovelace blesses you!\n\n+2,000 points\n+500 coins\n\n⚠️ Coin Debt: 1,000 coins!');
            },

            // guido van rossum - Python master with cost
            'guido van rossum': () => {
                if (this.playerData.codesUsed?.guido) {
                    alert('⚠️ Code already used!');
                    return;
                }
                this.playerData.totalScore += 5000;
                this.playerData.coins = Math.max(0, (this.playerData.coins || 0) - 2000);
                if (!this.playerData.codesUsed) this.playerData.codesUsed = {};
                this.playerData.codesUsed.guido = true;
                this.savePlayerData();
                this.updateNavPoints();
                this.updateCoinsDisplay();
                alert('🐍 GUIDO VAN ROSSUM!\n\nThe creator of Python grants you:\n\n+5,000 points!\n\n⚠️ Cost: -2,000 coins!');
            },

            // abud - Special power
            'abud': () => {
                if (this.playerData.codesUsed?.abud) {
                    alert('⚠️ Code already used!');
                    return;
                }
                this.infiniteLives = true;
                this.playerData.coins = (this.playerData.coins || 0) + 1000;
                if (!this.playerData.codesUsed) this.playerData.codesUsed = {};
                this.playerData.codesUsed.abud = true;
                this.savePlayerData();
                this.updateCoinsDisplay();
                alert('🔥 ABUD CODE!\n\n💖 Infinite lives for this session!\n+1,000 coins!');
            },

            // numpy - Data boost with penalty
            'numpy': () => {
                this.playerData.totalScore += 1000;
                this.playerData.totalScore -= 500;
                this.savePlayerData();
                this.updateNavPoints();
                alert('📊 NUMPY!\n\n+1,000 points!\n\n⚠️ Processing fee: -500 points!\n\nNet: +500 points');
            },

            // flask - Web bonus with debt
            'flask': () => {
                this.playerData.coins = (this.playerData.coins || 0) + 300;
                this.playerData.coinDebt = (this.playerData.coinDebt || 0) + 400;
                this.savePlayerData();
                this.updateCoinsDisplay();
                alert('🌐 FLASK!\n\n+300 coins!\n\n⚠️ Coin Debt: +400 coins debt!');
            },

            // django - Framework power with cost
            'django': () => {
                this.playerData.totalScore += 1500;
                this.playerData.totalScore -= 800;
                this.savePlayerData();
                this.updateNavPoints();
                alert('🎨 DJANGO!\n\n+1,500 points!\n\n⚠️ Framework license: -800 points!\n\nNet: +700 points');
            },

            // scipy - Science boost with penalty
            'scipy': () => {
                this.playerData.totalScore += 800;
                this.playerData.coins = (this.playerData.coins || 0) + 200;
                this.playerData.totalScore -= 600;
                this.savePlayerData();
                this.updateNavPoints();
                this.updateCoinsDisplay();
                alert('🔬 SCIPY!\n\n+800 points\n+200 coins!\n\n⚠️ Research cost: -600 points!\n\nNet: +200 points');
            },

            // requests - API access with debt
            'requests': () => {
                this.playerData.coins = (this.playerData.coins || 0) + 400;
                this.playerData.coinDebt = (this.playerData.coinDebt || 0) + 500;
                this.savePlayerData();
                this.updateCoinsDisplay();
                alert('🌐 REQUESTS!\n\n+400 coins!\n\n⚠️ API fee: +500 coins debt!');
            },

            // Navigation commands
            'home': () => this.showScreen('home-screen'),
            'shop': () => this.showScreen('shop-screen'),
            'avatar': () => this.showScreen('avatar-screen'),
            'custom': () => this.showScreen('custom-screen'),
            'ai': () => this.showScreen('ai-pvp-screen'),
            'pvp': () => this.showScreen('ai-pvp-screen'),
            'achievements': () => this.showScreen('achievements-screen'),
            'profile': () => this.showScreen('profile-screen'),
            'daily': () => this.showScreen('daily-screen'),
            'improvement': () => this.showScreen('improvement-screen')
        };

        commandBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const input = commandBar.value.trim().toLowerCase();

                if (commands[input]) {
                    commands[input]();
                    commandBar.value = '';
                    commandBar.blur();
                } else {
                    // Try partial match for navigation
                    const match = Object.keys(commands).find(cmd => cmd.includes(input) || input.includes(cmd));
                    if (match) {
                        commands[match]();
                        commandBar.value = '';
                        commandBar.blur();
                    } else {
                        commandBar.style.borderColor = '#ff0000';
                        setTimeout(() => {
                            commandBar.style.borderColor = 'rgba(255,255,255,0.3)';
                        }, 500);
                    }
                }
            }
        });

        // Keyboard shortcut: Ctrl+K to focus command bar
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                commandBar.focus();
            }
        });
    }

    initializeQuestions() {
        this.questionBank = {
            math: [
                // Easy
                { question: "What is 2 + 2?", answers: ["3", "4", "5", "6"], correct: 1, difficulty: 1 },
                { question: "What is 10 - 7?", answers: ["2", "3", "4", "5"], correct: 1, difficulty: 1 },
                { question: "What is 5 × 3?", answers: ["12", "15", "18", "20"], correct: 1, difficulty: 1 },
                { question: "What is 8 + 6?", answers: ["12", "13", "14", "15"], correct: 2, difficulty: 1 },
                { question: "What is 20 - 12?", answers: ["6", "7", "8", "9"], correct: 2, difficulty: 1 },
                { question: "What is 4 × 7?", answers: ["24", "26", "28", "30"], correct: 2, difficulty: 1 },
                { question: "What is 36 ÷ 6?", answers: ["5", "6", "7", "8"], correct: 1, difficulty: 1 },
                { question: "What is 15 + 9?", answers: ["22", "23", "24", "25"], correct: 2, difficulty: 1 },
                { question: "What is 50 - 23?", answers: ["25", "26", "27", "28"], correct: 2, difficulty: 1 },
                { question: "What is 9 × 6?", answers: ["52", "54", "56", "58"], correct: 1, difficulty: 1 },
                // Medium
                { question: "What is 144 ÷ 12?", answers: ["11", "12", "13", "14"], correct: 1, difficulty: 2 },
                { question: "What is 7²?", answers: ["42", "49", "56", "64"], correct: 1, difficulty: 2 },
                { question: "What is the square root of 64?", answers: ["6", "7", "8", "9"], correct: 2, difficulty: 2 },
                { question: "What is 15% of 200?", answers: ["25", "30", "35", "40"], correct: 1, difficulty: 2 },
                { question: "What is 3⁴?", answers: ["64", "72", "81", "96"], correct: 2, difficulty: 2 },
                { question: "What is the square root of 121?", answers: ["10", "11", "12", "13"], correct: 1, difficulty: 2 },
                { question: "What is 25% of 80?", answers: ["15", "18", "20", "22"], correct: 2, difficulty: 2 },
                { question: "What is 12 × 15?", answers: ["170", "180", "190", "200"], correct: 1, difficulty: 2 },
                { question: "What is 256 ÷ 16?", answers: ["14", "15", "16", "17"], correct: 2, difficulty: 2 },
                { question: "What is 8³?", answers: ["496", "512", "528", "544"], correct: 1, difficulty: 2 },
                // Hard
                { question: "What is the derivative of x²?", answers: ["x", "2x", "x²", "2x²"], correct: 1, difficulty: 3 },
                { question: "What is sin(90°)?", answers: ["0", "1", "-1", "0.5"], correct: 1, difficulty: 3 },
                { question: "What is the integral of 2x?", answers: ["x²", "x² + C", "2x²", "2x² + C"], correct: 1, difficulty: 3 },
                { question: "What is log₁₀(1000)?", answers: ["2", "3", "4", "5"], correct: 1, difficulty: 3 },
                { question: "What is cos(0°)?", answers: ["0", "1", "-1", "0.5"], correct: 1, difficulty: 3 },
                { question: "What is the derivative of sin(x)?", answers: ["cos(x)", "-cos(x)", "sin(x)", "-sin(x)"], correct: 0, difficulty: 3 },
                { question: "What is e^(ln(5))?", answers: ["1", "5", "e", "ln(5)"], correct: 1, difficulty: 3 },
                { question: "What is the limit of (sin(x)/x) as x approaches 0?", answers: ["0", "1", "∞", "undefined"], correct: 1, difficulty: 3 }
            ],
            physics: [
                // Easy
                { question: "What force pulls objects toward Earth?", answers: ["Magnetism", "Gravity", "Friction", "Tension"], correct: 1, difficulty: 1 },
                { question: "What is the speed of light?", answers: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"], correct: 0, difficulty: 1 },
                { question: "What unit measures force?", answers: ["Joule", "Newton", "Watt", "Pascal"], correct: 1, difficulty: 1 },
                { question: "What is the largest planet in our solar system?", answers: ["Saturn", "Jupiter", "Neptune", "Uranus"], correct: 1, difficulty: 1 },
                { question: "What travels faster: light or sound?", answers: ["Light", "Sound", "Same speed", "Depends on medium"], correct: 0, difficulty: 1 },
                { question: "What is the center of an atom called?", answers: ["Electron", "Proton", "Nucleus", "Neutron"], correct: 2, difficulty: 1 },
                { question: "What type of energy does a moving object have?", answers: ["Potential", "Kinetic", "Thermal", "Chemical"], correct: 1, difficulty: 1 },
                { question: "What is the unit of electrical resistance?", answers: ["Volt", "Ampere", "Ohm", "Watt"], correct: 2, difficulty: 1 },
                // Medium
                { question: "What is Newton's second law?", answers: ["F = ma", "E = mc²", "V = IR", "P = IV"], correct: 0, difficulty: 2 },
                { question: "What is the name of the theoretical boundary around a black hole?", answers: ["Photon sphere", "Event horizon", "Schwarzschild radius", "Singularity"], correct: 1, difficulty: 2 },
                { question: "What is the SI unit of energy?", answers: ["Watt", "Joule", "Newton", "Pascal"], correct: 1, difficulty: 2 },
                { question: "What is the acceleration due to gravity on Earth?", answers: ["9.8 m/s²", "10 m/s²", "8.9 m/s²", "11 m/s²"], correct: 0, difficulty: 2 },
                { question: "What is the formula for kinetic energy?", answers: ["mgh", "½mv²", "mc²", "Fd"], correct: 1, difficulty: 2 },
                { question: "What is the principle that states energy cannot be created or destroyed?", answers: ["Conservation of Energy", "Conservation of Momentum", "Newton's Law", "Thermodynamics"], correct: 0, difficulty: 2 },
                // Hard
                { question: "What is the Heisenberg Uncertainty Principle?", answers: ["Energy = mc²", "You cannot know both position and momentum precisely", "F = ma", "E = hf"], correct: 1, difficulty: 3 },
                { question: "What is Planck's constant approximately?", answers: ["6.626 × 10⁻³⁴ J·s", "3.14159", "2.718", "1.602 × 10⁻¹⁹"], correct: 0, difficulty: 3 },
                { question: "What is the Schrödinger equation used for?", answers: ["Classical mechanics", "Quantum mechanics", "Relativity", "Thermodynamics"], correct: 1, difficulty: 3 },
                { question: "What is the speed of sound in air at 20°C?", answers: ["343 m/s", "300 m/s", "400 m/s", "500 m/s"], correct: 0, difficulty: 3 }
            ],
            chemistry: [
                // Easy
                { question: "What is the chemical symbol for water?", answers: ["H2O", "CO2", "NaCl", "O2"], correct: 0, difficulty: 1 },
                { question: "What is the chemical symbol for gold?", answers: ["Go", "Gd", "Au", "Ag"], correct: 2, difficulty: 1 },
                { question: "What gas do plants absorb from the atmosphere?", answers: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correct: 1, difficulty: 1 },
                { question: "What is the pH of pure water?", answers: ["6", "7", "8", "9"], correct: 1, difficulty: 1 },
                { question: "What is the most abundant gas in Earth's atmosphere?", answers: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correct: 2, difficulty: 1 },
                { question: "What is table salt chemically known as?", answers: ["NaCl", "KCl", "CaCl2", "MgCl2"], correct: 0, difficulty: 1 },
                { question: "What is the hardest natural substance?", answers: ["Gold", "Iron", "Diamond", "Quartz"], correct: 2, difficulty: 1 },
                { question: "What element has the symbol 'O'?", answers: ["Gold", "Oxygen", "Osmium", "Oganesson"], correct: 1, difficulty: 1 },
                // Medium
                { question: "What is Avogadro's number?", answers: ["6.022 × 10²³", "3.14159", "2.718", "1.602 × 10⁻¹⁹"], correct: 0, difficulty: 2 },
                { question: "What type of bond holds water molecules together?", answers: ["Ionic", "Covalent", "Hydrogen", "Metallic"], correct: 2, difficulty: 2 },
                { question: "What is the most electronegative element?", answers: ["Oxygen", "Nitrogen", "Fluorine", "Chlorine"], correct: 2, difficulty: 2 },
                { question: "What is the half-life of Carbon-14?", answers: ["5,730 years", "11,460 years", "2,865 years", "17,190 years"], correct: 0, difficulty: 2 },
                { question: "What is the strongest intermolecular force?", answers: ["Van der Waals", "Dipole-dipole", "Hydrogen bonding", "London dispersion"], correct: 2, difficulty: 2 },
                { question: "What is the process of a solid turning directly into a gas?", answers: ["Melting", "Evaporation", "Sublimation", "Condensation"], correct: 2, difficulty: 2 },
                // Hard
                { question: "What is the electron configuration of Carbon?", answers: ["1s² 2s² 2p²", "1s² 2s² 2p⁴", "1s² 2s² 2p⁶", "1s² 2s¹ 2p³"], correct: 0, difficulty: 3 },
                { question: "What is the Gibbs free energy equation?", answers: ["G = H - TS", "G = H + TS", "G = U - TS", "G = U + PV"], correct: 0, difficulty: 3 },
                { question: "What is the rate-determining step in a reaction?", answers: ["Fastest step", "Slowest step", "First step", "Last step"], correct: 1, difficulty: 3 },
                { question: "What is the oxidation state of Mn in KMnO₄?", answers: ["+5", "+6", "+7", "+4"], correct: 2, difficulty: 3 }
            ],
            coding: [
                // Easy
                { question: "What does HTML stand for?", answers: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink Text Markup Language"], correct: 0, difficulty: 1 },
                { question: "Which language is known for 'write once, run anywhere'?", answers: ["Python", "Java", "C++", "JavaScript"], correct: 1, difficulty: 1 },
                { question: "What symbol is used for comments in Python?", answers: ["//", "#", "/*", "<!--"], correct: 1, difficulty: 1 },
                { question: "What does CSS stand for?", answers: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style System", "Colorful Style Sheets"], correct: 1, difficulty: 1 },
                { question: "Which of these is a programming language?", answers: ["HTML", "CSS", "Python", "JSON"], correct: 2, difficulty: 1 },
                { question: "What is the result of 5 == '5' in JavaScript?", answers: ["true", "false", "error", "undefined"], correct: 0, difficulty: 1 },
                { question: "What does SQL stand for?", answers: ["Structured Query Language", "Simple Question Language", "Standard Query Logic", "System Query Language"], correct: 0, difficulty: 1 },
                { question: "Which symbol starts a variable in PHP?", answers: ["@", "#", "$", "&"], correct: 2, difficulty: 1 },
                // Medium
                { question: "What is the time complexity of binary search?", answers: ["O(n)", "O(log n)", "O(n²)", "O(1)"], correct: 1, difficulty: 2 },
                { question: "What does API stand for?", answers: ["Application Programming Interface", "Advanced Programming Integration", "Automated Program Interaction", "Application Process Integration"], correct: 0, difficulty: 2 },
                { question: "Which data structure uses LIFO?", answers: ["Queue", "Stack", "Array", "Tree"], correct: 1, difficulty: 2 },
                { question: "What is recursion?", answers: ["A loop", "A function calling itself", "An array method", "A class"], correct: 1, difficulty: 2 },
                { question: "What does JSON stand for?", answers: ["JavaScript Object Notation", "Java Standard Object Notation", "JavaScript Oriented Network", "Java Syntax Object Notation"], correct: 0, difficulty: 2 },
                { question: "What is the purpose of Git?", answers: ["Version control", "Code compilation", "Database management", "Web hosting"], correct: 0, difficulty: 2 },
                // Hard
                { question: "What is the space complexity of merge sort?", answers: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], correct: 2, difficulty: 3 },
                { question: "What design pattern ensures a class has only one instance?", answers: ["Factory", "Singleton", "Observer", "Strategy"], correct: 1, difficulty: 3 },
                { question: "What is a closure in JavaScript?", answers: ["A loop", "A function with access to outer scope", "A class", "An array method"], correct: 1, difficulty: 3 },
                { question: "What is the difference between TCP and UDP?", answers: ["TCP is reliable, UDP is not", "UDP is reliable, TCP is not", "No difference", "TCP is faster"], correct: 0, difficulty: 3 }
            ],
            history: [
                // Easy - Ancient & Classical History
                { question: "Which ancient civilization built the pyramids?", answers: ["Greeks", "Romans", "Egyptians", "Babylonians"], correct: 2, difficulty: 1 },
                { question: "Who was the first President of the United States?", answers: ["Thomas Jefferson", "George Washington", "John Adams", "Benjamin Franklin"], correct: 1, difficulty: 1 },
                { question: "In which year did World War II end?", answers: ["1944", "1945", "1946", "1947"], correct: 1, difficulty: 1 },
                { question: "What year did Columbus first reach the Americas?", answers: ["1490", "1491", "1492", "1493"], correct: 2, difficulty: 1 },
                { question: "Which empire was ruled by Julius Caesar?", answers: ["Greek", "Roman", "Persian", "Egyptian"], correct: 1, difficulty: 1 },
                { question: "Who was the first person to walk on the moon?", answers: ["Buzz Aldrin", "Neil Armstrong", "John Glenn", "Alan Shepard"], correct: 1, difficulty: 1 },
                { question: "In which year did the Titanic sink?", answers: ["1910", "1911", "1912", "1913"], correct: 2, difficulty: 1 },
                { question: "Which country gifted the Statue of Liberty to the USA?", answers: ["England", "Spain", "France", "Italy"], correct: 2, difficulty: 1 },
                { question: "Who was the British Prime Minister during most of WWII?", answers: ["Neville Chamberlain", "Winston Churchill", "Clement Attlee", "Anthony Eden"], correct: 1, difficulty: 1 },
                { question: "In which year did the American Civil War begin?", answers: ["1860", "1861", "1862", "1863"], correct: 1, difficulty: 1 },
                { question: "Which empire was ruled by Cleopatra?", answers: ["Roman", "Greek", "Egyptian", "Persian"], correct: 2, difficulty: 1 },
                { question: "What ancient wonder was located in Egypt?", answers: ["Hanging Gardens", "Colossus of Rhodes", "Great Pyramid", "Lighthouse of Alexandria"], correct: [2, 3], difficulty: 1 },
                { question: "Who founded the Mongol Empire?", answers: ["Kublai Khan", "Genghis Khan", "Tamerlane", "Attila"], correct: 1, difficulty: 1 },
                { question: "Which war was fought between Athens and Sparta?", answers: ["Persian Wars", "Peloponnesian War", "Punic Wars", "Trojan War"], correct: 1, difficulty: 1 },
                { question: "In what year did the Berlin Wall fall?", answers: ["1987", "1988", "1989", "1990"], correct: 2, difficulty: 1 },

                // Medium - Medieval & Renaissance
                { question: "Who painted the ceiling of the Sistine Chapel?", answers: ["Leonardo da Vinci", "Michelangelo", "Raphael", "Donatello"], correct: 1, difficulty: 2 },
                { question: "Which dynasty ruled China during the construction of the Forbidden City?", answers: ["Tang", "Song", "Ming", "Qing"], correct: 2, difficulty: 2 },
                { question: "Who wrote the Communist Manifesto?", answers: ["Vladimir Lenin", "Karl Marx", "Friedrich Engels", "Both Marx and Engels"], correct: [1, 2, 3], difficulty: 2 },
                { question: "What was the name of the ship that brought the Pilgrims to America?", answers: ["Mayflower", "Santa Maria", "Pinta", "Nina"], correct: 0, difficulty: 2 },
                { question: "Who was the first woman to win a Nobel Prize?", answers: ["Marie Curie", "Rosalind Franklin", "Dorothy Hodgkin", "Lise Meitner"], correct: 0, difficulty: 2 },
                { question: "What ancient city was destroyed by Mount Vesuvius?", answers: ["Rome", "Athens", "Pompeii", "Sparta"], correct: 2, difficulty: 2 },
                { question: "Who was known as the 'Iron Lady'?", answers: ["Queen Elizabeth II", "Margaret Thatcher", "Golda Meir", "Indira Gandhi"], correct: 1, difficulty: 2 },
                { question: "Whose crew first circumnavigated the globe?", answers: ["Christopher Columbus", "Vasco da Gama", "Ferdinand Magellan", "James Cook"], correct: 2, difficulty: 2 },
                { question: "What was the main cause of the Black Death?", answers: ["Bacteria", "Virus", "Fungus", "Parasite"], correct: 0, difficulty: 2 },
                { question: "Who was the Sun King of France?", answers: ["Louis XIII", "Louis XIV", "Louis XV", "Louis XVI"], correct: 1, difficulty: 2 },
                { question: "Which revolution began in 1789?", answers: ["American Revolution", "French Revolution", "Industrial Revolution", "Russian Revolution"], correct: 1, difficulty: 2 },
                { question: "Who invented the printing press?", answers: ["Johannes Gutenberg", "Leonardo da Vinci", "Galileo Galilei", "Isaac Newton"], correct: 0, difficulty: 2 },
                { question: "What was the capital of the Byzantine Empire?", answers: ["Rome", "Athens", "Constantinople", "Alexandria"], correct: 2, difficulty: 2 },
                { question: "Which empire was ruled by Akbar the Great?", answers: ["Ottoman", "Safavid", "Mughal", "Maratha"], correct: 2, difficulty: 2 },
                { question: "Who led the Hundred Years' War for France?", answers: ["Joan of Arc", "Charles VII", "Philip VI", "John II"], correct: 0, difficulty: 2 },

                // Hard - Complex Historical Events & Figures
                { question: "What was the name of the ship on which Charles Darwin made his voyage?", answers: ["HMS Victory", "HMS Beagle", "HMS Endeavour", "HMS Bounty"], correct: 1, difficulty: 3 },
                { question: "Who was the last Tsar of Russia?", answers: ["Alexander III", "Nicholas II", "Peter the Great", "Ivan the Terrible"], correct: 1, difficulty: 3 },
                { question: "What treaty ended World War I?", answers: ["Treaty of Versailles", "Treaty of Paris", "Treaty of Ghent", "Treaty of Vienna"], correct: 0, difficulty: 3 },
                { question: "Who was the Byzantine Emperor during the First Crusade?", answers: ["Justinian I", "Alexios I Komnenos", "Basil II", "Constantine VII"], correct: 1, difficulty: 3 },
                { question: "What was the name of the secret police in Nazi Germany?", answers: ["SS", "SA", "Gestapo", "Wehrmacht"], correct: 2, difficulty: 3 },
                { question: "Which battle is considered the turning point of the American Civil War?", answers: ["Bull Run", "Antietam", "Gettysburg", "Vicksburg"], correct: 2, difficulty: 3 },
                { question: "What was the name of the alliance between Germany, Austria-Hungary, and Italy before WWI?", answers: ["Triple Alliance", "Central Powers", "Axis Powers", "Triple Entente"], correct: 0, difficulty: 3 },
                { question: "Who was the Carthaginian general who crossed the Alps?", answers: ["Hamilcar", "Hannibal", "Hasdrubal", "Mago"], correct: 1, difficulty: 3 },
                { question: "Which Chinese philosopher founded Confucianism?", answers: ["Lao Tzu", "Confucius", "Mencius", "Sun Tzu"], correct: 1, difficulty: 3 },
                { question: "What was the name of the Aztec capital?", answers: ["Cusco", "Chichen Itza", "Tenochtitlan", "Tikal"], correct: 2, difficulty: 3 },
                { question: "Who was the first Holy Roman Emperor?", answers: ["Charlemagne", "Otto I", "Frederick Barbarossa", "Charles V"], correct: 0, difficulty: 3 },
                { question: "Which battle ended Napoleon's Hundred Days?", answers: ["Austerlitz", "Waterloo", "Leipzig", "Borodino"], correct: 1, difficulty: 3 },
                { question: "What was the name of the Inca road system?", answers: ["Qhapaq Ñan", "Camino Real", "Via Appia", "Silk Road"], correct: 0, difficulty: 3 },
                { question: "Who was the Pharaoh during the Exodus?", answers: ["Ramesses II", "Akhenaten", "Tutankhamun", "Thutmose III"], correct: 0, difficulty: 3 },
                { question: "Which treaty divided the Carolingian Empire?", answers: ["Treaty of Verdun", "Treaty of Mersen", "Treaty of Ribemont", "Treaty of Bonn"], correct: 0, difficulty: 3 }
            ],
            biology: [
                // Easy
                { question: "What is the basic unit of life?", answers: ["Tissue", "Cell", "Organ", "Organism"], correct: 1, difficulty: 1 },
                { question: "What do plants need to make their own food?", answers: ["Sunlight", "Water", "Carbon dioxide", "All of the above"], correct: 3, difficulty: 1 },
                { question: "Which part of the plant conducts photosynthesis?", answers: ["Roots", "Stem", "Leaves", "Flowers"], correct: 2, difficulty: 1 },
                { question: "What is the largest organ in the human body?", answers: ["Brain", "Liver", "Lungs", "Skin"], correct: 3, difficulty: 1 },
                { question: "How many legs do insects have?", answers: ["4", "6", "8", "10"], correct: 1, difficulty: 1 },
                { question: "What type of animal is a frog?", answers: ["Mammal", "Reptile", "Amphibian", "Fish"], correct: 2, difficulty: 1 },
                { question: "Which blood cells help fight infection?", answers: ["Red blood cells", "White blood cells", "Platelets", "Plasma"], correct: 1, difficulty: 1 },
                { question: "What is the green pigment in plants called?", answers: ["Chlorophyll", "Carotene", "Melanin", "Hemoglobin"], correct: 0, difficulty: 1 },
                { question: "What do we call animals that eat only plants?", answers: ["Carnivores", "Herbivores", "Omnivores", "Predators"], correct: 1, difficulty: 1 },
                { question: "Which organ sends signals to the brain to regulate breathing?", answers: ["Heart", "Lungs", "Stomach", "Liver"], correct: 1, difficulty: 1 },
                // Medium
                { question: "What is the process by which cells divide to create identical copies?", answers: ["Meiosis", "Mitosis", "Osmosis", "Diffusion"], correct: 1, difficulty: 2 },
                { question: "Which organelle is known as the powerhouse of the cell?", answers: ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"], correct: 2, difficulty: 2 },
                { question: "What is the scientific name for humans?", answers: ["Homo erectus", "Homo sapiens", "Homo habilis", "Homo neanderthalensis"], correct: 1, difficulty: 2 },
                { question: "Which system in the body is responsible for transporting nutrients?", answers: ["Nervous system", "Respiratory system", "Circulatory system", "Digestive system"], correct: 2, difficulty: 2 },
                { question: "What is the molecule that carries genetic information?", answers: ["RNA", "DNA", "Protein", "Lipid"], correct: 1, difficulty: 2 },
                { question: "Which part of the brain controls balance and coordination?", answers: ["Cerebrum", "Cerebellum", "Brainstem", "Hypothalamus"], correct: 1, difficulty: 2 },
                { question: "What is the process of water movement through plants called?", answers: ["Photosynthesis", "Respiration", "Transpiration", "Germination"], correct: 2, difficulty: 2 },
                { question: "Which type of blood vessel carries blood away from the heart?", answers: ["Veins", "Arteries", "Capillaries", "Venules"], correct: 1, difficulty: 2 },
                { question: "What is the study of heredity called?", answers: ["Ecology", "Genetics", "Anatomy", "Physiology"], correct: 1, difficulty: 2 },
                { question: "Which hormone regulates blood sugar levels?", answers: ["Adrenaline", "Insulin", "Thyroxine", "Growth hormone"], correct: 1, difficulty: 2 },
                // Hard
                { question: "What is the name of the process where RNA is made from DNA?", answers: ["Translation", "Transcription", "Replication", "Transformation"], correct: 1, difficulty: 3 },
                { question: "Which enzyme is responsible for unwinding DNA during replication?", answers: ["DNA polymerase", "Helicase", "Ligase", "Primase"], correct: 1, difficulty: 3 },
                { question: "What is the term for programmed cell death?", answers: ["Necrosis", "Apoptosis", "Mitosis", "Cytokinesis"], correct: 1, difficulty: 3 },
                { question: "Which structure in plant cells is responsible for maintaining turgor pressure?", answers: ["Cell wall", "Vacuole", "Chloroplast", "Nucleus"], correct: 1, difficulty: 3 },
                { question: "What is the Hardy-Weinberg principle used to calculate?", answers: ["Population growth", "Allele frequencies", "Mutation rates", "Selection pressure"], correct: 1, difficulty: 3 },
                { question: "Which type of RNA carries amino acids to the ribosome?", answers: ["mRNA", "tRNA", "rRNA", "snRNA"], correct: 1, difficulty: 3 },
                { question: "What is the name of the membrane that surrounds the lungs?", answers: ["Pericardium", "Peritoneum", "Pleura", "Meninges"], correct: 2, difficulty: 3 },
                { question: "Which metabolic pathway produces the most ATP?", answers: ["Glycolysis", "Krebs cycle", "Electron transport chain", "Fermentation"], correct: 2, difficulty: 3 }
            ],
            trivia: [
                // Easy
                { question: "What is the largest mammal in the world?", answers: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correct: 1, difficulty: 1 },
                { question: "How many continents are above water?", answers: ["5", "6", "7", "8"], correct: 2, difficulty: 1 },
                { question: "What is the capital of France?", answers: ["London", "Berlin", "Paris", "Madrid"], correct: 2, difficulty: 1 },
                { question: "What is the capital of Australia?", answers: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2, difficulty: 1 },
                { question: "Which animal is known as the 'King of the Jungle'?", answers: ["Tiger", "Lion", "Elephant", "Leopard"], correct: 1, difficulty: 1 },
                { question: "How many sides does a triangle have?", answers: ["2", "3", "4", "5"], correct: 1, difficulty: 1 },
                { question: "What color do you get when you mix red and white?", answers: ["Orange", "Pink", "Purple", "Yellow"], correct: 1, difficulty: 1 },
                { question: "Which planet is closest to the Sun?", answers: ["Venus", "Earth", "Mercury", "Mars"], correct: 2, difficulty: 1 },
                { question: "What is the largest ocean on Earth?", answers: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3, difficulty: 1 },
                { question: "How many days are in a leap year?", answers: ["365", "366", "367", "364"], correct: 1, difficulty: 1 },
                // Medium
                { question: "Which movie won the Academy Award for Best Picture in 2020?", answers: ["1917", "Parasite", "Joker", "Once Upon a Time in Hollywood"], correct: 1, difficulty: 2 },
                { question: "What is the smallest country in the world?", answers: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correct: 1, difficulty: 2 },
                { question: "Who wrote 'To Kill a Mockingbird'?", answers: ["Harper Lee", "Mark Twain", "Ernest Hemingway", "F. Scott Fitzgerald"], correct: 0, difficulty: 2 },
                { question: "What is the currency of Japan?", answers: ["Yuan", "Won", "Yen", "Rupee"], correct: 2, difficulty: 2 },
                { question: "Which composer wrote 'The Four Seasons'?", answers: ["Bach", "Mozart", "Vivaldi", "Beethoven"], correct: 2, difficulty: 2 },
                { question: "What is the tallest mountain in this list?", answers: ["K2", "Mount Everest", "Kangchenjunga", "Lhotse"], correct: 1, difficulty: 2 },
                { question: "Which country has the most time zones?", answers: ["France", "USA", "China", "Canada"], correct: 0, difficulty: 2 },
                { question: "What is the most spoken language in the world (total speakers)?", answers: ["English", "Mandarin Chinese", "Spanish", "Hindi"], correct: 0, difficulty: 2 },
                { question: "Which artist painted 'The Starry Night'?", answers: ["Picasso", "Van Gogh", "Monet", "Renoir"], correct: 1, difficulty: 2 },
                { question: "What is the longest river in the world?", answers: ["Amazon", "Nile", "Yangtze", "Mississippi"], correct: [0, 1], difficulty: 2 },
                // Hard
                { question: "What is the rarest blood type?", answers: ["AB-", "O-", "Rh-null", "B-"], correct: 2, difficulty: 3 },
                { question: "Which element has the chemical symbol 'Au'?", answers: ["Silver", "Gold", "Aluminum", "Argon"], correct: 1, difficulty: 3 },
                { question: "What is the capital of Bhutan?", answers: ["Thimphu", "Paro", "Punakha", "Jakar"], correct: 0, difficulty: 3 },
                { question: "Which author wrote '100 Years of Solitude'?", answers: ["Jorge Luis Borges", "Gabriel García Márquez", "Mario Vargas Llosa", "Octavio Paz"], correct: 1, difficulty: 3 },
                { question: "What is the smallest bone in the human body?", answers: ["Stapes", "Malleus", "Incus", "Hyoid"], correct: 0, difficulty: 3 },
                { question: "Which country has won the most FIFA World Cups?", answers: ["Germany", "Argentina", "Brazil", "Italy"], correct: 2, difficulty: 3 },
                { question: "What is the study of flags called?", answers: ["Vexillology", "Heraldry", "Philately", "Numismatics"], correct: 0, difficulty: 3 },
                { question: "Which philosopher wrote 'Thus Spoke Zarathustra'?", answers: ["Kant", "Hegel", "Nietzsche", "Schopenhauer"], correct: 2, difficulty: 3 },
                { question: "Which submerged continent is located near New Zealand?", answers: ["Doggerland", "Zealandia", "Sundaland", "Beringia"], correct: 1, difficulty: 3 },
                { question: "Doggerland was a landmass that connected which regions?", answers: ["Asia-America", "Britain-Europe", "Africa-Arabia", "Australia-Antarctica"], correct: 1, difficulty: 3 },
                // Impossible
                { question: "In what year did the HMS Britannia first set sail as a royal yacht?", answers: ["1953", "1954", "1955", "1956"], correct: 1, difficulty: 4 },
                { question: "What was the name of the cat that lived at 10 Downing Street from 2011-2020?", answers: ["Larry", "Palmerston", "Gladstone", "Humphrey"], correct: 0, difficulty: 4 },
                { question: "Which obscure 1970s band recorded the song 'Hocus Pocus'?", answers: ["Focus", "Gentle Giant", "King Crimson", "Van der Graaf Generator"], correct: 0, difficulty: 4 },
                { question: "What is the exact number of islands in Finland?", answers: ["188,000", "267,570", "188,000", "267,570"], correct: 0, difficulty: 4 },
                { question: "In what year was the can opener invented?", answers: ["1855", "1858", "1860", "1863"], correct: 1, difficulty: 4 },
                { question: "What was the original name of the band that became Led Zeppelin?", answers: ["The New Yardbirds", "The Heavy Metal Kids", "Garden Wall", "The Nobs"], correct: 0, difficulty: 4 },
                { question: "How many grooves are on a standard vinyl LP record?", answers: ["1", "2", "4", "Depends on the album"], correct: 0, difficulty: 4 },
                { question: "What is the name of the fear of long words?", answers: ["Hippopotomonstrosesquippedaliophobia", "Pneumonoultramicroscopicsilicovolcanoconiosisphobia", "Floccinaucinihilipilificationphobia", "Antidisestablishmentarianismphobia"], correct: 0, difficulty: 4 },
                { question: "What is the ISBN of the first Harry Potter book in its original UK edition?", answers: ["0-7475-3269-9", "0-439-70818-2", "0-7475-4215-5", "0-439-13959-7"], correct: 0, difficulty: 4 },
                { question: "In what year was the stapler invented?", answers: ["1866", "1877", "1888", "1899"], correct: 1, difficulty: 4 }
            ]
        };
    }
    bindEvents() {
        console.log('Binding events...');

        // Difficulty selection
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        console.log('Found difficulty buttons:', difficultyBtns.length);

        difficultyBtns.forEach(btn => {
            console.log('Adding listener to difficulty button:', btn);
            btn.addEventListener('click', (e) => {
                console.log('Difficulty button clicked:', e.currentTarget.dataset.mode);
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.gameMode = e.currentTarget.dataset.mode;
                this.setMaxDifficulty();
            });
        });

        // Question count selection
        const questionCountBtns = document.querySelectorAll('.question-count-btn');
        console.log('Found question count buttons:', questionCountBtns.length);

        questionCountBtns.forEach(btn => {
            console.log('Adding listener to question count button:', btn);
            btn.addEventListener('click', (e) => {
                console.log('Question count button clicked:', e.currentTarget.dataset.count);
                document.querySelectorAll('.question-count-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.selectedQuestionCount = parseInt(e.currentTarget.dataset.count);
                this.maxQuestions = this.selectedQuestionCount;
            });
        });

        // Subject selection
        const subjectBtns = document.querySelectorAll('.subject-btn');
        console.log('Found subject buttons:', subjectBtns.length);

        subjectBtns.forEach(btn => {
            console.log('Adding listener to subject button:', btn);
            btn.addEventListener('click', (e) => {
                console.log('Subject button clicked:', e.currentTarget.dataset.subject);
                this.currentSubject = e.currentTarget.dataset.subject;
                this.startQuiz();
            });
        });

        // File upload (optional - only if elements exist)
        const uploadBtn = document.getElementById('upload-btn');
        const quizUpload = document.getElementById('quiz-upload');
        
        if (uploadBtn && quizUpload) {
            uploadBtn.addEventListener('click', () => {
                quizUpload.click();
            });

            quizUpload.addEventListener('change', (e) => {
                this.handleFileUpload(e);
            });
        }

        // Game controls
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextQuestion();
                this.scrollToQuestion();
            });
        }

        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.playAgain();
            });
        }

        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                this.goHome();
            });
        }

        // History controls (optional)
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.clearHistory();
            });
        }

        // AI Competitor selection
        const aiButtons = document.querySelectorAll('.ai-competitor-btn');
        this.log('Found AI competitor buttons:', aiButtons.length);
        aiButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const aiType = e.currentTarget.dataset.ai;
                this.log('AI battle started with:', aiType);
                this.startAIBattle(aiType);
            });
        });

        // Special Game Mode buttons
        const survivalBtn = document.getElementById('survival-mode-btn');
        if (survivalBtn) {
            survivalBtn.addEventListener('click', () => this.startSurvivalMode());
        }

        const lightningBtn = document.getElementById('lightning-mode-btn');
        if (lightningBtn) {
            lightningBtn.addEventListener('click', () => this.startLightningRound());
        }

        const suddenDeathBtn = document.getElementById('sudden-death-btn');
        if (suddenDeathBtn) {
            suddenDeathBtn.addEventListener('click', () => this.startSuddenDeath());
        }

        const bossRushBtn = document.getElementById('boss-rush-btn');
        if (bossRushBtn) {
            bossRushBtn.addEventListener('click', () => this.startBossRush());
        }

        // Power-up buttons
        document.getElementById('powerup-5050')?.addEventListener('click', () => this.usePowerup('5050'));
        document.getElementById('powerup-skip')?.addEventListener('click', () => this.usePowerup('skip'));
        document.getElementById('powerup-life')?.addEventListener('click', () => this.usePowerup('life'));
        document.getElementById('powerup-time')?.addEventListener('click', () => this.usePowerup('time'));

        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screen = e.currentTarget.dataset.screen;
                this.navigateToScreen(screen);
            });
        });

        // Shop category buttons
        document.querySelectorAll('.shop-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.shop-category-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const category = e.currentTarget.dataset.category;
                this.renderShopCategory(category);
            });
        });

        // Inventory tabs
        document.querySelectorAll('.inventory-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.inventory-tab').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const tab = e.currentTarget.dataset.tab;
                this.renderInventory(tab);
            });
        });

        // Custom Quiz buttons
        const addCustomBtn = document.getElementById('add-custom-question');
        if (addCustomBtn) {
            addCustomBtn.addEventListener('click', () => this.addCustomQuestion());
        }

        const playCustomBtn = document.getElementById('play-custom-quiz');
        if (playCustomBtn) {
            playCustomBtn.addEventListener('click', () => this.playCustomQuiz());
        }

        // Upload quiz button
        const uploadQuizBtn = document.getElementById('upload-quiz-btn');
        if (uploadQuizBtn) {
            uploadQuizBtn.addEventListener('click', () => {
                document.getElementById('quiz-upload-input').click();
            });
        }

        const quizUploadInput = document.getElementById('quiz-upload-input');
        if (quizUploadInput) {
            quizUploadInput.addEventListener('change', (e) => this.handleQuizUpload(e));
        }

        // Daily challenge button
        const startDailyBtn = document.getElementById('start-daily');
        if (startDailyBtn) {
            startDailyBtn.addEventListener('click', () => this.startDailyChallenge(0));
        }

        const startTenDayBtn = document.getElementById('start-ten-day');
        if (startTenDayBtn) {
            startTenDayBtn.addEventListener('click', () => this.startMultiDayChallenge(10));
        }

        const startTwentyDayBtn = document.getElementById('start-twenty-day');
        if (startTwentyDayBtn) {
            startTwentyDayBtn.addEventListener('click', () => this.startMultiDayChallenge(20));
        }

        const startMonthlyBtn = document.getElementById('start-monthly');
        if (startMonthlyBtn) {
            startMonthlyBtn.addEventListener('click', () => this.startMultiDayChallenge(30));
        }

        // Settings button
        const settingsBtn = document.getElementById('nav-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }

        // Close settings button
        const closeSettings = document.getElementById('close-settings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => this.closeSettings());
        }

        // Settings modal toggles sync
        const settingsTheme = document.getElementById('settings-theme-toggle');
        const settingsSound = document.getElementById('settings-sound-toggle');
        const settingsTimer = document.getElementById('settings-timer-toggle');
        const settingsCurveball = document.getElementById('settings-curveball-toggle');
        const settingsStudy = document.getElementById('settings-study-toggle');
        const settingsInfiniteHeart = document.getElementById('settings-infinite-heart-toggle');

        if (settingsTheme) {
            settingsTheme.addEventListener('change', () => this.toggleTheme());
        }
        if (settingsSound) {
            settingsSound.addEventListener('change', () => this.toggleSound());
        }
        if (settingsTimer) {
            settingsTimer.addEventListener('change', () => this.toggleTimer());
        }
        if (settingsCurveball) {
            settingsCurveball.addEventListener('change', () => this.toggleCurveballs());
        }
        if (settingsStudy) {
            settingsStudy.addEventListener('change', () => this.toggleStudyMode());
        }
        if (settingsInfiniteHeart) {
            settingsInfiniteHeart.addEventListener('change', () => this.toggleInfiniteHeart());
        }

        // Reset progress button
        const resetBtn = document.getElementById('reset-progress-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetProgress());
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        const clearDataBtn = document.getElementById('clear-data-btn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.clearAllData());
        }
    }

    setMaxDifficulty() {
        switch (this.gameMode) {
            case 'easy':
                this.maxDifficulty = 1;
                break;
            case 'medium':
                this.maxDifficulty = 2;
                break;
            case 'hard':
                this.maxDifficulty = 4;
                break;
        }
    }

    playAgain() {
        this.resetGame();
        this.startQuiz();
    }

    goHome() {
        this.resetGame();
        this.showScreen('home-screen');
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.split('.').pop();

        console.log('Uploading file:', fileName, 'Extension:', fileExtension);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let questions = [];

                switch (fileExtension) {
                    case 'json':
                        questions = this.parseJSON(content);
                        break;
                    case 'csv':
                        questions = this.parseCSV(content);
                        break;
                    case 'txt':
                        questions = this.parseTXT(content);
                        break;
                    case 'yaml':
                    case 'yml':
                        questions = this.parseYAML(content);
                        break;
                    default:
                        alert('Unsupported file format. Please use JSON, CSV, TXT, or YAML.');
                        return;
                }

                if (questions && questions.length > 0) {
                    const categoryName = this.promptForCategoryName(file.name);
                    if (categoryName) {
                        this.saveCustomCategory(categoryName, questions);
                        this.renderCustomCategories();
                        alert(`Successfully created "${categoryName}" category with ${questions.length} questions!`);
                    }
                } else {
                    alert('No valid questions found in the file.');
                }
            } catch (error) {
                console.error('Error parsing file:', error);
                alert(`Error reading file: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }

    parseJSON(content) {
        const data = JSON.parse(content);
        if (data.questions && Array.isArray(data.questions)) {
            return data.questions.filter(q => this.validateQuestion(q));
        }
        throw new Error('Invalid JSON format. Expected {questions: [...]}');
    }

    parseCSV(content) {
        const lines = content.trim().split('\n');
        const questions = [];

        // Skip header if it looks like one
        const startIndex = lines[0].toLowerCase().includes('question') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Parse CSV line (handle quoted fields)
            const fields = this.parseCSVLine(line);

            if (fields.length >= 7) {
                const question = {
                    question: fields[0],
                    answers: [fields[1], fields[2], fields[3], fields[4]],
                    correct: parseInt(fields[5]) || 0,
                    difficulty: parseInt(fields[6]) || 1
                };

                if (this.validateQuestion(question)) {
                    questions.push(question);
                }
            }
        }

        return questions;
    }

    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        fields.push(current.trim());
        return fields;
    }

    parseTXT(content) {
        const lines = content.trim().split('\n');
        const questions = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Format: Question|Answer1|Answer2|Answer3|Answer4|CorrectIndex|Difficulty
            const parts = trimmed.split('|');

            if (parts.length >= 7) {
                const question = {
                    question: parts[0].trim(),
                    answers: [
                        parts[1].trim(),
                        parts[2].trim(),
                        parts[3].trim(),
                        parts[4].trim()
                    ],
                    correct: parseInt(parts[5]) || 0,
                    difficulty: parseInt(parts[6]) || 1
                };

                if (this.validateQuestion(question)) {
                    questions.push(question);
                }
            }
        }

        return questions;
    }

    parseYAML(content) {
        // Simple YAML parser for basic quiz format
        const questions = [];
        const lines = content.split('\n');
        let currentQuestion = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('- question:')) {
                if (currentQuestion && this.validateQuestion(currentQuestion)) {
                    questions.push(currentQuestion);
                }
                currentQuestion = {
                    question: line.replace('- question:', '').trim().replace(/['"]/g, ''),
                    answers: [],
                    correct: 0,
                    difficulty: 1
                };
            } else if (line.startsWith('answers:') && currentQuestion) {
                // Next lines should be the answers
                for (let j = i + 1; j < lines.length && j < i + 5; j++) {
                    const answerLine = lines[j].trim();
                    if (answerLine.startsWith('- ')) {
                        currentQuestion.answers.push(answerLine.replace('- ', '').replace(/['"]/g, ''));
                    } else {
                        break;
                    }
                }
            } else if (line.startsWith('correct:') && currentQuestion) {
                currentQuestion.correct = parseInt(line.replace('correct:', '').trim()) || 0;
            } else if (line.startsWith('difficulty:') && currentQuestion) {
                currentQuestion.difficulty = parseInt(line.replace('difficulty:', '').trim()) || 1;
            }
        }

        // Add the last question
        if (currentQuestion && this.validateQuestion(currentQuestion)) {
            questions.push(currentQuestion);
        }

        return questions;
    }

    validateQuestion(question) {
        return question &&
            question.question &&
            question.answers &&
            Array.isArray(question.answers) &&
            question.answers.length === 4 &&
            typeof question.correct === 'number' &&
            question.correct >= 0 &&
            question.correct < 4 &&
            typeof question.difficulty === 'number' &&
            question.difficulty >= 1 &&
            question.difficulty <= 4;
    }

    startQuiz() {
        this.resetGame();
        this.setMaxDifficulty();
        this.maxQuestions = this.selectedQuestionCount;
        this.prepareQuestions();
        this.startTime = new Date();
        this.updateCheatStatus();

        // Reset debt processing flag
        this._debtProcessedThisSession = false;

        // Start timer if enabled
        this.startQuizTimer();

        // Reset multiplier
        this.currentMultiplier = 1;
        this.streakForMultiplier = 0;
        this.updateMultiplierDisplay();

        this.showScreen('quiz-screen');
        this.updatePowerupDisplay();
        this.displayQuestion();
    }

    prepareQuestions() {
        let baseQuestions = [];

        if (this.currentSubject === 'custom') {
            baseQuestions = [...this.customQuestions];
        } else if (this.currentSubject === 'all') {
            Object.values(this.questionBank).forEach(subjectQuestions => {
                baseQuestions.push(...subjectQuestions);
            });
        } else {
            baseQuestions = [...this.questionBank[this.currentSubject]];
        }

        // First pass: add all unique questions
        this.questions = this.shuffleArray([...baseQuestions]);

        // If we need more questions, mark additional ones as curveballs (if enabled)
        if (this.questions.length < this.maxQuestions) {
            const needed = this.maxQuestions - this.questions.length;
            const additionalQuestions = [];

            for (let i = 0; i < needed; i++) {
                const originalQuestion = baseQuestions[i % baseQuestions.length];
                const curveballQuestion = {
                    ...originalQuestion,
                    isCurveball: this.curveballsEnabled // Only mark as curveball if setting is enabled
                };
                additionalQuestions.push(curveballQuestion);
            }

            this.questions.push(...additionalQuestions);
            this.questions = this.shuffleArray(this.questions);
        } else {
            // Trim to exact length if we have too many
            this.questions = this.questions.slice(0, this.maxQuestions);
        }

        // Reset used flags
        this.questions.forEach(q => q.used = false);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    displayQuestion() {
        // For AI battles, check if battle should end
        if (this.isAIBattle) {
            // Hacker: ends when question count reached OR someone loses all lives
            if (this.currentAI === 'hacker') {
                if (this.questionsAnswered >= this.maxQuestions || this.aiLives <= 0 || this.lives <= 0) {
                    this.endAIBattle();
                    return;
                }
            } else {
                // Other AIs: ends when someone loses all lives OR max questions reached
                if (this.questionsAnswered >= this.maxQuestions) {
                    // Max questions reached - end battle
                    this.endAIBattle();
                    return;
                }
                if (this.lives <= 0) {
                    // Player lost - end immediately
                    this.endAIBattle();
                    return;
                }
                if (this.aiLives <= 0) {
                    // AI lost all lives - player wins immediately
                    this.endAIBattle();
                    return;
                }
            }
        } else {
            // Check if we've reached the win condition (selected question count)
            if (this.questionsAnswered >= this.maxQuestions) {
                this.endGame(true);
                return;
            }
        }

        // Get next question
        let currentQuestion = this.getCurrentDifficultyQuestion();

        if (!currentQuestion) {
            this.endGame(true);
            return;
        }

        // Check if question is marked as curveball OR if it's time for a random curveball
        const isMarkedCurveball = currentQuestion.isCurveball === true;
        const isRandomCurveball = !isMarkedCurveball && this.shouldShowCurveball();

        this.isCurveball = isMarkedCurveball || isRandomCurveball;

        // If it's a random curveball (not marked), get a curveball question instead
        if (isRandomCurveball) {
            // Mark current question as unused so it can be used later
            currentQuestion.used = false;
            currentQuestion = this.getCurveballQuestion();
        }

        // Show/hide curveball alert
        if (this.isCurveball) {
            document.getElementById('curveball-alert').classList.remove('hidden');
        } else {
            document.getElementById('curveball-alert').classList.add('hidden');
        }

        const questionText = document.getElementById('question-text');
        if (questionText) questionText.textContent = currentQuestion.question;

        const livesDisplay = document.getElementById('lives-display');
        if (livesDisplay) livesDisplay.textContent = '❤️'.repeat(this.lives);

        const scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) scoreDisplay.textContent = this.score;

        const progressDisplay = document.getElementById('progress-display');
        if (progressDisplay) {
            if (this.isAIBattle && this.currentAI === 'hacker') {
                // Hacker shows question count (speed race)
                progressDisplay.textContent = `${this.questionsAnswered + 1}/${this.maxQuestions}`;
            } else if (this.isAIBattle) {
                // Other AI battles show round number
                progressDisplay.textContent = `Round ${this.questionsAnswered + 1}`;
            } else {
                // Normal quiz shows current question number (questionsAnswered + 1)
                progressDisplay.textContent = `${this.questionsAnswered + 1}/${this.maxQuestions}`;
            }
        }

        const difficultyDisplay = document.getElementById('difficulty-display');
        if (difficultyDisplay) difficultyDisplay.textContent = this.difficulty;

        const answersContainer = document.getElementById('answers-container');
        if (!answersContainer) {
            console.error('answers-container not found!');
            return;
        }

        answersContainer.innerHTML = '';

        console.log('Current question:', currentQuestion);
        console.log('Answers:', currentQuestion.answers);

        if (!currentQuestion.answers || currentQuestion.answers.length === 0) {
            console.error('No answers found for question!');
            return;
        }

        // Shuffle answers to prevent pattern recognition
        const shuffledAnswers = currentQuestion.answers.map((answer, index) => ({ answer, originalIndex: index }));

        // Fisher-Yates shuffle
        for (let i = shuffledAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
        }

        // Find new position of correct answer
        // Safety check: ensure question has a correct answer
        if (currentQuestion.correct === undefined || currentQuestion.correct === null) {
            console.error('Question has no correct answer!', currentQuestion);
            currentQuestion.correct = 0; // Default to first answer
        }

        const correctAnswers = Array.isArray(currentQuestion.correct) ? currentQuestion.correct : [currentQuestion.correct];
        const newCorrectIndices = shuffledAnswers
            .map((item, newIndex) => correctAnswers.includes(item.originalIndex) ? newIndex : -1)
            .filter(index => index !== -1);
        const newCorrectIndex = newCorrectIndices.length === 1 ? newCorrectIndices[0] : newCorrectIndices;

        console.log('Question correct answer:', currentQuestion.correct, 'New correct index:', newCorrectIndex);

        // Study Mode: Show correct answer and disable clicking (custom quizzes only)
        const isStudyMode = this.studyMode && this.currentSubject === 'custom';

        shuffledAnswers.forEach((item, index) => {
            const button = document.createElement('button');
            button.className = 'answer-btn';

            // Show correct answer if cheat code is active OR study mode (custom only)
            const isCorrectAnswer = Array.isArray(newCorrectIndex) ? newCorrectIndex.includes(index) : newCorrectIndex === index;

            if (isStudyMode && isCorrectAnswer) {
                // Study mode: Show correct answer with green highlight
                button.textContent = item.answer + ' ✓ CORRECT';
                button.style.border = '3px solid #4CAF50';
                button.style.background = 'rgba(76, 175, 80, 0.2)';
                button.classList.add('correct');
                button.disabled = true;
            } else if (this.cheatCodeActive && isCorrectAnswer) {
                // Cheat code: Show with marker
                button.textContent = item.answer + ' ✓';
                button.style.border = '3px solid #00ff00';
                button.style.boxShadow = '0 0 10px #00ff00';
            } else if (isStudyMode) {
                // Study mode: Disable wrong answers
                button.textContent = item.answer;
                button.disabled = true;
                button.style.opacity = '0.5';
            } else {
                button.textContent = item.answer;
            }

            button.style.display = 'block'; // Force display
            button.style.visibility = 'visible'; // Force visibility

            if (!isStudyMode) {
                button.addEventListener('click', () => this.selectAnswer(index, newCorrectIndex));
            }

            answersContainer.appendChild(button);
            console.log('Added button:', index, item.answer);
        });

        // In study mode, show a "Next Question" button immediately
        if (isStudyMode) {
            const nextBtn = document.createElement('button');
            nextBtn.textContent = '➡️ Next Question';
            nextBtn.className = 'next-question-btn';
            nextBtn.style.cssText = 'margin-top: 20px; padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 10px; font-size: 1.1rem; cursor: pointer; font-weight: bold;';
            nextBtn.addEventListener('click', () => {
                this.currentQuestionIndex++;
                this.displayQuestion();
            });
            answersContainer.appendChild(nextBtn);
        }

        console.log('Total buttons added:', answersContainer.children.length);

        document.getElementById('feedback').classList.add('hidden');

        // Auto-scroll to question
        setTimeout(() => this.scrollToQuestion(), 100);

        // If AI battle, start AI answering
        if (this.isAIBattle) {
            this.displayAIQuestion(currentQuestion);
            this.scheduleAIAnswer(currentQuestion);
        }
    }

    shouldShowCurveball() {
        // Check if curveballs are enabled in settings
        if (!this.curveballsEnabled) {
            return false;
        }

        return this.questionsAnswered > 0 &&
            this.questionsAnswered % 5 === 0 &&
            this.score >= 3 &&
            this.currentSubject !== 'all' &&
            this.currentSubject !== 'custom';
    }

    getCurveballQuestion() {
        const otherSubjects = Object.keys(this.questionBank).filter(s => s !== this.currentSubject);
        const randomSubject = otherSubjects[Math.floor(Math.random() * otherSubjects.length)];
        const subjectQuestions = this.questionBank[randomSubject];

        // For trivia curveballs, try impossible questions first, then hard
        let availableQuestions;
        if (randomSubject === 'trivia') {
            const impossibleQuestions = subjectQuestions.filter(q => q.difficulty === 4);
            const hardQuestions = subjectQuestions.filter(q => q.difficulty === 3);
            availableQuestions = impossibleQuestions.length > 0 ? impossibleQuestions :
                hardQuestions.length > 0 ? hardQuestions :
                    subjectQuestions.filter(q => q.difficulty >= 2);
        } else {
            // For other subjects, use hard questions (difficulty 3) for curveballs
            const hardQuestions = subjectQuestions.filter(q => q.difficulty === 3);
            availableQuestions = hardQuestions.length > 0 ? hardQuestions : subjectQuestions.filter(q => q.difficulty >= 2);
        }

        return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    }

    getCurrentDifficultyQuestion() {
        // Get next unused question from the prepared questions array
        const availableQuestions = this.questions.filter(q => !q.used);

        if (availableQuestions.length === 0) {
            return null;
        }

        // For regular quizzes, try to match difficulty progression
        // For daily challenges and custom quizzes, just use any available question
        let question;

        if (!this.isDailyChallenge && this.currentSubject !== 'custom') {
            // Sudden Death: ONLY hard/insane questions (difficulty 3-4)
            if (this.isSuddenDeath) {
                const hardQuestions = availableQuestions.filter(q => q.difficulty >= 3);
                if (hardQuestions.length > 0) {
                    question = hardQuestions[Math.floor(Math.random() * hardQuestions.length)];
                } else {
                    // Fallback if no hard questions available
                    question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
                }
            } else {
                // Try to find a question matching current difficulty
                const matchingDifficulty = availableQuestions.filter(q =>
                    q.difficulty <= Math.min(this.difficulty, this.maxDifficulty)
                );

                if (matchingDifficulty.length > 0) {
                    question = matchingDifficulty[Math.floor(Math.random() * matchingDifficulty.length)];
                } else {
                    // If no matching difficulty, use any available question
                    question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
                }
            }
        } else {
            // For daily challenges and custom quizzes, use questions in order
            question = availableQuestions[0];
        }

        question.used = true;
        return question;
    }

    selectAnswer(selectedIndex, correctIndex) {
        console.log('selectAnswer called:', { selectedIndex, correctIndex });

        const answerButtons = document.querySelectorAll('.answer-btn');
        answerButtons.forEach(btn => btn.disabled = true);

        // Handle both single correct answer and multiple correct answers
        // correctIndex can be a number (single answer) or array (multiple correct answers)
        // Safety check: if correctIndex is undefined, default to 0
        if (correctIndex === undefined || correctIndex === null) {
            console.error('correctIndex is undefined! Defaulting to 0');
            correctIndex = 0;
        }

        const correctAnswers = Array.isArray(correctIndex) ? correctIndex : [correctIndex];
        const isCorrect = correctAnswers.includes(selectedIndex);

        console.log('Correct answers:', correctAnswers, 'Is correct:', isCorrect);

        // In AI battles, DON'T show the correct answer to prevent cheating
        if (!this.isAIBattle) {
            // Mark all correct answers as correct (only in non-AI battles)
            correctAnswers.forEach(index => {
                answerButtons[index].classList.add('correct');
            });
        } else {
            // In AI battles, only show if the player's answer was correct
            if (isCorrect) {
                answerButtons[selectedIndex].classList.add('correct');
            }
        }

        // Mark selected answer as incorrect if it's wrong
        if (!isCorrect) {
            answerButtons[selectedIndex].classList.add('incorrect');
        }

        // Count all answers toward progress (needed for game flow)
        this.questionsAnswered++;

        if (isCorrect) {
            // Calculate base points
            const basePoints = this.isCurveball ? 3 : 1;

            // Update multiplier streak
            this.streakForMultiplier++;
            this.updateMultiplier();

            // Apply multiplier
            const pointsEarned = Math.floor(basePoints * this.currentMultiplier);
            this.score += pointsEarned;

            // Show multiplier feedback if active
            if (this.currentMultiplier > 1) {
                this.showMultiplierFeedback(pointsEarned, basePoints);
            }

            this.showFeedback(this.getPositiveFeedback(), true);

            // Update combo
            this.updateCombo(true);

            // Increase difficulty every 3 correct answers, but respect game mode limits
            if (this.questionsAnswered % 3 === 0) {
                this.difficulty = Math.min(this.maxDifficulty, this.difficulty + 1);
            }
        } else {
            // Deduct lives (unless infinite lives is active)
            if (!this.infiniteLives) {
                const livesLost = this.isCurveball ? 3 : 1;
                this.lives -= livesLost;
            }

            this.showFeedback(this.getNegativeFeedback(), false);

            // Reset combo and multiplier
            this.updateCombo(false);
            this.resetMultiplier();

            if (this.lives <= 0 && !this.infiniteLives) {
                console.log('=== GAME OVER: Lives = 0 ===');
                // Hide the next button when game is over
                const nextBtn = document.getElementById('next-btn');
                if (nextBtn) {
                    nextBtn.style.display = 'none';
                    console.log('Next button hidden');
                }

                if (this.isAIBattle) {
                    console.log('Ending AI battle in 2 seconds');
                    setTimeout(() => this.endAIBattle(), 2000);
                } else {
                    console.log('Ending game (loss) in 2 seconds');
                    setTimeout(() => this.endGame(false), 2000);
                }
                return;
            }
        }

        this.currentQuestionIndex++;

        // Check if AI lost all lives in AI battle
        if (this.isAIBattle && this.aiLives <= 0) {
            setTimeout(() => this.endAIBattle(), 2000);
            return;
        }
    }

    showFeedback(message, isCorrect) {
        const feedbackEl = document.getElementById('feedback');
        const feedbackText = document.getElementById('feedback-text');
        const nextBtn = document.getElementById('next-btn');

        if (feedbackText) feedbackText.textContent = message;

        if (feedbackEl) {
            feedbackEl.classList.remove('hidden', 'feedback-correct', 'feedback-incorrect');
            feedbackEl.classList.add(isCorrect ? 'feedback-correct' : 'feedback-incorrect');
        }

        // Show next button (unless game is over)
        if (nextBtn) {
            nextBtn.style.display = 'block';
        }

        // Play sound effect
        this.playSound(isCorrect ? 'correct' : 'incorrect');
    }

    getPositiveFeedback() {
        const messages = [
            "At least you know that one!",
            "Lucky guess or actual knowledge?",
            "Not bad, not bad at all.",
            "Impressive! You might actually survive this.",
            "Well, well... someone's been studying.",
            "Correct! The bar is set pretty low though.",
            "Right answer! Don't let it go to your head.",
            "Good job! Even a broken clock is right twice a day."
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getNegativeFeedback() {
        const messages = [
            "Ouch! That's gotta hurt.",
            "Wrong! But hey, participation trophy?",
            "Nope! Back to school for you.",
            "Incorrect! Did you even try?",
            "Wrong answer! Google is your friend.",
            "Bzzt! Better luck next time.",
            "Nah, that's not it chief.",
            "Wrong! But don't worry, we all make mistakes... some more than others."
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    nextQuestion() {
        // Prevent next question if battle/game should be over
        if (this.isAIBattle && (this.aiLives <= 0 || this.lives <= 0)) {
            this.log('Battle should be over, preventing next question');
            return;
        }

        if (this.lives <= 0 && !this.infiniteLives) {
            this.log('Game should be over, preventing next question');
            return;
        }

        this.displayQuestion();
        this.scrollToQuestion();
    }

    scrollToQuestion() {
        // Scroll to the top of the question container
        const questionContainer = document.querySelector('.question-container');
        if (questionContainer) {
            questionContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    // Power-ups System
    usePowerup(type) {
        const count = this.powerups[type] || 0;

        if (count <= 0) {
            alert('You don\'t have any of this power-up! Buy it from the shop.');
            return;
        }

        // Use the powerup
        this.activatePowerup(type);

        // Decrease count (one-time use)
        this.powerups[type]--;
        this.savePowerups();
        this.updatePowerupDisplay();
    }

    activatePowerup(type) {
        switch (type) {
            case '5050':
                this.use5050();
                break;
            case 'skip':
                this.useSkip();
                break;
            case 'life':
                this.useExtraLife();
                break;
            case 'infinite_life':
                this.useInfiniteLife();
                break;
            case 'time':
                this.useFreezeTime();
                break;
        }
    }

    use5050() {
        const answerButtons = document.querySelectorAll('.answer-btn');
        const currentQuestion = this.getCurrentDifficultyQuestion();
        if (!currentQuestion) return;

        const correctAnswers = Array.isArray(currentQuestion.correct) ? currentQuestion.correct : [currentQuestion.correct];

        let wrongAnswers = [];
        answerButtons.forEach((btn, index) => {
            if (!correctAnswers.includes(index)) {
                wrongAnswers.push(index);
            }
        });

        // Remove 2 wrong answers
        const toRemove = wrongAnswers.slice(0, 2);
        toRemove.forEach(index => {
            answerButtons[index].style.display = 'none';
        });

        this.showPowerupFeedback('🎯 50/50 Used! 2 wrong answers removed!');
    }

    useSkip() {
        this.showPowerupFeedback('⏭️ Question Skipped!');
        setTimeout(() => {
            this.nextQuestion();
        }, 1000);
    }

    useExtraLife() {
        this.lives++;
        const livesDisplay = document.getElementById('lives-display');
        if (livesDisplay) livesDisplay.textContent = '❤️'.repeat(this.lives);
        this.showPowerupFeedback('❤️ +1 Life!');
    }

    useInfiniteLife() {
        this.infiniteLives = true;
        this.showPowerupFeedback('💖 Infinite Lives Activated Forever!');
    }

    useFreezeTime() {
        this.showPowerupFeedback('⏰ Time power-up activated!');
    }

    showPowerupFeedback(message) {
        const feedback = document.createElement('div');
        feedback.className = 'powerup-feedback';
        feedback.textContent = message;
        document.body.appendChild(feedback);

        setTimeout(() => feedback.classList.add('show'), 100);
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => document.body.removeChild(feedback), 300);
        }, 2000);
    }

    updatePowerupDisplay() {
        // Update button states based on count
        Object.keys(this.powerups).forEach(type => {
            const btn = document.getElementById(`powerup-${type}`);
            const countEl = document.getElementById(`count-${type}`);
            const count = this.powerups[type] || 0;

            if (btn && countEl) {
                countEl.textContent = count;

                if (count > 0) {
                    btn.classList.add('owned');
                    btn.classList.remove('locked');
                    btn.disabled = false;
                    btn.title = `${this.getPowerupName(type)} - ${count} available`;
                } else {
                    btn.classList.remove('owned');
                    btn.classList.add('locked');
                    btn.disabled = true;
                    btn.title = `${this.getPowerupName(type)} - Buy from shop`;
                }
            }
        });
    }

    // Navigation System
    navigateToScreen(screenId) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screenId);
        });

        // Show screen
        this.showScreen(screenId);

        // Render screen content
        switch (screenId) {
            case 'shop-screen':
                this.renderShopCategory('powerups');
                break;
            case 'avatar-screen':
                this.renderInventory('faces');
                this.renderAvatarPreview();
                this.renderAvatarProgression();
                break;
            case 'achievements-screen':
                this.renderAchievementsScreen();
                break;
            case 'profile-screen':
                this.renderProfileScreen();
                break;
            case 'improvement-screen':
                this.renderImprovementScreen();
                break;
            case 'daily-screen':
                this.renderDailyChallengesScreen();
                break;
            case 'ai-pvp-screen':
                this.renderAIPvPScreen();
                break;
            case 'custom-screen':
                this.renderCustomQuizScreen();
                break;
        }

        // Update points display
        this.updateNavPoints();
    }

    updateNavPoints() {
        const navPoints = document.getElementById('nav-points');
        if (navPoints) {
            navPoints.textContent = `💰 ${this.playerData.totalScore}`;
        }
    }

    updateCoinsDisplay() {
        const navCoins = document.getElementById('nav-coins');
        if (navCoins) {
            const coins = this.playerData.coins || 0;
            navCoins.textContent = `🪙 ${coins}`;
        }
    }

    // Shop System
    renderShopCategory(category) {
        const container = document.getElementById('shop-items');
        if (!container) return;

        const items = this.shopItems[category] || [];
        container.innerHTML = '';

        // Special handling for currency exchange
        if (category === 'currency') {
            this.renderCoinExchange(container);
            return;
        }

        items.forEach(item => {
            const isOwned = this.isItemOwned(item);
            const canAfford = this.playerData.totalScore >= item.price;

            // Check heart purchase limit
            let heartLimitReached = false;
            let heartLimitText = '';
            if (item.type === 'powerup' && (item.id === 'life' || item.id === 'infinite_life')) {
                const currentLevel = this.calculateLevel();
                if (this.playerData.lastHeartPurchaseLevel !== currentLevel) {
                    this.playerData.heartsPurchasedThisLevel = 0;
                }

                if (this.playerData.heartsPurchasedThisLevel >= 1) {
                    heartLimitReached = true;
                    heartLimitText = `<div class="shop-item-desc" style="color: #ff6b6b;">⚠️ 1 heart per level (Next at Lvl ${currentLevel + 1})</div>`;
                }
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';

            // Special handling for Infinite Heart refund button
            const isInfiniteHeart = item.id === 'infinite_life';
            const hasInfiniteHeart = isInfiniteHeart && isOwned;

            itemDiv.innerHTML = `
                <div class="shop-item-icon">${item.icon}</div>
                <div class="shop-item-name">${item.name}</div>
                ${item.desc ? `<div class="shop-item-desc">${item.desc}</div>` : ''}
                ${item.achievement ? `<div class="shop-item-desc">🏆 ${item.achievement}</div>` : ''}
                ${heartLimitText}
                <div class="shop-item-price">${item.price > 0 ? `💰 ${item.price}` : 'Achievement Reward'}</div>
                <button class="shop-item-btn ${isOwned ? 'owned' : (heartLimitReached || (!canAfford && item.price > 0) ? 'locked' : '')}" 
                        ${isOwned || heartLimitReached ? 'disabled' : ''}>
                    ${isOwned ? 'Owned' : (heartLimitReached ? 'Limit Reached' : (item.price > 0 ? 'Buy' : 'Locked'))}
                </button>
                ${hasInfiniteHeart ? '<button class="shop-item-btn" style="background: #ff6b6b; margin-top: 10px;">Refund (18,000 pts)</button>' : ''}
            `;

            const btn = itemDiv.querySelector('.shop-item-btn');
            if (!isOwned && !heartLimitReached && canAfford && item.price > 0) {
                btn.addEventListener('click', () => this.buyItem(item, category));
            }

            // Add refund button listener for Infinite Heart
            if (hasInfiniteHeart) {
                const refundBtn = itemDiv.querySelectorAll('.shop-item-btn')[1];
                if (refundBtn) {
                    refundBtn.addEventListener('click', () => {
                        if (confirm('💖 REFUND INFINITE HEART?\n\nYou will get 18,000 points back.\nInfinite Heart will be disabled.\n\nContinue?')) {
                            this.infiniteLives = false;
                            this.powerups['infinite_life'] = 0;
                            this.playerData.totalScore += 18000;
                            this.savePowerups();
                            this.savePlayerData();
                            this.updateNavPoints();
                            alert('💰 REFUND PROCESSED!\n\n+18,000 points\nInfinite Heart disabled');
                            this.renderShopCategory(category);
                        }
                    });
                }
            }

            container.appendChild(itemDiv);
        });
    }

    isItemOwned(item) {
        if (item.type === 'powerup' || item.type === 'currency') {
            // Powerups and currency are never "owned" - they're consumable
            return false;
        }
        const category = item.type + 's';
        return this.inventory[category]?.includes(item.id) || false;
    }

    buyItem(item, category) {
        if (this.playerData.totalScore < item.price) {
            alert(`Not enough points! You need ${item.price} points.`);
            return;
        }

        // Check heart purchase limit (1 per level)
        if (item.type === 'powerup' && (item.id === 'life' || item.id === 'infinite_life')) {
            const currentLevel = this.calculateLevel();

            // Reset counter if level changed
            if (this.playerData.lastHeartPurchaseLevel !== currentLevel) {
                this.playerData.heartsPurchasedThisLevel = 0;
                this.playerData.lastHeartPurchaseLevel = currentLevel;
            }

            // Check if already purchased heart this level
            if (this.playerData.heartsPurchasedThisLevel >= 1) {
                alert(`❌ You can only buy ONE heart per level!\n\nCurrent Level: ${currentLevel}\nNext heart available at Level ${currentLevel + 1} (${(currentLevel * 100)} points)`);
                return;
            }
        }

        if (confirm(`Purchase ${item.name} for ${item.price} points?`)) {
            this.playerData.totalScore -= item.price;

            if (item.type === 'currency') {
                // Handle coin purchase
                if (item.id === 'coin') {
                    this.playerData.coins = (this.playerData.coins || 0) + 1;
                    this.updateCoinsDisplay();
                    alert(`✅ ${item.name} purchased! You now have ${this.playerData.coins} coins`);
                }
            } else if (item.type === 'powerup') {
                // Track heart purchases
                if (item.id === 'life' || item.id === 'infinite_life') {
                    this.playerData.heartsPurchasedThisLevel++;
                    this.playerData.lastHeartPurchaseLevel = this.calculateLevel();
                }

                // Add to powerup count
                this.powerups[item.id] = (this.powerups[item.id] || 0) + 1;
                this.savePowerups();

                // Special handling for infinite heart
                if (item.id === 'infinite_life') {
                    this.infiniteLives = true;
                    const refund = confirm(`✅ 💖 INFINITE HEART ACTIVATED!\n\nYou will never lose lives again!\n\n💡 Want a refund?\nGet 18,000 points back and disable Infinite Heart?`);

                    if (refund) {
                        this.infiniteLives = false;
                        this.powerups[item.id] = 0;
                        this.playerData.totalScore += 18000;
                        this.savePowerups();
                        this.savePlayerData();
                        this.updateNavPoints();
                        alert('💰 REFUND PROCESSED!\n\n+18,000 points\nInfinite Heart disabled');
                    }
                } else {
                    alert(`✅ ${item.name} purchased! You now have ${this.powerups[item.id]}x`);
                }
            } else {
                const invCategory = item.type + 's';
                // Ensure inventory category exists
                if (!this.inventory[invCategory]) {
                    this.inventory[invCategory] = [];
                }
                if (!this.inventory[invCategory].includes(item.id)) {
                    this.inventory[invCategory].push(item.id);
                    this.saveInventory();
                }
                alert(`✅ ${item.name} purchased!\n\nGo to Avatar screen to equip it!`);
            }

            this.savePlayerData();
            this.updateNavPoints();
            this.renderShopCategory(category);

            // Refresh avatar display if on avatar screen
            if (document.getElementById('avatar-screen').classList.contains('active')) {
                this.renderAvatar();
            }
        }
    }

    renderCoinExchange(container) {
        const exchangeDiv = document.createElement('div');
        exchangeDiv.style.cssText = 'max-width: 600px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; color: white;';

        exchangeDiv.innerHTML = `
            <h2 style="text-align: center; margin-bottom: 30px;">🪙 Coin Exchange</h2>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-around; margin-bottom: 20px;">
                    <div style="text-align: center;">
                        <div style="font-size: 2rem;">💰</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${this.playerData.totalScore}</div>
                        <div style="opacity: 0.8;">Points</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 2rem;">🪙</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${this.playerData.coins || 0}</div>
                        <div style="opacity: 0.8;">Coins</div>
                    </div>
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px; margin-bottom: 20px;">
                <h3 style="margin-bottom: 20px; text-align: center;">💰 → 🪙 Buy Coins</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Amount:</label>
                    <input type="range" id="buy-coin-slider" min="0" max="5" value="0" 
                           style="width: 100%; height: 8px; border-radius: 5px; outline: none; cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-top: 5px; opacity: 0.8;">
                        <span>1</span>
                        <span>10</span>
                        <span>20</span>
                        <span>30</span>
                        <span>50</span>
                        <span>100</span>
                    </div>
                </div>
                <div style="text-align: center; margin: 20px 0; font-size: 1.2rem;">
                    <span id="buy-coin-amount">1</span> coins = <span id="buy-coin-cost">10</span> points
                </div>
                <button id="buy-coins-btn" style="width: 100%; padding: 15px; background: #4CAF50; border: none; border-radius: 10px; color: white; font-size: 1.1rem; font-weight: bold; cursor: pointer;">
                    Buy Coins
                </button>
            </div>

            <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px;">
                <h3 style="margin-bottom: 20px; text-align: center;">🪙 → 💰 Sell Coins</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Amount:</label>
                    <input type="range" id="sell-coin-slider" min="0" max="5" value="0" 
                           style="width: 100%; height: 8px; border-radius: 5px; outline: none; cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-top: 5px; opacity: 0.8;">
                        <span>1</span>
                        <span>10</span>
                        <span>20</span>
                        <span>30</span>
                        <span>50</span>
                        <span>100</span>
                    </div>
                </div>
                <div style="text-align: center; margin: 20px 0; font-size: 1.2rem;">
                    <span id="sell-coin-amount">1</span> coins = <span id="sell-coin-value">8</span> points
                </div>
                <button id="sell-coins-btn" style="width: 100%; padding: 15px; background: #FF9800; border: none; border-radius: 10px; color: white; font-size: 1.1rem; font-weight: bold; cursor: pointer;">
                    Sell Coins
                </button>
            </div>

            <div style="margin-top: 20px; text-align: center; opacity: 0.8; font-size: 0.9rem;">
                <p>💡 Buy: 10 points per coin</p>
                <p>💡 Sell: 8 points per coin (20% fee)</p>
            </div>
        `;

        container.appendChild(exchangeDiv);

        // Add event listeners
        const coinAmounts = [1, 10, 20, 30, 50, 100];

        const buySlider = document.getElementById('buy-coin-slider');
        const buyAmountSpan = document.getElementById('buy-coin-amount');
        const buyCostSpan = document.getElementById('buy-coin-cost');
        const buyBtn = document.getElementById('buy-coins-btn');

        buySlider.addEventListener('input', (e) => {
            const amount = coinAmounts[e.target.value];
            const cost = amount * 10;
            buyAmountSpan.textContent = amount;
            buyCostSpan.textContent = cost;
        });

        buyBtn.addEventListener('click', () => {
            const amount = coinAmounts[buySlider.value];
            const cost = amount * 10;

            if (this.playerData.totalScore < cost) {
                alert(`Not enough points! You need ${cost} points but only have ${this.playerData.totalScore}.`);
                return;
            }

            this.playerData.totalScore -= cost;
            this.playerData.coins = (this.playerData.coins || 0) + amount;
            this.savePlayerData();
            this.updateNavPoints();
            this.updateCoinsDisplay();

            this.playSound('achievement');
            this.renderShopCategory('currency');
        });

        const sellSlider = document.getElementById('sell-coin-slider');
        const sellAmountSpan = document.getElementById('sell-coin-amount');
        const sellValueSpan = document.getElementById('sell-coin-value');
        const sellBtn = document.getElementById('sell-coins-btn');

        sellSlider.addEventListener('input', (e) => {
            const amount = coinAmounts[e.target.value];
            const value = amount * 8; // 20% fee (sell for 8 instead of 10)
            sellAmountSpan.textContent = amount;
            sellValueSpan.textContent = value;
        });

        sellBtn.addEventListener('click', () => {
            const amount = coinAmounts[sellSlider.value];
            const value = amount * 8;

            if ((this.playerData.coins || 0) < amount) {
                alert(`Not enough coins! You need ${amount} coins but only have ${this.playerData.coins || 0}.`);
                return;
            }

            this.playerData.coins -= amount;
            this.playerData.totalScore += value;
            this.savePlayerData();
            this.updateNavPoints();
            this.updateCoinsDisplay();

            this.playSound('achievement');
            this.renderShopCategory('currency');
        });
    }

    unlockAchievementItem(itemId) {
        // Find item in shop
        for (const category in this.shopItems) {
            const item = this.shopItems[category].find(i => i.id === itemId);
            if (item && item.achievement) {
                const invCategory = item.type + 's';
                if (!this.inventory[invCategory].includes(item.id)) {
                    this.inventory[invCategory].push(item.id);
                    this.saveInventory();
                    this.showPowerupFeedback(`🎁 Unlocked: ${item.name}!`);
                }
                break;
            }
        }
    }

    // Avatar System
    renderInventory(tab) {
        const container = document.getElementById('inventory-items');
        if (!container) return;

        const items = this.inventory[tab] || [];
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; grid-column: 1/-1;">No items yet. Visit the shop!</p>';
            return;
        }

        items.forEach(itemId => {
            const item = this.findItemById(itemId);
            if (!item) return;

            const isEquipped = this.equippedItems[item.type] === itemId;

            const itemDiv = document.createElement('div');
            itemDiv.className = `inventory-item ${isEquipped ? 'equipped' : ''}`;
            itemDiv.textContent = item.icon;
            itemDiv.title = item.name;

            itemDiv.addEventListener('click', () => this.equipItem(item));

            container.appendChild(itemDiv);
        });
    }

    findItemById(itemId) {
        for (const category in this.shopItems) {
            const item = this.shopItems[category].find(i => i.id === itemId);
            if (item) return item;
        }
        return null;
    }

    equipItem(item) {
        if (this.equippedItems[item.type] === item.id) {
            // Unequip
            this.equippedItems[item.type] = null;
        } else {
            // Equip
            this.equippedItems[item.type] = item.id;
        }

        this.saveEquippedItems();
        this.renderInventory(item.type + 's');
        this.renderAvatarPreview();
    }

    renderAvatarPreview() {
        // Face
        const faceEl = document.getElementById('avatar-face');
        if (faceEl) {
            const face = this.equippedItems.face ? this.findItemById(this.equippedItems.face) : null;
            faceEl.textContent = face ? face.icon : '😊';
        }

        // Hair
        const hairEl = document.getElementById('avatar-hair');
        if (hairEl) {
            const hair = this.equippedItems.hair ? this.findItemById(this.equippedItems.hair) : null;
            hairEl.textContent = (hair && hair.id !== 'none') ? hair.icon : '';
        }

        // Hat
        const hatEl = document.getElementById('avatar-hat');
        if (hatEl) {
            const hat = this.equippedItems.hat ? this.findItemById(this.equippedItems.hat) : null;
            hatEl.textContent = (hat && hat.id !== 'none') ? hat.icon : '';
        }

        // Vest/Top
        const vestEl = document.getElementById('avatar-vest');
        if (vestEl) {
            const vest = this.equippedItems.vest ? this.findItemById(this.equippedItems.vest) : null;
            vestEl.textContent = (vest && vest.id !== 'none') ? vest.icon : '';
        }

        // Pants
        const pantsEl = document.getElementById('avatar-pants');
        if (pantsEl) {
            const pants = this.equippedItems.pant ? this.findItemById(this.equippedItems.pant) : null;
            pantsEl.textContent = (pants && pants.id !== 'none') ? pants.icon : '';
        }

        // Shoes
        const shoesEl = document.getElementById('avatar-shoes');
        if (shoesEl) {
            const shoes = this.equippedItems.shoe ? this.findItemById(this.equippedItems.shoe) : null;
            shoesEl.textContent = (shoes && shoes.id !== 'none') ? shoes.icon : '';
        }

        // Accessory
        const accessoryEl = document.getElementById('avatar-accessory');
        if (accessoryEl) {
            const accessory = this.equippedItems.accessory ? this.findItemById(this.equippedItems.accessory) : null;
            accessoryEl.textContent = (accessory && accessory.id !== 'none') ? accessory.icon : '';
        }

        // Level display
        const levelText = document.getElementById('avatar-level-text');
        if (levelText) {
            const level = this.calculateLevel();
            levelText.textContent = `Level ${level}`;
        }
    }

    calculateLevel() {
        const score = this.playerData.totalScore;
        return Math.floor(score / 100) + 1; // 1 level per 100 points
    }

    // Achievements Screen
    renderAchievementsScreen() {
        this.renderFeaturedAchievements();
        this.renderAllAchievements();
    }

    renderFeaturedAchievements() {
        const container = document.getElementById('featured-achievements');
        if (!container) return;

        container.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const slotDiv = document.createElement('div');
            const achievement = this.featuredAchievements[i];

            if (achievement) {
                const achData = this.achievements.find(a => a.id === achievement);
                slotDiv.className = 'featured-slot filled';
                slotDiv.innerHTML = `
                    <div style="font-size: 2rem;">${achData.icon}</div>
                    <div style="color: white; font-size: 0.8rem; margin-top: 5px;">${achData.name}</div>
                `;
                slotDiv.addEventListener('click', () => this.removeFeaturedAchievement(i));
            } else {
                slotDiv.className = 'featured-slot empty';
                slotDiv.textContent = 'Empty Slot';
            }

            container.appendChild(slotDiv);
        }
    }

    renderAllAchievements() {
        const container = document.getElementById('all-achievements');
        if (!container) return;

        container.innerHTML = '';

        this.achievements.forEach(achievement => {
            const isUnlocked = this.playerData.achievements.includes(achievement.id);
            const isFeatured = this.featuredAchievements.includes(achievement.id);

            const achDiv = document.createElement('div');
            achDiv.className = `achievement-card ${isUnlocked ? 'unlocked' : ''} ${isFeatured ? 'featured' : ''}`;
            achDiv.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
                ${isUnlocked ? '<div style="color: #00b894; margin-top: 10px;">✓ Unlocked</div>' : '<div style="color: rgba(255,255,255,0.5); margin-top: 10px;">🔒 Locked</div>'}
            `;

            if (isUnlocked && !isFeatured && this.featuredAchievements.length < 5) {
                achDiv.addEventListener('click', () => this.addFeaturedAchievement(achievement.id));
            }

            container.appendChild(achDiv);
        });
    }

    addFeaturedAchievement(achievementId) {
        if (this.featuredAchievements.length >= 5) {
            alert('You can only feature 5 achievements!');
            return;
        }

        this.featuredAchievements.push(achievementId);
        this.saveFeaturedAchievements();
        this.renderAchievementsScreen();
    }

    removeFeaturedAchievement(index) {
        this.featuredAchievements.splice(index, 1);
        this.saveFeaturedAchievements();
        this.renderAchievementsScreen();
    }

    // Profile Screen
    renderProfileScreen() {
        document.getElementById('profile-username').textContent = this.playerData.currentAccount || 'Guest';
        document.getElementById('profile-rank').textContent = `Rank: ${this.calculateRank()}`;
        document.getElementById('profile-points').textContent = `💰 Points: ${this.playerData.totalScore}`;

        const statsGrid = document.getElementById('profile-stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${this.playerData.quizzesCompleted}</div>
                    <div class="stat-label">Quizzes Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.playerData.highestScore}</div>
                    <div class="stat-label">Highest Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.playerData.perfectScores}</div>
                    <div class="stat-label">Perfect Scores</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.playerData.winStreak}</div>
                    <div class="stat-label">Win Streak</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.playerData.achievements.length}</div>
                    <div class="stat-label">Achievements</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Object.keys(this.playerData.aiDefeated || {}).length}</div>
                    <div class="stat-label">AI Defeated</div>
                </div>
            `;
        }
    }

    calculateRank() {
        const score = this.playerData.totalScore;
        if (score >= 1000) return 'Master';
        if (score >= 500) return 'Expert';
        if (score >= 250) return 'Advanced';
        if (score >= 100) return 'Intermediate';
        return 'Beginner';
    }

    // Improvement Screen
    renderImprovementScreen() {
        const container = document.getElementById('improvement-analysis');
        if (!container) return;

        const subjects = this.playerData.subjectStats || {};
        container.innerHTML = '';

        if (Object.keys(subjects).length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">Complete some quizzes to see your improvement areas!</p>';
            return;
        }

        Object.entries(subjects).forEach(([subject, stats]) => {
            const accuracy = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) : 0;
            const fillClass = accuracy >= 80 ? 'excellent' : accuracy >= 60 ? 'good' : '';

            const cardDiv = document.createElement('div');
            cardDiv.className = 'improvement-card';
            cardDiv.innerHTML = `
                <div class="improvement-subject">${subject.charAt(0).toUpperCase() + subject.slice(1)}</div>
                <div class="improvement-bar">
                    <div class="improvement-fill ${fillClass}" style="width: ${accuracy}%"></div>
                </div>
                <div class="improvement-stats">
                    Accuracy: ${accuracy}%<br>
                    Correct: ${stats.correct} / ${stats.total}<br>
                    ${accuracy < 70 ? '⚠️ Needs improvement' : accuracy < 85 ? '✓ Good progress' : '🌟 Excellent!'}
                </div>
            `;

            container.appendChild(cardDiv);
        });
    }

    // Daily Challenges Screen
    renderDailyChallengesScreen() {
        this.updateDailyChallengeStatus();
        this.updateMultiDayChallengeStatus();
        this.renderChallengeHistory();
    }

    updateDailyChallengeStatus() {
        const statusEl = document.getElementById('daily-status');
        const startBtn = document.getElementById('start-daily');
        if (!statusEl || !startBtn) return;

        const today = new Date().toDateString();
        const todayCompleted = this.playerData.completedChallenges[today];

        if (todayCompleted) {
            statusEl.innerHTML = '<span style="color: #00b894;">✓ Completed Today!</span>';
            startBtn.disabled = true;
            startBtn.textContent = 'Completed';
        } else {
            statusEl.innerHTML = '<span style="color: #ffd700;">⭐ Available Now!</span>';
            startBtn.disabled = false;
            startBtn.textContent = 'Start Daily';
        }
    }

    updateMultiDayChallengeStatus() {
        const today = new Date();
        const todayStr = today.toDateString();

        // Check 10-day challenge
        this.updateMultiDayChallengeButton(10, 'ten-day-status', 'start-ten-day', todayStr);

        // Check 20-day challenge
        this.updateMultiDayChallengeButton(20, 'twenty-day-status', 'start-twenty-day', todayStr);

        // Check 30-day challenge
        this.updateMultiDayChallengeButton(30, 'monthly-status', 'start-monthly', todayStr);
    }

    updateMultiDayChallengeButton(days, statusId, btnId, todayStr) {
        const statusEl = document.getElementById(statusId);
        const btn = document.getElementById(btnId);
        if (!statusEl || !btn) return;

        const challengeKey = `${days}day_${todayStr}`;
        const completedToday = this.playerData.completedMultiDayChallenges &&
            this.playerData.completedMultiDayChallenges[challengeKey];

        // Count how many of the last N days are completed
        const today = new Date();
        let completedCount = 0;

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();

            if (this.playerData.completedChallenges[dateStr]) {
                completedCount++;
            }
        }

        if (completedToday) {
            statusEl.innerHTML = '<span style="color: #00b894;">✓ Completed Today!</span>';
            btn.disabled = true;
            btn.textContent = 'Completed';
        } else if (completedCount === days) {
            statusEl.innerHTML = '<span style="color: #ffd700;">⭐ Available Now!</span>';
            btn.disabled = false;
            btn.textContent = `Start ${days}-Day`;
        } else {
            statusEl.innerHTML = `<span style="color: #ff7675;">🔒 ${completedCount}/${days} days</span>`;
            btn.disabled = true;
            btn.textContent = 'Locked';
        }
    }

    renderChallengeHistory() {
        const container = document.getElementById('challenge-history-grid');
        if (!container) return;

        const history = this.playerData.dailyChallengesByDay || {};
        const entries = Object.entries(history).slice(-30); // Last 30 days

        if (entries.length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; grid-column: 1/-1;">No challenges completed yet!</p>';
            return;
        }

        container.innerHTML = '';
        entries.reverse().forEach(([date, data]) => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-date">${new Date(date).toLocaleDateString()}</div>
                <div class="history-result ${data.correct ? 'success' : 'failure'}">
                    ${data.correct ? '✓ Correct' : '✗ Wrong'}
                </div>
                <div class="history-subject">${data.subject}</div>
            `;
            container.appendChild(card);
        });
    }

    // Custom Quiz Screen
    renderCustomQuizScreen() {
        this.renderUploadedQuizzes();
        this.renderCustomQuestionsList();
    }

    renderUploadedQuizzes() {
        const container = document.getElementById('uploaded-quizzes-grid');
        if (!container) return;

        const categories = Object.keys(this.customCategories);

        if (categories.length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; grid-column: 1/-1;">No quizzes yet. Upload or create questions below!</p>';
            return;
        }

        container.innerHTML = '';

        categories.forEach(categoryName => {
            const questions = this.customCategories[categoryName];
            const quizCard = document.createElement('div');
            quizCard.className = 'quiz-collection-card';
            quizCard.innerHTML = `
                <div class="quiz-card-header">
                    <h4>${categoryName}</h4>
                    <button class="delete-quiz-btn" data-category="${categoryName}">×</button>
                </div>
                <div class="quiz-card-info">
                    <span>📝 ${questions.length} questions</span>
                </div>
                <button class="play-quiz-btn" data-category="${categoryName}">
                    ▶️ Play Quiz
                </button>
            `;

            container.appendChild(quizCard);
        });

        // Add event listeners
        document.querySelectorAll('.play-quiz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.playQuizCategory(category);
            });
        });

        document.querySelectorAll('.delete-quiz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const category = e.currentTarget.dataset.category;
                this.deleteCustomCategory(category);
            });
        });
    }

    handleQuizUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let questions;

                // Try to parse as JSON
                try {
                    questions = JSON.parse(content);
                } catch {
                    // If not JSON, treat as text format
                    questions = this.parseTextQuiz(content);
                }

                if (!Array.isArray(questions) || questions.length === 0) {
                    alert('Invalid quiz format! Please check your file.');
                    return;
                }

                // Validate questions
                const validQuestions = questions.filter(q =>
                    q.question && q.answers && q.answers.length === 4 && typeof q.correct === 'number'
                );

                if (validQuestions.length === 0) {
                    alert('No valid questions found in file!');
                    return;
                }

                // Prompt for category name
                const categoryName = prompt('Enter a name for this quiz:', file.name.replace(/\.[^/.]+$/, ''));
                if (!categoryName) return;

                // Save to custom categories
                this.customCategories[categoryName] = validQuestions;
                this.saveCustomCategories();

                // Refresh display
                this.renderUploadedQuizzes();

                alert(`✅ Successfully uploaded ${validQuestions.length} questions!`);

            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
        };

        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }

    parseTextQuiz(text) {
        // Simple text parser for quiz format
        // Expected format: Question\nAnswer1\nAnswer2\nAnswer3\nAnswer4\nCorrect:1\n\n
        const questions = [];
        const blocks = text.split('\n\n').filter(b => b.trim());

        blocks.forEach(block => {
            const lines = block.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length >= 6) {
                const question = lines[0];
                const answers = lines.slice(1, 5);
                const correctLine = lines[5];
                const correct = parseInt(correctLine.replace(/[^0-9]/g, '')) || 0;

                questions.push({
                    question,
                    answers,
                    correct,
                    difficulty: 2,
                    custom: true
                });
            }
        });

        return questions;
    }

    playQuizCategory(categoryName) {
        const questions = this.customCategories[categoryName];
        if (!questions || questions.length === 0) {
            alert('No questions in this category!');
            return;
        }

        this.currentSubject = 'custom';
        this.customQuestions = questions;
        this.selectedQuestionCount = questions.length;
        this.startQuiz();
    }

    addCustomQuestion() {
        const question = document.getElementById('custom-question').value.trim();
        const answer1 = document.getElementById('custom-answer1').value.trim();
        const answer2 = document.getElementById('custom-answer2').value.trim();
        const answer3 = document.getElementById('custom-answer3').value.trim();
        const answer4 = document.getElementById('custom-answer4').value.trim();
        const correct = parseInt(document.getElementById('custom-correct').value);

        // Validation
        if (!question) {
            alert('Please enter a question!');
            return;
        }

        if (!answer1 || !answer2 || !answer3 || !answer4) {
            alert('Please enter all 4 answers!');
            return;
        }

        // Create question object
        const newQuestion = {
            question: question,
            answers: [answer1, answer2, answer3, answer4],
            correct: correct,
            difficulty: 2, // Default to medium
            custom: true
        };

        // Add to custom questions
        if (!this.customQuestions) {
            this.customQuestions = [];
        }
        this.customQuestions.push(newQuestion);

        // Save to a default category or prompt for category
        const categoryName = 'My Questions';
        if (!this.customCategories[categoryName]) {
            this.customCategories[categoryName] = [];
        }
        this.customCategories[categoryName].push(newQuestion);
        this.saveCustomCategories();

        // Clear form
        document.getElementById('custom-question').value = '';
        document.getElementById('custom-answer1').value = '';
        document.getElementById('custom-answer2').value = '';
        document.getElementById('custom-answer3').value = '';
        document.getElementById('custom-answer4').value = '';
        document.getElementById('custom-correct').value = '0';

        // Refresh list
        this.renderCustomQuestionsList();

        alert('✅ Question added successfully!');
    }

    renderCustomQuestionsList() {
        const container = document.getElementById('custom-questions-list');
        if (!container) return;

        const categoryName = 'My Questions';
        const questions = this.customCategories[categoryName] || [];

        if (questions.length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No questions yet. Create your first question above!</p>';
            return;
        }

        container.innerHTML = '';

        questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'custom-question-item';
            questionDiv.innerHTML = `
                <div class="custom-question-content">
                    <strong>Q${index + 1}:</strong> ${q.question}
                    <div class="custom-answers">
                        ${q.answers.map((a, i) => `
                            <span class="${i === q.correct ? 'correct-answer' : ''}">${i + 1}. ${a}</span>
                        `).join('')}
                    </div>
                </div>
                <button class="delete-question-btn" data-index="${index}">Delete</button>
            `;

            container.appendChild(questionDiv);
        });

        // Add delete handlers
        document.querySelectorAll('.delete-question-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.deleteCustomQuestion(categoryName, index);
            });
        });
    }

    deleteCustomQuestion(categoryName, index) {
        if (confirm('Delete this question?')) {
            this.customCategories[categoryName].splice(index, 1);
            this.saveCustomCategories();
            this.renderCustomQuestionsList();
        }
    }

    playCustomQuiz() {
        const categoryName = 'My Questions';
        const questions = this.customCategories[categoryName] || [];

        if (questions.length === 0) {
            alert('Please create some questions first!');
            return;
        }

        this.currentSubject = 'custom';
        this.customQuestions = questions;
        this.selectedQuestionCount = questions.length;
        this.startQuiz();
    }

    // AI PvP Screen
    renderAIPvPScreen() {
        const container = document.querySelector('#ai-pvp-screen .container');
        if (!container) return;

        const gridDiv = container.querySelector('.ai-opponents-grid') || document.createElement('div');
        gridDiv.className = 'ai-opponents-grid';
        gridDiv.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-top: 30px;';

        gridDiv.innerHTML = '';

        Object.entries(this.aiCompetitors).forEach(([type, ai]) => {
            const defeated = ai.isBoss
                ? (this.playerData.bossesDefeated?.[type] || false)
                : (this.playerData.aiDefeated?.[type] || false);

            const aiDiv = document.createElement('div');
            aiDiv.className = 'shop-item';

            // Different display for bosses
            if (ai.isBoss) {
                aiDiv.style.border = '3px solid gold';
                aiDiv.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,140,0,0.1))';
            }

            aiDiv.innerHTML = `
                <div class="shop-item-icon">${ai.icon}</div>
                <div class="shop-item-name">${ai.name}${ai.isBoss ? ' 👑' : ''}</div>
                <div class="shop-item-desc">${ai.description || 'Challenge this opponent!'}</div>
                ${!ai.isBoss ? `<div class="shop-item-desc" style="font-size: 0.85rem; opacity: 0.8;">
                    Accuracy: ${Math.round(ai.accuracy * 100)}% | Speed: ${ai.speed}ms
                </div>` : ''}
                ${defeated ? '<div style="color: #00b894; margin: 10px 0;">✓ Defeated</div>' : ''}
                <button class="shop-item-btn">${ai.isBoss ? 'Boss Battle' : 'Challenge'}</button>
            `;

            const btn = aiDiv.querySelector('.shop-item-btn');
            btn.addEventListener('click', () => {
                this.startAIBattle(type);
            });

            gridDiv.appendChild(aiDiv);
        });

        if (!container.querySelector('.ai-opponents-grid')) {
            container.appendChild(gridDiv);
        }
    }

    // Boss Loot System
    dropBossLoot() {
        const lootTable = [
            { id: 'crown', chance: 0.1 },
            { id: 'wizard', chance: 0.15 },
            { id: 'armor', chance: 0.2 },
            { id: 'mask', chance: 0.15 },
            { id: 'monocle', chance: 0.2 },
            { id: 'hoodie', chance: 0.2 }
        ];

        const roll = Math.random();
        let cumulative = 0;

        for (const loot of lootTable) {
            cumulative += loot.chance;
            if (roll <= cumulative) {
                const item = this.findItemById(loot.id);
                if (item && !this.isItemOwned(item)) {
                    const invCategory = item.type + 's';
                    this.inventory[invCategory].push(item.id);
                    this.saveInventory();
                    this.showPowerupFeedback(`🎁 Boss dropped: ${item.name} ${item.icon}!`);
                    return;
                }
            }
        }

        // Fallback: bonus points
        const bonusPoints = 25 + Math.floor(Math.random() * 25);
        this.playerData.totalScore += bonusPoints;
        this.savePlayerData();
        this.showPowerupFeedback(`💰 Boss dropped ${bonusPoints} bonus points!`);
    }

    // Combo System
    updateCombo(correct) {
        if (correct) {
            this.comboCount++;
            if (this.comboCount > this.maxCombo) {
                this.maxCombo = this.comboCount;
            }
        } else {
            this.comboCount = 0;
        }

        const comboDisplay = document.getElementById('combo-display');
        if (comboDisplay) {
            comboDisplay.textContent = `${this.comboCount}x`;
        }

        // Combo bonuses
        if (this.comboCount >= 5 && this.comboCount % 5 === 0) {
            const bonus = Math.floor(this.comboCount / 5);
            this.score += bonus;
            this.showPowerupFeedback(`🔥 ${this.comboCount}x Combo! +${bonus} bonus points!`);
        }
    }

    endGame(won) {
        console.log('=== END GAME CALLED ===', 'Won:', won, 'Score:', this.score, 'Questions:', this.questionsAnswered);

        // Stop timer
        this.stopQuizTimer();

        // Hide AI battle UI if it was active
        if (this.isAIBattle) {
            document.getElementById('battle-mode-indicator').classList.add('hidden');
            const aiSide = document.querySelector('.ai-side');
            if (aiSide) aiSide.classList.add('hidden');
            document.getElementById('quiz-container').classList.remove('battle-mode');
        }

        // Handle daily challenge completion
        if (this.isDailyChallenge) {
            this.completeDailyChallenge(this.score);
        }

        // Update player score and check for avatar unlocks (skip if AI battle, handled separately)
        if (!this.isAIBattle) {
            this.updatePlayerScore(this.score);
        }

        // Check for mystery box (10% chance on win)
        if (won && !this.isAIBattle) {
            this.checkMysteryBox();
        }

        // Save to history
        this.saveQuizResult(won);

        const finalScoreEl = document.getElementById('final-score');
        const questionsAnsweredEl = document.getElementById('questions-answered');
        const highestLevelEl = document.getElementById('highest-level');

        if (finalScoreEl) finalScoreEl.textContent = this.score;
        if (questionsAnsweredEl) questionsAnsweredEl.textContent = this.questionsAnswered;
        if (highestLevelEl) highestLevelEl.textContent = this.difficulty;

        const title = document.getElementById('game-over-title');
        if (title) {
            if (won) {
                if (this.isDailyChallenge) {
                    if (this.currentDailyChallenge && this.currentDailyChallenge.type === 'multiday') {
                        title.textContent = `${this.currentDailyChallenge.days}-Day Challenge Complete!`;
                    } else {
                        title.textContent = "Daily Challenge Complete!";
                    }
                } else {
                    title.textContent = "Congratulations! You survived!";
                }
                title.style.color = "#00b894";

                // Random loot drop on victory (10% chance)
                if (Math.random() < 0.1 && !this.isAIBattle) {
                    setTimeout(() => {
                        this.dropBossLoot();
                    }, 1000);
                }
            } else {
                title.textContent = "Game Over! Better luck next time.";
                title.style.color = "#ff6b6b";
            }
        }

        console.log('About to show game-over-screen');
        this.showScreen('game-over-screen');
        console.log('showScreen called');
    }

    resetGame() {
        this.currentQuestionIndex = 0;
        this.score = 0;

        // Don't reset lives if in special game mode (they set their own lives)
        if (!this.isSuddenDeath && !this.isSurvivalMode && !this.isLightningRound && !this.isBossRush && !this.isRivalBattle) {
            this.lives = 3;
        }

        // Don't reset difficulty if in special game mode
        if (!this.isSuddenDeath && !this.isSurvivalMode && !this.isLightningRound) {
            this.difficulty = 1;
        }

        this.questionsAnswered = 0;
        this.isCurveball = false;
        this.questions = [];
        this.comboCount = 0;

        // Clear the used flag from all questions
        Object.values(this.questionBank).forEach(subjectQuestions => {
            subjectQuestions.forEach(q => {
                delete q.used;
            });
        });
    }

    showScreen(screenId) {
        console.log('Showing screen:', screenId);

        // Remove active from all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Add active to target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            console.log('Screen activated:', screenId);
        } else {
            console.error('Screen not found:', screenId);
        }
    }
    // Custom category management methods
    loadCustomCategories() {
        const saved = localStorage.getItem('quizCustomCategories');
        return saved ? JSON.parse(saved) : {};
    }

    saveCustomCategories() {
        localStorage.setItem('quizCustomCategories', JSON.stringify(this.customCategories));
    }

    promptForCategoryName(fileName) {
        const defaultName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
        const categoryName = prompt(`Enter a name for this quiz category:`, defaultName);

        if (!categoryName) return null;

        if (this.customCategories[categoryName]) {
            const overwrite = confirm(`Category "${categoryName}" already exists. Overwrite it?`);
            if (!overwrite) return null;
        }

        return categoryName;
    }

    saveCustomCategory(name, questions) {
        this.customCategories[name] = questions;
        this.saveCustomCategories();
    }

    deleteCustomCategory(name) {
        if (confirm(`Are you sure you want to delete the "${name}" category?`)) {
            delete this.customCategories[name];
            this.saveCustomCategories();
            this.renderCustomCategories();
        }
    }

    renderCustomCategories() {
        const container = document.getElementById('custom-categories');
        if (!container) {
            // Custom categories container doesn't exist, skip rendering
            console.log('Custom categories container not found, skipping render');
            return;
        }

        container.innerHTML = '';

        Object.keys(this.customCategories).forEach(categoryName => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'custom-category-item';
            categoryDiv.innerHTML = `
                <button class="subject-btn custom-category-btn" data-category="${categoryName}">
                    ${categoryName} (${this.customCategories[categoryName].length} questions)
                </button>
                <button class="delete-category-btn" data-category="${categoryName}">×</button>
            `;
            container.appendChild(categoryDiv);
        });

        // Add event listeners for custom category buttons
        document.querySelectorAll('.custom-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryName = e.currentTarget.dataset.category;
                this.currentSubject = 'custom';
                this.customQuestions = this.customCategories[categoryName];
                this.startQuiz();
            });
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryName = e.currentTarget.dataset.category;
                this.deleteCustomCategory(categoryName);
            });
        });
    }

    createCustomCategoriesSection() {
        const homeScreen = document.getElementById('home-screen');
        if (!homeScreen) {
            console.warn('Home screen not found, skipping custom categories section');
            return;
        }

        const uploadSection = homeScreen.querySelector('.upload-section');
        if (!uploadSection) {
            console.warn('Upload section not found, skipping custom categories section');
            return;
        }

        const customSection = document.createElement('div');
        customSection.className = 'custom-categories-section';
        customSection.innerHTML = `
            <h3>Your Custom Categories</h3>
            <div id="custom-categories" class="custom-categories-container"></div>
        `;

        // Insert after upload section
        uploadSection.parentNode.insertBefore(customSection, uploadSection.nextSibling);

        // Try rendering again
        this.renderCustomCategories();
    }

    // History management methods
    loadQuizHistory() {
        const saved = localStorage.getItem('quizHistory');
        return saved ? JSON.parse(saved) : [];
    }

    saveQuizHistory() {
        localStorage.setItem('quizHistory', JSON.stringify(this.quizHistory));
    }

    saveQuizResult(won) {
        const endTime = new Date();
        const duration = Math.round((endTime - this.startTime) / 1000); // in seconds

        const result = {
            id: Date.now(),
            date: endTime.toLocaleDateString(),
            time: endTime.toLocaleTimeString(),
            subject: this.getSubjectDisplayName(),
            difficulty: this.gameMode,
            score: this.score,
            questionsAnswered: this.questionsAnswered,
            maxLevel: this.difficulty,
            won: won,
            duration: duration
        };

        this.quizHistory.unshift(result); // Add to beginning

        // Keep only last 50 results
        if (this.quizHistory.length > 50) {
            this.quizHistory = this.quizHistory.slice(0, 50);
        }

        this.saveQuizHistory();
        this.renderHistory();
    }

    getSubjectDisplayName() {
        if (this.currentSubject === 'custom') {
            return 'Custom Quiz';
        } else if (this.currentSubject === 'all') {
            return 'All Subjects';
        } else {
            return this.currentSubject.charAt(0).toUpperCase() + this.currentSubject.slice(1);
        }
    }

    renderHistory() {
        const container = document.getElementById('history-container');
        if (!container) return;

        if (this.quizHistory.length === 0) {
            container.innerHTML = '<p class="no-history">No quiz history yet. Complete a quiz to see your results here!</p>';
            return;
        }

        container.innerHTML = this.quizHistory.map(result => `
            <div class="history-item ${result.won ? 'won' : 'lost'}">
                <div class="history-header">
                    <span class="history-subject">${result.subject}</span>
                    <span class="history-date">${result.date} ${result.time}</span>
                </div>
                <div class="history-stats">
                    <span class="history-score">Score: ${result.score}</span>
                    <span class="history-questions">Questions: ${result.questionsAnswered}</span>
                    <span class="history-level">Max Level: ${result.maxLevel}</span>
                    <span class="history-duration">${this.formatDuration(result.duration)}</span>
                </div>
                <div class="history-result ${result.won ? 'success' : 'failure'}">
                    ${result.won ? '🏆 Completed' : '💀 Game Over'}
                </div>
            </div>
        `).join('');
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all quiz history? This cannot be undone.')) {
            this.quizHistory = [];
            this.saveQuizHistory();
            this.renderHistory();
        }
    }

    // Avatar system methods
    initializeAvatars() {
        return [
            { id: 'student', emoji: '🎓', name: 'Student', unlockScore: 0, description: 'Starting your learning journey' },
            { id: 'scholar', emoji: '📚', name: 'Scholar', unlockScore: 50, description: 'Knowledge seeker' },
            { id: 'genius', emoji: '🧠', name: 'Genius', unlockScore: 100, description: 'Big brain energy' },
            { id: 'wizard', emoji: '🧙‍♂️', name: 'Wizard', unlockScore: 200, description: 'Master of knowledge' },
            { id: 'scientist', emoji: '🔬', name: 'Scientist', unlockScore: 300, description: 'Research expert' },
            { id: 'professor', emoji: '👨‍🏫', name: 'Professor', unlockScore: 500, description: 'Teaching excellence' },
            { id: 'einstein', emoji: '🤓', name: 'Einstein', unlockScore: 750, description: 'Theoretical genius' },
            { id: 'oracle', emoji: '🔮', name: 'Oracle', unlockScore: 1000, description: 'All-knowing sage' },
            { id: 'legend', emoji: '👑', name: 'Legend', unlockScore: 1500, description: 'Quiz master supreme' },
            { id: 'immortal', emoji: '⚡', name: 'Immortal', unlockScore: 2000, description: 'Beyond human knowledge' },
            { id: 'hacker_beater', emoji: '💻', name: 'Hacker Beater', unlockScore: 99999, description: 'Defeated the unbeatable', secret: true },
            { id: 'nerd_century', emoji: '🤓', name: 'Nerd of Century', unlockScore: 99999, description: 'Outsmarted Einstein himself', secret: true }
        ];
    }

    loadPlayerData() {
        const saved = localStorage.getItem('quizPlayerData');
        const defaultData = {
            totalScore: 0,
            highestScore: 0,
            currentAvatar: 'student',
            unlockedAvatars: ['student'],
            achievements: [],
            quizzesCompleted: 0,
            perfectScores: 0,
            marathonCompleted: 0,
            perfectMarathons: 0,
            subjectsPlayed: 0,
            subjectsPlayedList: [],
            subjectStats: {},
            winStreak: 0,
            fastestTime: 999999,
            quickQuizzes: 0,
            standardQuizzes: 0,
            extendedQuizzes: 0,
            challengeQuizzes: 0,
            expertQuizzes: 0,
            nightQuizzes: 0,
            earlyQuizzes: 0,
            weekendQuizzes: 0,
            consecutiveDays: 0,
            monthlyRecord: 0,
            comebacks: 0,
            customQuizzesCompleted: 0,
            impossibleQuizzes: 0,
            perfectImpossible: 0,
            aiDefeated: {},
            dailyChallengesCompleted: 0,
            perfectDailies: 0,
            dailyStreak: 0,
            lastDailyChallenge: null,
            dailyChallengesByDay: {},
            completedChallenges: {},
            completedMultiDayChallenges: {},
            completedCycles: 0,
            oldestChallengeCompleted: 0,
            currentAccount: null,
            skipAccount: false,
            lastPlayDate: null,
            heartsPurchasedThisLevel: 0,
            lastHeartPurchaseLevel: 0,
            cheatCodeUsed: false,
            cheatDebt: 0,
            coins: 100,

            // Special Game Mode Stats
            survivalRecord: 0,
            lightningRecord: 0,
            suddenDeathCompleted: 0,
            bossRushCompleted: 0,
            maxMultiplier: 0,
            mysteryBoxesOpened: 0,
            loginStreak: 0,
            lastLoginDate: null
        };

        // If saved data exists, merge it with defaults to ensure all properties exist
        if (saved) {
            try {
                const savedData = JSON.parse(saved);
                return { ...defaultData, ...savedData };
            } catch (e) {
                console.error('Error parsing saved player data:', e);
                return defaultData;
            }
        }

        return defaultData;
    }

    savePlayerData() {
        localStorage.setItem('quizPlayerData', JSON.stringify(this.playerData));
    }

    loadPowerups() {
        const saved = localStorage.getItem('powerups');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            '5050': 0,
            'skip': 0,
            'life': 0,
            'infinite_life': 0,
            'time': 0
        };
    }

    savePowerups() {
        localStorage.setItem('powerups', JSON.stringify(this.powerups));
    }

    initializeShopItems() {
        return {
            faces: [
                { id: 'smile', name: 'Smile', icon: '😊', price: 0, unlocked: true, type: 'face' },
                { id: 'cool', name: 'Cool', icon: '😎', price: 50, unlocked: false, type: 'face' },
                { id: 'nerd', name: 'Nerd', icon: '🤓', price: 75, unlocked: false, type: 'face' },
                { id: 'star', name: 'Star Eyes', icon: '🤩', price: 100, unlocked: false, type: 'face' },
                { id: 'thinking', name: 'Thinking', icon: '🤔', price: 60, unlocked: false, type: 'face' }
            ],
            hair: [
                { id: 'none', name: 'Bald', icon: '⚪', price: 0, unlocked: true, type: 'hair' },
                { id: 'short', name: 'Short Hair', icon: '💇', price: 50, unlocked: false, type: 'hair' },
                { id: 'long', name: 'Long Hair', icon: '💇‍♀️', price: 75, unlocked: false, type: 'hair' },
                { id: 'curly', name: 'Curly', icon: '🦱', price: 100, unlocked: false, type: 'hair' }
            ],
            hats: [
                { id: 'none', name: 'No Hat', icon: '⚪', price: 0, unlocked: true, type: 'hat' },
                { id: 'gradcap', name: 'Beginner Grad Cap', icon: '🎓', price: 0, unlocked: true, type: 'hat', level: 1 },
                { id: 'tophat', name: 'Top Hat', icon: '🎩', price: 100, unlocked: false, type: 'hat' },
                { id: 'crown', name: 'Crown', icon: '👑', price: 200, unlocked: false, type: 'hat' },
                { id: 'wizard', name: 'Wizard Hat', icon: '🧙', price: 150, unlocked: false, type: 'hat' },
                { id: 'cowboy', name: 'Cowboy Hat', icon: '🤠', price: 120, unlocked: false, type: 'hat' },
                { id: 'laptop', name: 'Hacker Laptop', icon: '💻', price: 0, unlocked: false, type: 'hat', achievement: 'Beat Hacker AI' },
                { id: 'party', name: 'Party Hat', icon: '🎉', price: 80, unlocked: false, type: 'hat' }
            ],
            vests: [
                { id: 'none', name: 'No Top', icon: '⚪', price: 0, unlocked: true, type: 'vest' },
                { id: 'suit', name: 'Business Suit', icon: '👔', price: 150, unlocked: false, type: 'vest' },
                { id: 'tshirt', name: 'Cool T-Shirt', icon: '👕', price: 80, unlocked: false, type: 'vest' },
                { id: 'hoodie', name: 'Hoodie', icon: '🧥', price: 120, unlocked: false, type: 'vest' },
                { id: 'armor', name: 'Knight Armor', icon: '🛡️', price: 250, unlocked: false, type: 'vest' }
            ],
            pants: [
                { id: 'none', name: 'No Pants', icon: '⚪', price: 0, unlocked: true, type: 'pant' },
                { id: 'jeans', name: 'Jeans', icon: '👖', price: 60, unlocked: false, type: 'pant' },
                { id: 'shorts', name: 'Shorts', icon: '🩳', price: 50, unlocked: false, type: 'pant' },
                { id: 'formal', name: 'Formal Pants', icon: '👔', price: 100, unlocked: false, type: 'pant' }
            ],
            shoes: [
                { id: 'none', name: 'Barefoot', icon: '⚪', price: 0, unlocked: true, type: 'shoe' },
                { id: 'sneakers', name: 'Sneakers', icon: '👟', price: 70, unlocked: false, type: 'shoe' },
                { id: 'boots', name: 'Boots', icon: '🥾', price: 90, unlocked: false, type: 'shoe' },
                { id: 'dress', name: 'Dress Shoes', icon: '👞', price: 110, unlocked: false, type: 'shoe' }
            ],
            accessories: [
                { id: 'none', name: 'No Accessory', icon: '⚪', price: 0, unlocked: true, type: 'accessory' },
                { id: 'books', name: 'Scholar\'s Books', icon: '📚', price: 0, unlocked: false, type: 'accessory', achievement: 'Unlock Scholar Avatar' },
                { id: 'glasses', name: 'Cool Glasses', icon: '👓', price: 50, unlocked: false, type: 'accessory' },
                { id: 'sunglasses', name: 'Sunglasses', icon: '🕶️', price: 75, unlocked: false, type: 'accessory' },
                { id: 'monocle', name: 'Monocle', icon: '🧐', price: 100, unlocked: false, type: 'accessory' },
                { id: 'cheater_grin', name: 'Cheater\'s Grin', icon: '😈', price: 0, unlocked: false, type: 'accessory', achievement: 'Beat Cheater AI' },
                { id: 'mask', name: 'Mystery Mask', icon: '🎭', price: 150, unlocked: false, type: 'accessory' }
            ],
            powerups: [
                { id: '5050', name: '50/50', icon: '🎯', price: 50, type: 'powerup', desc: 'Remove 2 wrong answers (One-time use)' },
                { id: 'skip', name: 'Skip Question', icon: '⏭️', price: 75, type: 'powerup', desc: 'Skip current question (One-time use)' },
                { id: 'life', name: 'Extra Life', icon: '❤️', price: 100, type: 'powerup', desc: 'Gain 1 life (One-time use)' },
                { id: 'infinite_life', name: 'Infinite Heart', icon: '💖', price: 20000, type: 'powerup', desc: 'Unlimited lives forever!' },
                { id: 'time', name: 'Freeze Time', icon: '⏰', price: 60, type: 'powerup', desc: 'Freeze time 5 sec (One-time use)' }
            ],
            currency: [
                { id: 'coin_exchange', name: 'Coin Exchange', icon: '🪙', price: 0, type: 'currency', desc: 'Trade points for coins or coins for points' }
            ]
        };
    }

    initializeAvatars() {
        return [
            { id: 'student', name: 'Student', emoji: '🎓', description: 'Just starting your journey', unlockScore: 0, customization: { face: 'smile', hat: 'gradcap' } },
            { id: 'scholar', name: 'Scholar', emoji: '📚', description: 'Knowledge seeker', unlockScore: 500, customization: { face: 'thinking', hat: 'gradcap', accessory: 'books', vest: 'suit' } },
            { id: 'genius', name: 'Genius', emoji: '🧠', description: 'Brilliant mind', unlockScore: 1500, customization: { face: 'nerd', hat: 'tophat', accessory: 'glasses', vest: 'suit', pant: 'formal' } },
            { id: 'wizard', name: 'Wizard', emoji: '🧙‍♂️', description: 'Master of knowledge', unlockScore: 3000, customization: { face: 'star', hat: 'wizard', vest: 'hoodie', accessory: 'monocle' } },
            { id: 'scientist', name: 'Scientist', emoji: '🔬', description: 'Experimental expert', unlockScore: 5000, customization: { face: 'cool', hat: 'none', accessory: 'glasses', vest: 'tshirt', pant: 'jeans' } },
            { id: 'professor', name: 'Professor', emoji: '👨‍🏫', description: 'Teaching excellence', unlockScore: 8000, customization: { face: 'thinking', hat: 'tophat', accessory: 'glasses', vest: 'suit', pant: 'formal', shoe: 'dress' } },
            { id: 'einstein', name: 'Einstein', emoji: '🤓', description: 'Relativity master', unlockScore: 12000, customization: { face: 'nerd', hat: 'none', hair: 'curly', accessory: 'glasses', vest: 'suit', pant: 'formal' } },
            { id: 'oracle', name: 'Oracle', emoji: '🔮', description: 'All-knowing sage', unlockScore: 18000, customization: { face: 'star', hat: 'wizard', accessory: 'mask', vest: 'hoodie' } },
            { id: 'legend', name: 'Legend', emoji: '👑', description: 'Legendary status', unlockScore: 25000, customization: { face: 'cool', hat: 'crown', accessory: 'sunglasses', vest: 'armor', pant: 'formal', shoe: 'boots' } },
            { id: 'immortal', name: 'Immortal', emoji: '⚡', description: 'Beyond mortal limits', unlockScore: 50000, customization: { face: 'star', hat: 'crown', accessory: 'mask', vest: 'armor', pant: 'formal', shoe: 'boots' } }
        ];
    }

    loadInventory() {
        const saved = localStorage.getItem('inventory');
        return saved ? JSON.parse(saved) : {
            faces: ['smile'],
            hair: ['none'],
            hats: ['none', 'gradcap'],
            vests: ['none'],
            pants: ['none'],
            shoes: ['none'],
            accessories: ['none']
        };
    }

    saveInventory() {
        localStorage.setItem('inventory', JSON.stringify(this.inventory));
    }

    loadEquippedItems() {
        const saved = localStorage.getItem('equippedItems');
        return saved ? JSON.parse(saved) : {
            face: 'smile',
            hair: null,
            hat: 'gradcap',
            vest: null,
            pant: null,
            shoe: null,
            accessory: null
        };
    }

    saveEquippedItems() {
        localStorage.setItem('equippedItems', JSON.stringify(this.equippedItems));
    }

    loadFeaturedAchievements() {
        const saved = localStorage.getItem('featuredAchievements');
        return saved ? JSON.parse(saved) : [];
    }

    saveFeaturedAchievements() {
        localStorage.setItem('featuredAchievements', JSON.stringify(this.featuredAchievements));
    }

    buyPowerup(type, price) {
        if (this.playerData.totalScore < price) {
            alert(`Not enough points! You need ${price} points. You have ${this.playerData.totalScore}.`);
            return false;
        }

        // Deduct points
        this.playerData.totalScore -= price;

        // Add to inventory (count-based)
        this.powerups[type] = (this.powerups[type] || 0) + 1;

        this.savePlayerData();
        this.savePowerups();
        this.updatePowerupDisplay();

        alert(`✅ Power-up purchased! You now have ${this.powerups[type]}x ${this.getPowerupName(type)}`);
        return true;
    }

    getPowerupName(type) {
        const names = {
            '5050': '50/50',
            'skip': 'Skip Question',
            'life': 'Extra Life',
            'infinite_life': 'Infinite Heart',
            'time': 'Freeze Time'
        };
        return names[type] || type;
    }

    checkAvatarUnlocks() {
        // Safety checks
        if (!this.playerData) {
            console.error('playerData is undefined in checkAvatarUnlocks');
            return;
        }

        // Ensure unlockedAvatars exists
        if (!this.playerData.unlockedAvatars) {
            this.playerData.unlockedAvatars = ['student'];
        }

        // Ensure totalScore exists
        if (this.playerData.totalScore === undefined) {
            this.playerData.totalScore = 0;
        }

        const newUnlocks = [];
        this.avatars.forEach(avatar => {
            if (this.playerData.totalScore >= avatar.unlockScore &&
                !this.playerData.unlockedAvatars.includes(avatar.id)) {
                this.playerData.unlockedAvatars.push(avatar.id);
                newUnlocks.push(avatar);

                // Unlock special items for specific avatars
                if (avatar.id === 'scholar') {
                    this.unlockAchievementItem('books');
                }
            }
        });

        // Show unlock notifications
        newUnlocks.forEach(avatar => {
            this.showAvatarUnlock(avatar);
        });
    }

    showAvatarUnlock(avatar) {
        const notification = document.createElement('div');
        notification.className = 'avatar-unlock-notification';
        notification.innerHTML = `
            <div class="unlock-content">
                <div class="unlock-avatar">${avatar.emoji}</div>
                <div class="unlock-text">
                    <h3>New Avatar Unlocked!</h3>
                    <p>${avatar.name}</p>
                    <small>${avatar.description}</small>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 4000);
    }

    renderAvatar() {
        // Create avatar section if it doesn't exist
        let avatarSection = document.querySelector('.avatar-section');
        if (!avatarSection) {
            this.createAvatarSection();
            avatarSection = document.querySelector('.avatar-section');
        }

        const currentAvatar = this.avatars.find(a => a.id === this.playerData.currentAvatar);
        const avatarDisplay = avatarSection.querySelector('.current-avatar');
        const statsDisplay = avatarSection.querySelector('.player-stats');

        avatarDisplay.innerHTML = `
            <div class="avatar-emoji">${currentAvatar.emoji}</div>
            <div class="avatar-info">
                <h3>${currentAvatar.name}</h3>
                <p>${currentAvatar.description}</p>
            </div>
        `;

        statsDisplay.innerHTML = `
            <div class="stat">
                <span class="stat-label">Total Score:</span>
                <span class="stat-value">${this.playerData.totalScore}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Best Score:</span>
                <span class="stat-value">${this.playerData.highestScore}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Avatars:</span>
                <span class="stat-value">${this.playerData.unlockedAvatars.length}/${this.avatars.length}</span>
            </div>
        `;

        this.renderAvatarSelector();
    }

    createAvatarSection() {
        const homeScreen = document.getElementById('home-screen');
        const container = homeScreen.querySelector('.container');

        const avatarSection = document.createElement('div');
        avatarSection.className = 'avatar-section';
        avatarSection.innerHTML = `
            <h3>👤 Your Avatar</h3>
            <div class="current-avatar"></div>
            <div class="player-stats"></div>
            <button class="change-avatar-btn">Change Avatar</button>
            <div class="avatar-selector hidden"></div>
        `;

        // Insert at the top after the title
        const subtitle = container.querySelector('.subtitle');
        subtitle.parentNode.insertBefore(avatarSection, subtitle.nextSibling);

        // Add event listener for change avatar button
        avatarSection.querySelector('.change-avatar-btn').addEventListener('click', () => {
            this.toggleAvatarSelector();
        });
    }

    renderAvatarSelector() {
        const selector = document.querySelector('.avatar-selector');
        if (!selector) return;

        selector.innerHTML = this.avatars.map(avatar => {
            const isUnlocked = this.playerData.unlockedAvatars.includes(avatar.id);
            const isCurrent = this.playerData.currentAvatar === avatar.id;

            return `
                <div class="avatar-option ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}" 
                     data-avatar="${avatar.id}">
                    <div class="avatar-emoji">${isUnlocked ? avatar.emoji : '🔒'}</div>
                    <div class="avatar-name">${avatar.name}</div>
                    <div class="avatar-requirement">
                        ${isUnlocked ? avatar.description : `Unlock at ${avatar.unlockScore} total score`}
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        selector.querySelectorAll('.avatar-option.unlocked').forEach(option => {
            option.addEventListener('click', () => {
                const avatarId = option.dataset.avatar;
                this.selectAvatar(avatarId);
            });
        });
    }

    toggleAvatarSelector() {
        const selector = document.querySelector('.avatar-selector');
        selector.classList.toggle('hidden');
    }

    selectAvatar(avatarId) {
        if (this.playerData.unlockedAvatars.includes(avatarId)) {
            this.playerData.currentAvatar = avatarId;

            // Apply avatar's preset customization
            const avatar = this.avatars.find(a => a.id === avatarId);
            if (avatar && avatar.customization) {
                this.equippedItems = {
                    face: avatar.customization.face || null,
                    hair: avatar.customization.hair || null,
                    hat: avatar.customization.hat || null,
                    vest: avatar.customization.vest || null,
                    pant: avatar.customization.pant || null,
                    shoe: avatar.customization.shoe || null,
                    accessory: avatar.customization.accessory || null
                };
                this.saveEquippedItems();
                this.updateAvatarDisplay();
            }

            this.savePlayerData();
            this.renderAvatar();
            this.playSound('achievement');
        }
    }

    updateAvatarDisplay() {
        // Update avatar preview
        const faceEl = document.getElementById('avatar-face');
        const hairEl = document.getElementById('avatar-hair');
        const hatEl = document.getElementById('avatar-hat');
        const vestEl = document.getElementById('avatar-vest');
        const pantsEl = document.getElementById('avatar-pants');
        const shoesEl = document.getElementById('avatar-shoes');
        const accessoryEl = document.getElementById('avatar-accessory');

        // Get equipped items
        const face = this.equippedItems.face ? this.shopItems.faces.find(i => i.id === this.equippedItems.face) : null;
        const hair = this.equippedItems.hair ? this.shopItems.hair.find(i => i.id === this.equippedItems.hair) : null;
        const hat = this.equippedItems.hat ? this.shopItems.hats.find(i => i.id === this.equippedItems.hat) : null;
        const vest = this.equippedItems.vest ? this.shopItems.vests.find(i => i.id === this.equippedItems.vest) : null;
        const pant = this.equippedItems.pant ? this.shopItems.pants.find(i => i.id === this.equippedItems.pant) : null;
        const shoe = this.equippedItems.shoe ? this.shopItems.shoes.find(i => i.id === this.equippedItems.shoe) : null;
        const accessory = this.equippedItems.accessory ? this.shopItems.accessories.find(i => i.id === this.equippedItems.accessory) : null;

        // Update display - only show if item exists and is not 'none'
        if (faceEl) faceEl.textContent = face ? face.icon : '';
        if (hairEl) hairEl.textContent = hair && hair.id !== 'none' ? hair.icon : '';
        if (hatEl) hatEl.textContent = hat && hat.id !== 'none' ? hat.icon : '';
        if (vestEl) vestEl.textContent = vest && vest.id !== 'none' ? vest.icon : '';
        if (pantsEl) pantsEl.textContent = pant && pant.id !== 'none' ? pant.icon : '';
        if (shoesEl) shoesEl.textContent = shoe && shoe.id !== 'none' ? shoe.icon : '';
        if (accessoryEl) accessoryEl.textContent = accessory && accessory.id !== 'none' ? accessory.icon : '';
    }

    // Achievements system
    initializeAchievements() {
        return [
            // Beginner Achievements
            { id: 'first_win', name: 'First Victory', description: 'Complete your first quiz', icon: '🎉', condition: (data) => data.quizzesCompleted >= 1 },
            { id: 'getting_started', name: 'Getting Started', description: 'Complete 5 quizzes', icon: '🌱', condition: (data) => data.quizzesCompleted >= 5 },
            { id: 'dedicated_learner', name: 'Dedicated Learner', description: 'Complete 10 quizzes', icon: '📖', condition: (data) => data.quizzesCompleted >= 10 },
            { id: 'quiz_enthusiast', name: 'Quiz Enthusiast', description: 'Complete 25 quizzes', icon: '🎯', condition: (data) => data.quizzesCompleted >= 25 },
            { id: 'half_century', name: 'Half Century', description: 'Complete 50 quizzes', icon: '🏅', condition: (data) => data.quizzesCompleted >= 50 },
            { id: 'century_club', name: '100th Win', description: 'Complete 100 quizzes', icon: '💪', condition: (data) => data.quizzesCompleted >= 100 },
            { id: 'quiz_veteran', name: 'Quiz Veteran', description: 'Complete 250 quizzes', icon: '🎖️', condition: (data) => data.quizzesCompleted >= 250 },
            { id: 'quiz_legend', name: 'Quiz Legend', description: 'Complete 500 quizzes', icon: '🏆', condition: (data) => data.quizzesCompleted >= 500 },

            // Accuracy Achievements
            { id: 'perfect_score', name: '100% Accuracy', description: 'Get all questions right in a quiz', icon: '💯', condition: (data) => data.perfectScores >= 1 },
            { id: 'perfectionist', name: 'Perfectionist', description: 'Get 100% accuracy 5 times', icon: '✨', condition: (data) => data.perfectScores >= 5 },
            { id: 'flawless_master', name: 'Flawless Master', description: 'Get 100% accuracy 10 times', icon: '💎', condition: (data) => data.perfectScores >= 10 },
            { id: 'accuracy_expert', name: 'Accuracy Expert', description: 'Get 100% accuracy 25 times', icon: '🎯', condition: (data) => data.perfectScores >= 25 },

            // Quiz Length Achievements
            { id: 'quick_learner', name: 'Quick Learner', description: 'Complete a 20-question quiz', icon: '⚡', condition: (data) => data.quickQuizzes >= 1 },
            { id: 'standard_student', name: 'Standard Student', description: 'Complete a 30-question quiz', icon: '📚', condition: (data) => data.standardQuizzes >= 1 },
            { id: 'extended_effort', name: 'Extended Effort', description: 'Complete a 40-question quiz', icon: '🔥', condition: (data) => data.extendedQuizzes >= 1 },
            { id: 'challenge_accepted', name: 'Challenge Accepted', description: 'Complete a 50-question quiz', icon: '💪', condition: (data) => data.challengeQuizzes >= 1 },
            { id: 'expert_endurance', name: 'Expert Endurance', description: 'Complete a 60-question quiz', icon: '🏋️', condition: (data) => data.expertQuizzes >= 1 },
            { id: 'marathon_runner', name: 'Marathon Runner', description: 'Complete a 100-question quiz', icon: '🏃‍♂️', condition: (data) => data.marathonCompleted >= 1 },
            { id: 'perfect_marathon', name: 'Perfect Marathon', description: 'Get 100% on a 100-question quiz', icon: '🏆', condition: (data) => data.perfectMarathons >= 1 },
            { id: 'marathon_master', name: 'Marathon Master', description: 'Complete 10 marathon quizzes', icon: '🎖️', condition: (data) => data.marathonCompleted >= 10 },

            // Speed Achievements
            { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a quiz in under 2 minutes', icon: '⚡', condition: (data) => data.fastestTime <= 120 },
            { id: 'lightning_fast', name: 'Lightning Fast', description: 'Complete a quiz in under 1 minute', icon: '⚡', condition: (data) => data.fastestTime <= 60 },
            { id: 'flash_gordon', name: 'Flash Gordon', description: 'Complete a quiz in under 30 seconds', icon: '💨', condition: (data) => data.fastestTime <= 30 },

            // Subject Mastery Achievements
            { id: 'math_master', name: 'Math Master', description: 'Complete 10 math quizzes', icon: '🔢', condition: (data) => (data.subjectStats?.math || 0) >= 10 },
            { id: 'physics_genius', name: 'Physics Genius', description: 'Complete 10 physics quizzes', icon: '⚛️', condition: (data) => (data.subjectStats?.physics || 0) >= 10 },
            { id: 'chemistry_wizard', name: 'Chemistry Wizard', description: 'Complete 10 chemistry quizzes', icon: '🧪', condition: (data) => (data.subjectStats?.chemistry || 0) >= 10 },
            { id: 'coding_ninja', name: 'Coding Ninja', description: 'Complete 10 coding quizzes', icon: '💻', condition: (data) => (data.subjectStats?.coding || 0) >= 10 },
            { id: 'history_buff', name: 'History Buff', description: 'Complete 10 history quizzes', icon: '📜', condition: (data) => (data.subjectStats?.history || 0) >= 10 },
            { id: 'biology_expert', name: 'Biology Expert', description: 'Complete 10 biology quizzes', icon: '🧬', condition: (data) => (data.subjectStats?.biology || 0) >= 10 },
            { id: 'trivia_champion', name: 'Trivia Champion', description: 'Complete 10 trivia quizzes', icon: '🎪', condition: (data) => (data.subjectStats?.trivia || 0) >= 10 },
            { id: 'knowledge_seeker', name: 'Knowledge Seeker', description: 'Try all subject categories', icon: '📚', condition: (data) => data.subjectsPlayed >= 7 },
            { id: 'renaissance_mind', name: 'Renaissance Mind', description: 'Master all subjects (10 each)', icon: '🎨', condition: (data) => data.subjectsPlayed >= 7 && Object.values(data.subjectStats || {}).every(count => count >= 10) },

            // Streak Achievements
            { id: 'winning_streak', name: 'Winning Streak', description: 'Win 3 quizzes in a row', icon: '🔥', condition: (data) => data.winStreak >= 3 },
            { id: 'hot_streak', name: 'Hot Streak', description: 'Win 5 quizzes in a row', icon: '🔥', condition: (data) => data.winStreak >= 5 },
            { id: 'streak_master', name: 'Streak Master', description: 'Win 10 quizzes in a row', icon: '🔥', condition: (data) => data.winStreak >= 10 },
            { id: 'unstoppable', name: 'Unstoppable', description: 'Win 20 quizzes in a row', icon: '🚀', condition: (data) => data.winStreak >= 20 },

            // Score Achievements
            { id: 'first_hundred', name: 'First Hundred', description: 'Reach 100 total score', icon: '💯', condition: (data) => data.totalScore >= 100 },
            { id: 'five_hundred_club', name: '500 Club', description: 'Reach 500 total score', icon: '🎯', condition: (data) => data.totalScore >= 500 },
            { id: 'thousand_points', name: 'Thousand Points', description: 'Reach 1000 total score', icon: '🌟', condition: (data) => data.totalScore >= 1000 },
            { id: 'quiz_master', name: 'Quiz Master', description: 'Reach 2000 total score', icon: '🎓', condition: (data) => data.totalScore >= 2000 },
            { id: 'score_titan', name: 'Score Titan', description: 'Reach 5000 total score', icon: '⭐', condition: (data) => data.totalScore >= 5000 },
            { id: 'point_legend', name: 'Point Legend', description: 'Reach 10000 total score', icon: '🌠', condition: (data) => data.totalScore >= 10000 },

            // Avatar Achievements
            { id: 'scholar_unlocked', name: 'Scholar Unlocked', description: 'Unlock the Scholar avatar', icon: '📚', condition: (data) => data.unlockedAvatars.includes('scholar') },
            { id: 'genius_unlocked', name: 'Genius Unlocked', description: 'Unlock the Genius avatar', icon: '🧠', condition: (data) => data.unlockedAvatars.includes('genius') },
            { id: 'wizard_unlocked', name: 'Wizard Unlocked', description: 'Unlock the Wizard avatar', icon: '🧙‍♂️', condition: (data) => data.unlockedAvatars.includes('wizard') },
            { id: 'scientist_unlocked', name: 'Scientist Unlocked', description: 'Unlock the Scientist avatar', icon: '🔬', condition: (data) => data.unlockedAvatars.includes('scientist') },
            { id: 'professor_unlocked', name: 'Professor Unlocked', description: 'Unlock the Professor avatar', icon: '👨‍🏫', condition: (data) => data.unlockedAvatars.includes('professor') },
            { id: 'einstein_mode', name: 'Einstein Mode', description: 'Unlock the Einstein avatar', icon: '🤓', condition: (data) => data.unlockedAvatars.includes('einstein') },
            { id: 'oracle_wisdom', name: 'Oracle Wisdom', description: 'Unlock the Oracle avatar', icon: '🔮', condition: (data) => data.unlockedAvatars.includes('oracle') },
            { id: 'legend_status', name: 'Legend Status', description: 'Unlock the Legend avatar', icon: '👑', condition: (data) => data.unlockedAvatars.includes('legend') },
            { id: 'immortal_being', name: 'Immortal Being', description: 'Unlock the Immortal avatar', icon: '⚡', condition: (data) => data.unlockedAvatars.includes('immortal') },
            { id: 'avatar_collector', name: 'Avatar Collector', description: 'Unlock 5 different avatars', icon: '🎭', condition: (data) => data.unlockedAvatars.length >= 5 },
            { id: 'avatar_master', name: 'Avatar Master', description: 'Unlock all avatars', icon: '👥', condition: (data) => data.unlockedAvatars.length >= 10 },

            // Special Achievements
            { id: 'night_owl', name: 'Night Owl', description: 'Complete a quiz after midnight', icon: '🦉', condition: (data) => data.nightQuizzes >= 1 },
            { id: 'early_bird', name: 'Early Bird', description: 'Complete a quiz before 6 AM', icon: '🐦', condition: (data) => data.earlyQuizzes >= 1 },
            { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Complete 10 quizzes on weekends', icon: '🏖️', condition: (data) => data.weekendQuizzes >= 10 },
            { id: 'daily_grind', name: 'Daily Grind', description: 'Complete quizzes on 7 consecutive days', icon: '📅', condition: (data) => data.consecutiveDays >= 7 },
            { id: 'monthly_champion', name: 'Monthly Champion', description: 'Complete 30 quizzes in one month', icon: '🗓️', condition: (data) => data.monthlyRecord >= 30 },
            { id: 'comeback_kid', name: 'Comeback Kid', description: 'Win a quiz with only 1 life remaining', icon: '💪', condition: (data) => data.comebacks >= 1 },
            { id: 'lucky_seven', name: 'Lucky Seven', description: 'Complete exactly 7 quizzes', icon: '🍀', condition: (data) => data.quizzesCompleted === 7 },
            { id: 'custom_creator', name: 'Custom Creator', description: 'Upload and complete a custom quiz', icon: '🎨', condition: (data) => data.customQuizzesCompleted >= 1 },

            // AI Competitor Achievements
            { id: 'easy_bot_defeated', name: 'Bot Beginner', description: 'Defeat the Easy Bot', icon: '🤖', condition: (data) => data.aiDefeated?.easy >= 1 },
            { id: 'medium_bot_defeated', name: 'Bot Challenger', description: 'Defeat the Medium Bot', icon: '🤖', condition: (data) => data.aiDefeated?.medium >= 1 },
            { id: 'hard_bot_defeated', name: 'Bot Warrior', description: 'Defeat the Hard Bot', icon: '🤖', condition: (data) => data.aiDefeated?.hard >= 1 },
            { id: 'insane_bot_defeated', name: 'Bot Destroyer', description: 'Defeat the Insane Bot', icon: '🤖', condition: (data) => data.aiDefeated?.insane >= 1 },
            { id: 'cheaters_never_win', name: 'Cheaters Never Win', description: 'Defeat the Cheater Bot', icon: '⚖️', condition: (data) => data.aiDefeated?.cheater >= 1 },
            { id: 'mr_electro_defeated', name: 'Shock Therapy', description: 'Defeat Mr. Electro', icon: '⚡', condition: (data) => data.aiDefeated?.mrelectro >= 1 },
            { id: 'hacker_beater', name: 'Hacker Beater', description: 'Defeat the Hacker Bot with speed', icon: '💻', condition: (data) => data.aiDefeated?.hacker >= 1 },
            {
                id: 'ai_dominator', name: 'AI Dominator', description: 'Defeat all AI competitors', icon: '👑', condition: (data) => {
                    const defeated = data.aiDefeated || {};
                    return ['easy', 'medium', 'hard', 'insane', 'cheater', 'mrelectro', 'hacker'].every(ai => defeated[ai] >= 1);
                }
            },

            // Boss Battle Achievements
            { id: 'euler_defeated', name: 'Mathematical Genius', description: 'Defeat Euler with 100% accuracy', icon: '📐', condition: (data) => data.bossesDefeated?.euler === true, reward: 1000 },
            { id: 'mendeleev_defeated', name: 'Periodic Master', description: 'Defeat Mendeleev with 100% accuracy', icon: '⚗️', condition: (data) => data.bossesDefeated?.mendeleev === true, reward: 1000 },
            { id: 'einstein_defeated', name: 'Relativity Expert', description: 'Defeat Einstein with 100% accuracy', icon: '⚛️', condition: (data) => data.bossesDefeated?.einstein === true, reward: 1000 },
            { id: 'darwin_defeated', name: 'Evolution Champion', description: 'Defeat Darwin with 100% accuracy', icon: '🦎', condition: (data) => data.bossesDefeated?.darwin === true, reward: 1000 },
            { id: 'shakespeare_defeated', name: 'Literary Master', description: 'Defeat Shakespeare with 100% accuracy', icon: '📚', condition: (data) => data.bossesDefeated?.shakespeare === true, reward: 1000 },
            { id: 'napoleon_defeated', name: 'Strategic Conqueror', description: 'Defeat Napoleon with 100% accuracy', icon: '⚔️', condition: (data) => data.bossesDefeated?.napoleon === true, reward: 1000 },
            { id: 'davinci_defeated', name: 'Renaissance Scholar', description: 'Defeat Da Vinci with 100% accuracy', icon: '🎨', condition: (data) => data.bossesDefeated?.davinci === true, reward: 1000 },
            { id: 'lovelace_defeated', name: 'Programming Pioneer', description: 'Defeat Ada Lovelace with 100% accuracy', icon: '💻', condition: (data) => data.bossesDefeated?.lovelace === true, reward: 1000 },
            {
                id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat all 8 bosses', icon: '👑', condition: (data) => {
                    const bosses = data.bossesDefeated || {};
                    return ['euler', 'mendeleev', 'einstein', 'darwin', 'shakespeare', 'napoleon', 'davinci', 'lovelace'].every(boss => bosses[boss] === true);
                }, reward: 5000
            },

            // Impossible Quiz Achievement
            { id: 'impossible_survivor', name: 'Impossible Survivor', description: 'Complete a 120-question quiz', icon: '💀', condition: (data) => data.impossibleQuizzes >= 1 },
            { id: 'impossible_master', name: 'Impossible Master', description: 'Get 100% on impossible quiz', icon: '☠️', condition: (data) => data.perfectImpossible >= 1 },

            // Daily Challenge Achievements
            { id: 'daily_starter', name: 'Daily Starter', description: 'Complete your first daily challenge', icon: '📅', condition: (data) => data.dailyChallengesCompleted >= 1 },
            { id: 'daily_dedication', name: 'Daily Dedication', description: 'Complete 7 daily challenges', icon: '🗓️', condition: (data) => data.dailyChallengesCompleted >= 7 },
            { id: 'monthly_challenger', name: 'Monthly Challenger', description: 'Complete 30 daily challenges', icon: '📆', condition: (data) => data.dailyChallengesCompleted >= 30 },
            { id: 'daily_perfectionist', name: 'Daily Perfectionist', description: 'Get 100% on a daily challenge', icon: '⭐', condition: (data) => data.perfectDailies >= 1 },
            { id: 'streak_warrior', name: 'Streak Warrior', description: 'Complete 7 consecutive daily challenges', icon: '🔥', condition: (data) => data.dailyStreak >= 7 },
            { id: 'streak_legend', name: 'Streak Legend', description: 'Complete 30 consecutive daily challenges', icon: '🏆', condition: (data) => data.dailyStreak >= 30 },
            { id: 'time_traveler', name: 'Time Traveler', description: 'Complete a challenge from 30 days ago', icon: '⏰', condition: (data) => data.oldestChallengeCompleted >= 30 },
            {
                id: 'historian', name: 'Historian', description: 'Complete challenges from all 7 days of the week', icon: '📚', condition: (data) => {
                    const completed = data.dailyChallengesByDay || {};
                    return Object.keys(completed).length >= 7;
                }
            },
            { id: 'cycle_master', name: 'Cycle Master', description: 'Complete a full 28-day cycle', icon: '🔄', condition: (data) => data.completedCycles >= 1 },
            { id: 'daily_legend', name: 'Daily Legend', description: 'Complete 100 daily challenges', icon: '👑', condition: (data) => data.dailyChallengesCompleted >= 100 },

            // Cheat Code Achievement (negative reward)
            { id: 'cheater_scum', name: 'Cheater Scum', description: 'Used the cheat code. Shame on you!', icon: '💀', condition: (data) => data.cheatCodeUsed === true, reward: -10000 }
        ];
    }

    checkAchievements() {
        // Safety checks
        if (!this.playerData) {
            console.error('playerData is undefined in checkAchievements');
            return;
        }

        // Ensure achievements array exists
        if (!this.playerData.achievements) {
            this.playerData.achievements = [];
        }

        const newAchievements = [];
        this.achievements.forEach(achievement => {
            if (!this.playerData.achievements.includes(achievement.id) &&
                achievement.condition(this.playerData)) {
                this.playerData.achievements.push(achievement.id);
                newAchievements.push(achievement);

                // Award coins for achievement
                const coinReward = achievement.reward || 100;
                this.playerData.totalScore += coinReward;
            }
        });

        if (newAchievements.length > 0) {
            this.savePlayerData();
            this.renderAchievements();
            newAchievements.forEach(achievement => {
                this.showAchievementUnlock(achievement);
            });
        }
    }

    showAchievementUnlock(achievement) {
        const coinReward = achievement.reward || 100;
        const notification = document.createElement('div');
        notification.className = 'achievement-unlock-notification';
        notification.innerHTML = `
            <div class="unlock-content">
                <div class="unlock-icon">${achievement.icon}</div>
                <div class="unlock-text">
                    <h3>Achievement Unlocked!</h3>
                    <p>${achievement.name}</p>
                    <small>${achievement.description}</small>
                    <div style="color: #ffd700; font-weight: bold; margin-top: 5px;">+${coinReward} coins</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 4000);
    }

    renderAchievements() {
        const container = document.getElementById('achievements-container');
        if (!container) return;

        const unlockedAchievements = this.achievements.filter(a =>
            this.playerData.achievements.includes(a.id)
        );

        const lockedAchievements = this.achievements.filter(a =>
            !this.playerData.achievements.includes(a.id)
        );

        container.innerHTML = `
            ${unlockedAchievements.map(achievement => `
                <div class="achievement-item unlocked">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <h4>${achievement.name}</h4>
                        <p>${achievement.description}</p>
                    </div>
                </div>
            `).join('')}
            ${lockedAchievements.slice(0, 6).map(achievement => `
                <div class="achievement-item locked">
                    <div class="achievement-icon">🔒</div>
                    <div class="achievement-info">
                        <h4>???</h4>
                        <p>${achievement.description}</p>
                    </div>
                </div>
            `).join('')}
        `;
    }

    // Updated avatar rendering for new layout
    renderAvatar() {
        let currentAvatar = this.avatars.find(a => a.id === this.playerData.currentAvatar);

        // If no avatar found, default to first avatar
        if (!currentAvatar) {
            console.warn('Current avatar not found, defaulting to first avatar');
            currentAvatar = this.avatars[0];
            this.playerData.currentAvatar = currentAvatar.id;
        }

        // Update main avatar display
        const avatarEmoji = document.getElementById('current-avatar-emoji');
        const avatarName = document.getElementById('current-avatar-name');
        const avatarDescription = document.getElementById('current-avatar-description');

        if (avatarEmoji) avatarEmoji.textContent = currentAvatar.emoji;
        if (avatarName) avatarName.textContent = currentAvatar.name;
        if (avatarDescription) avatarDescription.textContent = currentAvatar.description;

        // Update stats
        const totalScore = document.getElementById('total-score-display');
        const bestScore = document.getElementById('best-score-display');
        const avatarsCount = document.getElementById('avatars-count-display');

        if (totalScore) totalScore.textContent = this.playerData.totalScore;
        if (bestScore) bestScore.textContent = this.playerData.highestScore;
        if (avatarsCount) avatarsCount.textContent = `${this.playerData.unlockedAvatars.length}/${this.avatars.length}`;

        this.renderAvatarGrid();
        this.renderAvatarProgression();
    }

    renderAvatarProgression() {
        const progressionList = document.getElementById('avatar-progression-list');
        if (!progressionList) return;

        // Safety check for avatars
        if (!this.avatars || !Array.isArray(this.avatars)) {
            console.warn('Avatars not initialized yet');
            return;
        }

        progressionList.innerHTML = this.avatars.map(avatar => {
            const isUnlocked = this.playerData.unlockedAvatars.includes(avatar.id);
            const isCurrent = this.playerData.currentAvatar === avatar.id;
            const progress = Math.min(100, (this.playerData.totalScore / avatar.unlockScore) * 100);

            return `
                <div class="progression-item ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}" 
                     style="padding: 10px; margin-bottom: 10px; background: ${isCurrent ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)'}; 
                            border-radius: 10px; border: 2px solid ${isCurrent ? '#FFD700' : isUnlocked ? '#4CAF50' : '#666'}; cursor: ${isUnlocked ? 'pointer' : 'default'};"
                     ${isUnlocked ? `onclick="game.selectAvatar('${avatar.id}')"` : ''}>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <div style="font-size: 2rem;">${isUnlocked ? avatar.emoji : '🔒'}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; font-size: 0.9rem;">${avatar.name}</div>
                            <div style="font-size: 0.75rem; opacity: 0.8;">${isUnlocked ? avatar.description : `${avatar.unlockScore} pts`}</div>
                        </div>
                        ${isCurrent ? '<div style="color: #FFD700;">✓</div>' : ''}
                    </div>
                    ${!isUnlocked ? `
                        <div style="background: rgba(0,0,0,0.3); border-radius: 5px; height: 6px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, #4CAF50, #8BC34A); height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
                        </div>
                        <div style="font-size: 0.7rem; text-align: center; margin-top: 3px; opacity: 0.7;">${Math.floor(progress)}%</div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    renderAvatarGrid() {
        const grid = document.getElementById('avatar-grid');
        if (!grid) return;

        // Safety check for avatars
        if (!this.avatars || !Array.isArray(this.avatars)) {
            console.warn('Avatars not initialized yet');
            return;
        }

        grid.innerHTML = this.avatars.map(avatar => {
            const isUnlocked = this.playerData.unlockedAvatars.includes(avatar.id);
            const isCurrent = this.playerData.currentAvatar === avatar.id;

            return `
                <div class="avatar-grid-item ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}" 
                     data-avatar="${avatar.id}" title="${avatar.name}">
                    <div class="avatar-grid-emoji">${isUnlocked ? avatar.emoji : '🔒'}</div>
                </div>
            `;
        }).join('');

        // Add click handlers
        grid.querySelectorAll('.avatar-grid-item.unlocked').forEach(item => {
            item.addEventListener('click', () => {
                const avatarId = item.dataset.avatar;
                this.selectAvatar(avatarId);
            });
        });
    }

    // Update player data structure and tracking
    updatePlayerScore(newScore) {
        const endTime = new Date();
        const duration = Math.round((endTime - this.startTime) / 1000);
        const currentHour = endTime.getHours();
        const isWeekend = endTime.getDay() === 0 || endTime.getDay() === 6;

        // Determine if player actually won (completed the quiz successfully)
        const won = this.questionsAnswered >= this.maxQuestions && this.lives > 0;

        // Process cheat debt before adding score
        const actualScore = this.processCheatDebt(newScore);

        // Show debt notification if points were deducted
        if (actualScore < newScore && this.playerData.cheatDebt > 0) {
            setTimeout(() => {
                alert(`⚠️ Cheat Debt: ${newScore - actualScore} points deducted\n${this.playerData.cheatDebt} points remaining until debt is paid`);
            }, 500);
        }

        // Add actual score (after debt processing)
        this.playerData.totalScore += actualScore;
        if (newScore > this.playerData.highestScore) {
            this.playerData.highestScore = newScore;
        }

        // Only track completions and achievements if player WON
        if (!won) {
            // Player lost - only reset win streak
            this.playerData.winStreak = 0;

            // Still check for avatar unlocks and achievements based on total score
            this.checkAvatarUnlocks();
            this.checkAchievements();
            this.savePlayerData();
            this.renderAvatar();
            return; // Don't track any other stats for losses
        }

        // From here on, only winners get tracked!

        // Quiz completion tracking (only wins)
        this.playerData.quizzesCompleted = (this.playerData.quizzesCompleted || 0) + 1;

        // Perfect score tracking
        if (newScore === this.maxQuestions) {
            this.playerData.perfectScores = (this.playerData.perfectScores || 0) + 1;
        }

        // Quiz length tracking (only completed quizzes)
        switch (this.maxQuestions) {
            case 20:
                this.playerData.quickQuizzes = (this.playerData.quickQuizzes || 0) + 1;
                break;
            case 30:
                this.playerData.standardQuizzes = (this.playerData.standardQuizzes || 0) + 1;
                break;
            case 40:
                this.playerData.extendedQuizzes = (this.playerData.extendedQuizzes || 0) + 1;
                break;
            case 50:
                this.playerData.challengeQuizzes = (this.playerData.challengeQuizzes || 0) + 1;
                break;
            case 60:
                this.playerData.expertQuizzes = (this.playerData.expertQuizzes || 0) + 1;
                break;
            case 100:
                this.playerData.marathonCompleted = (this.playerData.marathonCompleted || 0) + 1;
                if (newScore === 100) {
                    this.playerData.perfectMarathons = (this.playerData.perfectMarathons || 0) + 1;
                }
                break;
            case 120:
                this.playerData.impossibleQuizzes = (this.playerData.impossibleQuizzes || 0) + 1;
                if (newScore === 120) {
                    this.playerData.perfectImpossible = (this.playerData.perfectImpossible || 0) + 1;
                }
                break;
        }

        // Speed tracking (only for completed quizzes)
        if (duration < this.playerData.fastestTime) {
            this.playerData.fastestTime = duration;
        }

        // Subject tracking (only completed quizzes)
        if (!this.playerData.subjectStats) {
            this.playerData.subjectStats = {};
        }
        this.playerData.subjectStats[this.currentSubject] = (this.playerData.subjectStats[this.currentSubject] || 0) + 1;

        const subjectsSet = new Set(this.playerData.subjectsPlayedList || []);
        subjectsSet.add(this.currentSubject);
        this.playerData.subjectsPlayedList = Array.from(subjectsSet);
        this.playerData.subjectsPlayed = this.playerData.subjectsPlayedList.length;

        // Time-based tracking (only completed quizzes)
        if (currentHour >= 0 && currentHour < 6) {
            this.playerData.earlyQuizzes = (this.playerData.earlyQuizzes || 0) + 1;
        }
        if (currentHour >= 0 && currentHour < 6) {
            this.playerData.nightQuizzes = (this.playerData.nightQuizzes || 0) + 1;
        }
        if (isWeekend) {
            this.playerData.weekendQuizzes = (this.playerData.weekendQuizzes || 0) + 1;
        }

        // Custom quiz tracking (only completed)
        if (this.currentSubject === 'custom') {
            this.playerData.customQuizzesCompleted = (this.playerData.customQuizzesCompleted || 0) + 1;
        }

        // Win streak tracking
        this.playerData.winStreak = (this.playerData.winStreak || 0) + 1;

        // Comeback tracking (if won with only 1 life remaining)
        if (this.lives === 1) {
            this.playerData.comebacks = (this.playerData.comebacks || 0) + 1;
        }

        // Update last play date
        this.playerData.lastPlayDate = endTime.toDateString();

        // Check for new avatar unlocks and achievements
        this.checkAvatarUnlocks();
        this.checkAchievements();
        this.savePlayerData();
        this.renderAvatar();
    }

    // Account System
    initializeAccountSystem() {
        this.accounts = this.loadAccounts();
        // Delay binding to ensure DOM is ready
        setTimeout(() => this.bindAccountEvents(), 100);
    }

    loadAccounts() {
        const saved = localStorage.getItem('quizAccounts');
        return saved ? JSON.parse(saved) : {};
    }

    saveAccounts() {
        localStorage.setItem('quizAccounts', JSON.stringify(this.accounts));
    }

    showInitialScreen() {
        console.log('showInitialScreen - skipAccount:', this.playerData.skipAccount, 'currentAccount:', this.playerData.currentAccount);
        if (this.playerData.skipAccount || this.playerData.currentAccount) {
            console.log('Skipping account screen, going to home');
            this.showNavigation();
            this.showScreen('home-screen');
            this.updateNavPoints();
            this.updateCoinsDisplay();
        } else {
            console.log('Showing account screen');
            this.hideNavigation();
            this.showScreen('account-screen');
            // Re-bind events to ensure they work
            setTimeout(() => this.bindAccountEvents(), 50);
        }
    }

    showNavigation() {
        const nav = document.getElementById('main-nav');
        if (nav) nav.classList.remove('hidden');
    }

    hideNavigation() {
        const nav = document.getElementById('main-nav');
        if (nav) nav.classList.add('hidden');
    }

    bindAccountEvents() {
        console.log('Binding account events...');

        // Form tab switching
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchAccountTab(tabName);
            });
        });

        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            console.log('Adding login listener');
            loginBtn.onclick = (e) => {
                e.preventDefault();
                console.log('Login button clicked!');
                this.handleLogin();
            };
        } else {
            console.error('Login button not found!');
        }

        // Register button
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            console.log('Adding register listener');
            registerBtn.onclick = (e) => {
                e.preventDefault();
                console.log('Register button clicked!');
                this.handleRegister();
            };
        } else {
            console.error('Register button not found!');
        }

        // Skip button
        const skipBtn = document.getElementById('skip-account-btn');
        if (skipBtn) {
            console.log('Adding skip listener');
            skipBtn.onclick = (e) => {
                e.preventDefault();
                console.log('Skip button clicked!');
                this.handleSkipAccount();
            };
        } else {
            console.error('Skip button not found!');
        }

        // Clear all data button
        const clearAllDataBtn = document.getElementById('clear-all-data-btn');
        if (clearAllDataBtn) {
            clearAllDataBtn.onclick = () => this.clearAllData();
        }

        // Enter key support for login
        const loginUsername = document.getElementById('login-username');
        const loginPassword = document.getElementById('login-password');
        if (loginUsername && loginPassword) {
            [loginUsername, loginPassword].forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleLogin();
                    }
                });
            });
        }

        // Enter key support for register
        const registerInputs = [
            document.getElementById('register-username'),
            document.getElementById('register-email'),
            document.getElementById('register-password'),
            document.getElementById('register-confirm')
        ];
        registerInputs.forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleRegister();
                    }
                });
            }
        });
    }

    switchAccountTab(tabName) {
        document.querySelectorAll('.form-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.account-form').forEach(form => form.classList.remove('active'));

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-form`).classList.add('active');
    }

    handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }

        if (this.accounts[username] && this.accounts[username].password === password) {
            this.playerData = { ...this.loadPlayerData(), ...this.accounts[username].data };
            this.playerData.currentAccount = username;
            this.savePlayerData();
            this.showNavigation();
            this.showScreen('home-screen');
            this.updateNavPoints();
            this.updateCoinsDisplay();
            this.renderAvatar();
            this.renderAchievements();
        } else {
            alert('Invalid username or password');
        }
    }

    handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        // Validate all fields are filled
        if (!username || !email || !password || !confirm) {
            alert('Please fill in all fields');
            return;
        }

        // Validate username (3-20 characters, alphanumeric and underscore only)
        if (username.length < 3 || username.length > 20) {
            alert('Username must be between 3 and 20 characters');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            alert('Username can only contain letters, numbers, and underscores');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address (e.g., user@example.com)');
            return;
        }

        // Check for common fake email patterns
        const suspiciousPatterns = [
            /test@/i,
            /fake@/i,
            /dummy@/i,
            /example@/i,
            /temp@/i
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(email))) {
            if (!confirm('This email looks like a test email. Are you sure you want to use it?')) {
                return;
            }
        }

        // Validate password strength (minimum 6 characters)
        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        // Check passwords match
        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }

        // Check if username already exists
        if (this.accounts[username]) {
            alert('Username already exists. Please choose a different username.');
            return;
        }

        // Check if email is already registered
        const existingAccount = Object.values(this.accounts).find(acc => acc.email === email);
        if (existingAccount) {
            alert('This email is already registered. Please use a different email or login.');
            return;
        }

        this.accounts[username] = {
            email: email,
            password: password,
            data: this.loadPlayerData()
        };

        this.accounts[username].data.currentAccount = username;
        this.saveAccounts();
        this.playerData = this.accounts[username].data;
        this.savePlayerData();

        this.showNavigation();
        this.showScreen('home-screen');
        this.updateNavPoints();
        this.updateCoinsDisplay();
        this.renderAvatar();
        this.renderAchievements();
    }

    handleSkipAccount() {
        const dontShowAgain = document.getElementById('dont-show-again').checked;
        if (dontShowAgain) {
            this.playerData.skipAccount = true;
            this.savePlayerData();
        }
        this.showNavigation();
        this.showScreen('home-screen');
        this.updateNavPoints();
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.playerData.currentAccount = null;
            this.playerData.skipAccount = false;
            this.savePlayerData();
            this.closeSettings();
            location.reload();
        }
    }

    clearAllData() {
        if (confirm('⚠️ WARNING: This will delete ALL accounts, progress, and data. This cannot be undone!\n\nAre you absolutely sure?')) {
            if (confirm('Last chance! Delete everything?')) {
                localStorage.clear();
                alert('All data has been cleared. The page will now reload.');
                location.reload();
            }
        }
    }

    openSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            // Update stats
            document.getElementById('settings-total-score').textContent = this.playerData.totalScore || 0;
            document.getElementById('settings-quizzes').textContent = this.playerData.quizzesCompleted || 0;
            document.getElementById('settings-achievements').textContent = this.playerData.achievements?.length || 0;
            document.getElementById('settings-account').textContent = this.playerData.currentAccount || 'Guest';

            // Sync toggle states
            const themeToggle = document.getElementById('settings-theme-toggle');
            const soundToggle = document.getElementById('settings-sound-toggle');
            const timerToggle = document.getElementById('settings-timer-toggle');
            const curveballToggle = document.getElementById('settings-curveball-toggle');
            const studyToggle = document.getElementById('settings-study-toggle');
            const infiniteHeartToggle = document.getElementById('settings-infinite-heart-toggle');

            if (themeToggle) themeToggle.checked = this.darkTheme;
            if (soundToggle) soundToggle.checked = this.soundEnabled;
            if (timerToggle) timerToggle.checked = this.timerEnabled;
            if (curveballToggle) curveballToggle.checked = this.curveballsEnabled;
            if (studyToggle) studyToggle.checked = this.studyModeEnabled;
            if (infiniteHeartToggle) infiniteHeartToggle.checked = this.infiniteLives;

            modal.classList.remove('hidden');
        }
    }

    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    resetProgress() {
        if (confirm('⚠️ WARNING!\n\nThis will delete ALL your progress, achievements, coins, and items!\n\nAre you absolutely sure?')) {
            if (confirm('🚨 FINAL WARNING!\n\nThis action CANNOT be undone!\n\nDelete everything?')) {
                // Reset all player data
                this.playerData = {
                    totalScore: 0,
                    coins: 0,
                    achievements: [],
                    unlockedItems: [],
                    quizzesCompleted: 0,
                    currentAccount: this.playerData.currentAccount || 'Guest',
                    codesUsed: {}
                };
                this.savePlayerData();
                alert('✅ All progress has been reset!');
                this.closeSettings();
                location.reload();
            }
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.closeSettings();
            this.showScreen('account-screen');
            document.getElementById('main-nav').classList.add('hidden');
        }
    }

    initializeTheme() {
        if (this.darkTheme) {
            document.body.classList.add('dark-theme');
        }
    }

    toggleTheme() {
        this.darkTheme = !this.darkTheme;
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('darkTheme', this.darkTheme);

        // Update settings modal toggle if open
        const settingsTheme = document.getElementById('settings-theme-toggle');
        if (settingsTheme) {
            settingsTheme.checked = this.darkTheme;
        }

        this.playSound('click');
    }

    initializeSounds() {
        // Create audio context for sound effects
        this.sounds = {
            correct: this.createBeep(800, 0.2, 'sine'),
            incorrect: this.createBeep(200, 0.3, 'sawtooth'),
            click: this.createBeep(400, 0.1, 'square'),
            achievement: this.createBeep(1000, 0.4, 'sine'),
            powerup: this.createBeep(600, 0.2, 'triangle')
        };

    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('soundEnabled', this.soundEnabled);

        // Update settings modal toggle if open
        const settingsSound = document.getElementById('settings-sound-toggle');
        if (settingsSound) {
            settingsSound.checked = this.soundEnabled;
        }

        if (this.soundEnabled) {
            this.playSound('click');
        }
    }

    createBeep(frequency, duration, type = 'sine') {
        return { frequency, duration, type };
    }

    playSound(soundName) {
        if (!this.soundEnabled) return;

        const sound = this.sounds[soundName];
        if (!sound) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = sound.frequency;
            oscillator.type = sound.type;

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + sound.duration);
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    initializeTimer() {
        // Timer is now controlled only through settings modal
    }

    toggleTimer() {
        this.timerEnabled = !this.timerEnabled;
        localStorage.setItem('timerEnabled', this.timerEnabled);

        const timerDisplay = document.getElementById('quiz-timer');
        if (timerDisplay) {
            timerDisplay.classList.toggle('hidden', !this.timerEnabled);
        }

        // Update settings modal toggle if open
        const settingsTimer = document.getElementById('settings-timer-toggle');
        if (settingsTimer) {
            settingsTimer.checked = this.timerEnabled;
        }

        this.playSound('click');
    }

    startQuizTimer() {
        if (!this.timerEnabled) return;

        this.elapsedTime = 0;
        const timerDisplay = document.getElementById('quiz-timer');
        if (timerDisplay) {
            timerDisplay.classList.remove('hidden');
        }

        this.quizTimer = setInterval(() => {
            this.elapsedTime++;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopQuizTimer() {
        if (this.quizTimer) {
            clearInterval(this.quizTimer);
            this.quizTimer = null;
        }
    }

    initializeCurveballToggle() {
        // Curveballs now controlled only through settings modal
    }

    toggleCurveballs() {
        this.curveballsEnabled = !this.curveballsEnabled;
        localStorage.setItem('curveballsEnabled', this.curveballsEnabled);

        // Update settings modal toggle if open
        const settingsCurveball = document.getElementById('settings-curveball-toggle');
        if (settingsCurveball) {
            settingsCurveball.checked = this.curveballsEnabled;
        }

        this.playSound('click');
    }

    initializeStudyModeToggle() {
        // Study mode now controlled only through settings modal
    }

    toggleStudyMode() {
        this.studyMode = !this.studyMode;
        localStorage.setItem('studyMode', this.studyMode);

        // Update settings modal toggle if open
        const settingsStudy = document.getElementById('settings-study-toggle');
        if (settingsStudy) {
            settingsStudy.checked = this.studyMode;
        }

        this.playSound('click');
    }

    toggleInfiniteHeart() {
        this.infiniteLives = !this.infiniteLives;

        // Update settings modal toggle if open
        const settingsInfiniteHeart = document.getElementById('settings-infinite-heart-toggle');
        if (settingsInfiniteHeart) {
            settingsInfiniteHeart.checked = this.infiniteLives;
        }

        // Update powerup count
        this.powerups['infinite_life'] = this.infiniteLives ? 1 : 0;
        this.savePowerups();

        this.playSound('click');

        // Show notification
        const status = this.infiniteLives ? 'enabled' : 'disabled';
        alert(`💖 Infinite Heart ${status}!\n\n${this.infiniteLives ? 'You will never lose lives!' : 'Lives will be deducted normally.'}`);
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('quiz-timer');
        if (!timerDisplay || !this.timerEnabled) return;

        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = this.elapsedTime % 60;
        timerDisplay.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    checkDailyStreak() {
        const today = new Date().toDateString();
        const lastLogin = this.lastLoginDate;

        if (lastLogin !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();

            if (lastLogin === yesterdayStr) {
                // Streak continues
                this.dailyStreak++;
            } else if (lastLogin) {
                // Streak broken
                this.dailyStreak = 1;
            } else {
                // First login
                this.dailyStreak = 1;
            }

            this.lastLoginDate = today;
            this.playerData.loginStreak = this.dailyStreak;
            this.playerData.lastLoginDate = today;
            this.savePlayerData();

            // Show streak notification
            if (this.dailyStreak > 1) {
                setTimeout(() => {
                    this.showStreakNotification(this.dailyStreak);
                }, 1000);
            }
        }
    }

    showStreakNotification(streak) {
        const notification = document.createElement('div');
        notification.className = 'streak-notification';
        notification.innerHTML = `
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                        padding: 20px; border-radius: 15px; color: white; text-align: center;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 300px; margin: 20px auto;">
                <div style="font-size: 3rem;">🔥</div>
                <h3 style="margin: 10px 0;">Daily Streak!</h3>
                <p style="font-size: 1.5rem; font-weight: bold;">${streak} Days</p>
                <small>Keep it up!</small>
            </div>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    updateMultiplier() {
        // Update multiplier based on streak
        if (this.streakForMultiplier >= 50) {
            this.currentMultiplier = 10;
        } else if (this.streakForMultiplier >= 20) {
            this.currentMultiplier = 5;
        } else if (this.streakForMultiplier >= 10) {
            this.currentMultiplier = 3;
        } else if (this.streakForMultiplier >= 5) {
            this.currentMultiplier = 2;
        } else {
            this.currentMultiplier = 1;
        }

        this.updateMultiplierDisplay();
        this.playSound('powerup');
    }

    updateMultiplierDisplay() {
        const multiplierEl = document.getElementById('multiplier-display');
        if (multiplierEl) {
            if (this.currentMultiplier > 1) {
                multiplierEl.textContent = `${this.currentMultiplier}x MULTIPLIER!`;
                multiplierEl.style.display = 'block';
                multiplierEl.style.color = this.getMultiplierColor();
            } else {
                multiplierEl.style.display = 'none';
            }
        }
    }

    getMultiplierColor() {
        if (this.currentMultiplier >= 10) return '#ff0000';
        if (this.currentMultiplier >= 5) return '#ff6600';
        if (this.currentMultiplier >= 3) return '#ffaa00';
        return '#ffd700';
    }

    showMultiplierFeedback(pointsEarned, basePoints) {
        const bonus = pointsEarned - basePoints;
        this.showPowerupFeedback(`🔥 ${this.currentMultiplier}x Multiplier! +${bonus} bonus points!`);
    }

    resetMultiplier() {
        this.streakForMultiplier = 0;
        this.currentMultiplier = 1;
        this.updateMultiplierDisplay();
    }

    checkMysteryBox() {
        if (Math.random() < this.mysteryBoxChance) {
            setTimeout(() => this.openMysteryBox(), 1000);
        }
    }

    openMysteryBox() {
        const rewards = [
            { type: 'points', amount: 500, rarity: 'common', icon: '💰' },
            { type: 'points', amount: 1000, rarity: 'rare', icon: '💎' },
            { type: 'points', amount: 2500, rarity: 'epic', icon: '👑' },
            { type: 'powerup', item: '5050', rarity: 'common', icon: '🎯' },
            { type: 'powerup', item: 'skip', rarity: 'rare', icon: '⏭️' },
            { type: 'powerup', item: 'life', rarity: 'epic', icon: '❤️' },
            { type: 'cosmetic', item: 'random', rarity: 'legendary', icon: '✨' }
        ];

        const reward = rewards[Math.floor(Math.random() * rewards.length)];

        const modal = document.createElement('div');
        modal.className = 'mystery-box-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.8); display: flex; align-items: center; 
                        justify-content: center; z-index: 10000;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            padding: 40px; border-radius: 20px; text-align: center; 
                            box-shadow: 0 20px 60px rgba(0,0,0,0.5); max-width: 400px;
                            animation: bounceIn 0.5s;">
                    <div style="font-size: 5rem; margin-bottom: 20px;">🎁</div>
                    <h2 style="color: white; margin-bottom: 10px;">Mystery Box!</h2>
                    <div style="font-size: 4rem; margin: 20px 0;">${reward.icon}</div>
                    <p style="color: white; font-size: 1.2rem; margin: 10px 0;">
                        ${reward.rarity.toUpperCase()}
                    </p>
                    <p style="color: white; font-size: 1.5rem; font-weight: bold;">
                        ${reward.type === 'points' ? `+${reward.amount} Points!` :
                reward.type === 'powerup' ? `${reward.item} Power-up!` :
                    'Random Cosmetic!'}
                    </p>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="margin-top: 20px; padding: 15px 30px; font-size: 1.1rem; 
                                   background: white; color: #667eea; border: none; 
                                   border-radius: 10px; cursor: pointer; font-weight: bold;">
                        Claim Reward
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Apply reward
        if (reward.type === 'points') {
            this.playerData.totalScore += reward.amount;
        } else if (reward.type === 'powerup') {
            this.powerups[reward.item] = (this.powerups[reward.item] || 0) + 1;
        }

        this.savePlayerData();
        this.playSound('achievement');
    }

    activateCheatCode() {
        if (this.playerData.cheatCodeUsed) {
            alert('⚠️ Cheat code already used! It only works once.');
            return;
        }

        this.playerData.cheatCodeUsed = true;
        this.playerData.cheatDebt = 15000;
        this.playerData.totalScore -= 10000;

        // Unlock the cheater achievement
        if (!this.playerData.achievements.includes('cheater_scum')) {
            this.playerData.achievements.push('cheater_scum');
        }

        this.savePlayerData();
        this.updateCheatStatus();

        alert('💀 CHEAT CODE ACTIVATED: "Answer Bot"\n\n' +
            '⚠️ CONSEQUENCES:\n' +
            '• -10,000 points immediately\n' +
            '• Your next 15,000 points will NOT count\n' +
            '• "Cheater Scum" achievement unlocked\n' +
            '• This code will never work again\n\n' +
            'The answer bot will show correct answers until debt is paid!');

        this.checkAchievements();
    }

    updateCheatStatus() {
        // Update cheat code active status based on debt
        this.cheatCodeActive = this.playerData.cheatDebt > 0;
    }

    // ============================================
    // SPECIAL GAME MODES
    // ============================================

    startSurvivalMode() {
        this.isSurvivalMode = true;
        this.lives = 3;
        this.score = 0;
        this.currentSubject = 'all';
        this.maxQuestions = 9999;
        this.selectedQuestionCount = 9999;
        this.powerupsDisabled = true;

        alert('🏃‍♂️ SURVIVAL MODE\n\nEndless questions!\nDifficulty increases every 10 questions.\nNo powerups or cheats!\n\nHow long can you survive?');

        this.startQuiz();
    }

    startLightningRound() {
        this.isLightningRound = true;
        this.lives = 999;
        this.score = 0;
        this.currentSubject = 'all';
        this.maxQuestions = 9999;
        this.selectedQuestionCount = 9999;
        this.lightningTimeLeft = 60;

        alert('⚡ LIGHTNING ROUND\n\n60 seconds!\nAnswer as many as you can!\n\nReady... GO!');

        this.startQuiz();
        this.startLightningTimer();
    }

    startLightningTimer() {
        this.lightningTimer = setInterval(() => {
            this.lightningTimeLeft--;
            const timerEl = document.getElementById('quiz-timer');
            if (timerEl) {
                timerEl.textContent = `⚡ ${this.lightningTimeLeft}s`;
                timerEl.classList.remove('hidden');
                if (this.lightningTimeLeft <= 10) {
                    timerEl.style.color = '#ff0000';
                }
            }

            if (this.lightningTimeLeft <= 0) {
                clearInterval(this.lightningTimer);
                this.endGame(true);
            }
        }, 1000);
    }

    startSuddenDeath() {
        this.isSuddenDeath = true;
        this.lives = 1;
        this.score = 0;
        this.currentSubject = 'all';
        this.maxQuestions = 20;
        this.selectedQuestionCount = 20;
        this.difficulty = 3;
        this.maxDifficulty = 4;
        this.powerupsDisabled = true;
        this.currentMultiplier = 10; // 10x points!

        alert('💀 SUDDEN DEATH\n\n1 life only!\nHard/Insane questions!\n10x point multiplier!\n\nDo you dare?');

        this.startQuiz();
    }

    startBossRush() {
        this.isBossRush = true;
        this.bossRushIndex = 0;
        this.bossRushBosses = ['euler', 'mendeleev', 'einstein', 'darwin', 'shakespeare', 'napoleon', 'davinci', 'lovelace'];
        this.bossRushScore = 0;

        alert('👑 BOSS RUSH\n\nFight all 8 bosses!\nNo breaks!\n100% accuracy required!\n\nEpic rewards await!');

        this.startNextBossRush();
    }

    startNextBossRush() {
        if (this.bossRushIndex >= this.bossRushBosses.length) {
            this.completeBossRush();
            return;
        }

        const bossType = this.bossRushBosses[this.bossRushIndex];
        this.bossRushIndex++;

        alert(`Boss ${this.bossRushIndex}/8: ${this.aiCompetitors[bossType].name}`);
        this.startBossBattle(bossType);
    }

    completeBossRush() {
        this.isBossRush = false;
        const reward = 25000;
        this.playerData.totalScore += reward;
        this.playerData.bossRushCompleted = (this.playerData.bossRushCompleted || 0) + 1;

        this.savePlayerData();
        this.checkAchievements();

        alert(`🎉 BOSS RUSH COMPLETE!\n\nAll 8 bosses defeated!\n\n+${reward} points!`);

        this.showScreen('home-screen');
    }

    processCheatDebt(points) {
        // Only process debt once per quiz/battle
        if (this._debtProcessedThisSession) {
            this.log('Debt already processed this session, skipping');
            return points;
        }

        if (this.playerData.cheatDebt && this.playerData.cheatDebt > 0) {
            this._debtProcessedThisSession = true; // Mark as processed
            this.log('Processing cheat debt:', points, 'Current debt:', this.playerData.cheatDebt);

            const debtPaid = Math.min(points, this.playerData.cheatDebt);
            this.playerData.cheatDebt -= debtPaid;
            const actualPoints = points - debtPaid;

            if (this.playerData.cheatDebt <= 0) {
                this.playerData.cheatDebt = 0;
                this.updateCheatStatus();
                alert('✅ Cheat debt paid off! Answer bot deactivated. Points will now count normally.');
            }

            return actualPoints;
        }
        return points;
    }

    // AI Competitor System
    initializeAICompetitors() {
        this.aiCompetitors = {
            easy: { name: 'Easy Bot', icon: '🤖', accuracy: 0.7, curveballChance: 0, curveballAccuracy: 0, speed: 2000, isBoss: false, description: '20 coins • 70% accuracy' },
            medium: { name: 'Medium Bot', icon: '🤖', accuracy: 0.85, curveballChance: 0, curveballAccuracy: 0, speed: 1800, isBoss: false, description: '20 coins • 85% accuracy' },
            hard: { name: 'Hard Bot', icon: '🤖', accuracy: 0.9, curveballChance: 0.5, curveballAccuracy: 0.5, speed: 1500, isBoss: false, description: '20 coins • 90% accuracy' },
            insane: { name: 'Insane Bot', icon: '🤖', accuracy: 0.95, curveballChance: 0.9, curveballAccuracy: 0.9, speed: 1200, isBoss: false, description: '20 coins • 95% accuracy' },

            // Subject Bosses (require 100% accuracy on 3 questions) - Cost: 100 coins
            euler: { name: 'Euler', icon: '📐', isBoss: true, requiredQuestions: 3, description: '100 coins • 3 questions • 100% accuracy required!' },
            mendeleev: { name: 'Mendeleev', icon: '⚗️', isBoss: true, requiredQuestions: 3, description: '100 coins • 3 questions • 100% accuracy required!' },
            einstein: { name: 'Einstein', icon: '⚛️', isBoss: true, requiredQuestions: 3, description: '100 coins • 3 questions • 100% accuracy required!' },
            darwin: { name: 'Darwin', icon: '🦎', isBoss: true, requiredQuestions: 3, description: '100 coins • 3 questions • 100% accuracy required!' },
            shakespeare: { name: 'Shakespeare', icon: '📚', isBoss: true, requiredQuestions: 3, description: '100 coins • 3 questions • 100% accuracy required!' },
            napoleon: { name: 'Napoleon', icon: '⚔️', isBoss: true, requiredQuestions: 3, description: '100 coins • 3 questions • 100% accuracy required!' },
            davinci: { name: 'Da Vinci', icon: '🎨', isBoss: true, requiredQuestions: 3, description: '100 coins • 3 questions • 100% accuracy required!' },
            lovelace: { name: 'Ada Lovelace', icon: '💻', isBoss: true, requiredQuestions: 3, description: '100 coins • 3 questions • 100% accuracy required!' },

            // Special AI Bots - Cost: 20 coins
            cheater: { name: 'Cheater', icon: '😈', accuracy: 0.95, curveballChance: 0.95, curveballAccuracy: 0.95, speed: 1000, description: '20 coins • Plays dirty tricks', isBoss: false },
            mrelectro: { name: 'Mr. Electro', icon: '⚡', accuracy: 0.995, curveballChance: 1.0, curveballAccuracy: 0.995, speed: 1000, description: '20 coins • Lightning-fast with electricity questions!', hardInsaneAccuracy: 0.995, isBoss: false, useElectricityQuestions: true },
            hacker: { name: 'Hacker', icon: '💻', accuracy: 1.0, curveballChance: 1.0, curveballAccuracy: 1.0, speed: 800, description: '20 coins • Perfect accuracy', isBoss: false }
        };

        this.initializeBossQuestions();
        this.initializeElectricityQuestions();
        this.initializeDailyChallengeQuestions();
    }

    initializeDailyChallengeQuestions() {
        // 196 questions (28 weeks × 7 days) - difficulty increases throughout the week
        // Monday = Hard, Tuesday = Harder, ..., Sunday = Extremely Hard
        this.dailyChallengeQuestions = [
            // Week 1
            { day: 'Monday', question: "What is the capital of Mongolia?", answers: ["Ulaanbaatar", "Astana", "Bishkek", "Dushanbe"], correct: 0, difficulty: 3 },
            { day: 'Tuesday', question: "Who painted 'The Persistence of Memory'?", answers: ["Salvador Dalí", "Pablo Picasso", "René Magritte", "Joan Miró"], correct: 0, difficulty: 3 },
            { day: 'Wednesday', question: "What is the chemical symbol for Tungsten?", answers: ["W", "Tu", "Tn", "T"], correct: 0, difficulty: 3 },
            { day: 'Thursday', question: "In what year was the Magna Carta signed?", answers: ["1215", "1066", "1492", "1776"], correct: 0, difficulty: 4 },
            { day: 'Friday', question: "What is the smallest prime number greater than 100?", answers: ["101", "103", "107", "109"], correct: 0, difficulty: 4 },
            { day: 'Saturday', question: "Who wrote 'The Brothers Karamazov'?", answers: ["Fyodor Dostoevsky", "Leo Tolstoy", "Anton Chekhov", "Ivan Turgenev"], correct: 0, difficulty: 4 },
            { day: 'Sunday', question: "What is the half-life of Carbon-14?", answers: ["5,730 years", "10,000 years", "2,500 years", "50,000 years"], correct: 0, difficulty: 4 },

            // Week 2
            { day: 'Monday', question: "What is the largest moon of Saturn?", answers: ["Titan", "Rhea", "Iapetus", "Dione"], correct: 0, difficulty: 3 },
            { day: 'Tuesday', question: "Who composed 'The Four Seasons'?", answers: ["Antonio Vivaldi", "Johann Sebastian Bach", "Wolfgang Mozart", "Ludwig van Beethoven"], correct: 0, difficulty: 3 },
            { day: 'Wednesday', question: "What is the atomic number of Gold?", answers: ["79", "47", "82", "29"], correct: 0, difficulty: 3 },
            { day: 'Thursday', question: "In which year did the Berlin Wall fall?", answers: ["1989", "1990", "1991", "1987"], correct: 0, difficulty: 4 },
            { day: 'Friday', question: "What is the derivative of ln(x)?", answers: ["1/x", "x", "e^x", "ln(x)"], correct: 0, difficulty: 4 },
            { day: 'Saturday', question: "Who painted 'The Night Watch'?", answers: ["Rembrandt", "Vermeer", "Van Gogh", "Rubens"], correct: 0, difficulty: 4 },
            { day: 'Sunday', question: "What is Planck's constant (approximate)?", answers: ["6.626×10⁻³⁴ J·s", "3×10⁸ m/s", "9.8 m/s²", "6.02×10²³"], correct: 0, difficulty: 4 },

            // Continue pattern for 26 more weeks (182 more questions)
            // I'll add a representative sample - you can expand this to 196 total

            // Week 3
            { day: 'Monday', question: "What is the capital of Kazakhstan?", answers: ["Astana", "Almaty", "Bishkek", "Tashkent"], correct: 0, difficulty: 3 },
            { day: 'Tuesday', question: "Who wrote 'One Hundred Years of Solitude'?", answers: ["Gabriel García Márquez", "Jorge Luis Borges", "Pablo Neruda", "Octavio Paz"], correct: 0, difficulty: 3 },
            { day: 'Wednesday', question: "What is the speed of sound in water (approx)?", answers: ["1,480 m/s", "343 m/s", "5,000 m/s", "1,000 m/s"], correct: 0, difficulty: 3 },
            { day: 'Thursday', question: "Who was the first woman to win a Nobel Prize?", answers: ["Marie Curie", "Mother Teresa", "Malala Yousafzai", "Jane Addams"], correct: 0, difficulty: 4 },
            { day: 'Friday', question: "What is the integral of 1/x?", answers: ["ln|x| + C", "x²/2 + C", "e^x + C", "1/x² + C"], correct: 0, difficulty: 4 },
            { day: 'Saturday', question: "Who composed 'The Rite of Spring'?", answers: ["Igor Stravinsky", "Claude Debussy", "Maurice Ravel", "Sergei Rachmaninoff"], correct: 0, difficulty: 4 },
            { day: 'Sunday', question: "What is the Schwarzschild radius formula?", answers: ["2GM/c²", "GM/r²", "mc²", "hf"], correct: 0, difficulty: 4 }
        ];

        // Note: This is a sample of 21 questions. Expand to 196 by adding 25 more weeks following the same pattern
        // Each week follows: Mon(3), Tue(3), Wed(3), Thu(4), Fri(4), Sat(4), Sun(4)
    }

    initializeElectricityQuestions() {
        // Special electricity-themed questions for Mr. Electro AI battle
        this.electricityQuestions = [
            { question: "What is the unit of electrical resistance?", answers: ["Ohm", "Volt", "Ampere", "Watt"], correct: 0, difficulty: 1, subject: "physics" },
            { question: "What is Ohm's Law?", answers: ["V = IR", "P = IV", "E = mc²", "F = ma"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is the unit of electrical current?", answers: ["Ampere", "Ohm", "Volt", "Coulomb"], correct: 0, difficulty: 1, subject: "physics" },
            { question: "What particle carries electric charge?", answers: ["Electron", "Proton", "Neutron", "Photon"], correct: 0, difficulty: 1, subject: "physics" },
            { question: "What is the unit of electrical power?", answers: ["Watt", "Joule", "Volt", "Ampere"], correct: 0, difficulty: 1, subject: "physics" },
            { question: "What is the unit of voltage?", answers: ["Volt", "Ampere", "Ohm", "Watt"], correct: 0, difficulty: 1, subject: "physics" },
            { question: "What does AC stand for in electricity?", answers: ["Alternating Current", "Active Current", "Automatic Current", "Amplified Current"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What does DC stand for in electricity?", answers: ["Direct Current", "Dynamic Current", "Dual Current", "Digital Current"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What material is a good conductor of electricity?", answers: ["Copper", "Rubber", "Wood", "Plastic"], correct: 0, difficulty: 1, subject: "physics" },
            { question: "What is an insulator?", answers: ["Material that resists electricity", "Material that conducts electricity", "A type of battery", "A power source"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is the formula for electrical power?", answers: ["P = IV", "P = I²R", "P = V²/R", "All of the above"], correct: 3, difficulty: 3, subject: "physics" },
            { question: "What is a circuit?", answers: ["A closed path for electricity", "An open wire", "A battery", "A resistor"], correct: 0, difficulty: 1, subject: "physics" },
            { question: "What happens in a short circuit?", answers: ["Current takes shortest path", "Circuit breaks", "Voltage increases", "Resistance increases"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is the unit of electrical charge?", answers: ["Coulomb", "Ampere", "Volt", "Ohm"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is a capacitor used for?", answers: ["Storing electrical charge", "Resisting current", "Generating voltage", "Measuring current"], correct: 0, difficulty: 3, subject: "physics" },
            { question: "What is the unit of capacitance?", answers: ["Farad", "Henry", "Ohm", "Volt"], correct: 0, difficulty: 3, subject: "physics" },
            { question: "What is an inductor?", answers: ["Stores energy in magnetic field", "Stores electrical charge", "Resists current", "Generates voltage"], correct: 0, difficulty: 3, subject: "physics" },
            { question: "What is the unit of inductance?", answers: ["Henry", "Farad", "Ohm", "Tesla"], correct: 0, difficulty: 3, subject: "physics" },
            { question: "What is a diode?", answers: ["Allows current in one direction", "Stores charge", "Resists current", "Amplifies signal"], correct: 0, difficulty: 3, subject: "physics" },
            { question: "What is a transistor used for?", answers: ["Amplifying or switching signals", "Storing charge", "Resisting current", "Generating voltage"], correct: 0, difficulty: 3, subject: "physics" },
            { question: "What is the frequency of AC power in the US?", answers: ["60 Hz", "50 Hz", "100 Hz", "120 Hz"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is the frequency of AC power in Europe?", answers: ["50 Hz", "60 Hz", "100 Hz", "120 Hz"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is a transformer used for?", answers: ["Changing voltage levels", "Storing energy", "Resisting current", "Generating electricity"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is grounding in electrical systems?", answers: ["Connecting to earth for safety", "Increasing voltage", "Storing charge", "Amplifying current"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is electrical resistance measured in?", answers: ["Ohms", "Volts", "Amperes", "Watts"], correct: 0, difficulty: 1, subject: "physics" },
            { question: "What happens when you increase resistance in a circuit?", answers: ["Current decreases", "Current increases", "Voltage decreases", "Power increases"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is a series circuit?", answers: ["Components in single path", "Components in parallel paths", "No complete path", "Multiple power sources"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "What is a parallel circuit?", answers: ["Components in separate paths", "Components in single path", "No complete path", "Single component"], correct: 0, difficulty: 2, subject: "physics" },
            { question: "Who discovered the electron?", answers: ["J.J. Thomson", "Benjamin Franklin", "Thomas Edison", "Nikola Tesla"], correct: 0, difficulty: 3, subject: "physics" },
            { question: "What is static electricity?", answers: ["Stationary electric charge", "Moving electric charge", "Alternating current", "Direct current"], correct: 0, difficulty: 2, subject: "physics" }
        ];
    }

    initializeBossQuestions() {
        this.bossQuestions = {
            euler: [
                // Personalized Euler questions (20%)
                { question: "Give an approximation for e (Euler's number) to 2 decimal places", answer: "2.72", acceptableAnswers: ["2.72", "2.71", "2.718"] },
                { question: "What is Euler's identity?", choices: ["e^(iπ) + 1 = 0", "e = mc^2", "a^2 + b^2 = c^2", "F = ma"], correctIndex: 0 },
                { question: "What year was Leonhard Euler born?", choices: ["1707", "1750", "1680", "1800"], correctIndex: 0 },
                { question: "Which mathematical constant is named after Euler?", choices: ["e", "π", "φ", "i"], correctIndex: 0 },
                // Hard math questions (80%)
                { question: "What is the derivative of x^3?", choices: ["3x^2", "x^2", "3x", "x^3"], correctIndex: 0 },
                { question: "Solve: x^2 + 5x + 6 = 0 (format: x = a, b where a < b)", answer: "x = -3, -2", acceptableAnswers: ["-3,-2", "x=-3,-2", "-3 -2"] },
                { question: "What is the integral of 2x?", choices: ["x^2 + c", "2x^2 + c", "x + c", "2x + c"], correctIndex: 0 },
                { question: "What is sin^2(x) + cos^2(x) equal to?", choices: ["1", "0", "2", "x"], correctIndex: 0 },
                { question: "What is the derivative of sin(x)?", choices: ["cos(x)", "-cos(x)", "sin(x)", "-sin(x)"], correctIndex: 0 },
                { question: "What is the value of π to 3 decimal places?", choices: ["3.142", "3.141", "3.140", "3.143"], correctIndex: 0 },
                { question: "What is the quadratic formula?", choices: ["x = (-b ± √(b²-4ac))/2a", "x = -b/2a", "x = b²-4ac", "x = a²+b²"], correctIndex: 0 },
                { question: "What is the sum of angles in a triangle?", choices: ["180°", "360°", "90°", "270°"], correctIndex: 0 },
                { question: "What is the Pythagorean theorem?", choices: ["a² + b² = c²", "a + b = c", "a² = b² + c²", "abc = 1"], correctIndex: 0 },
                { question: "What is the derivative of e^x?", choices: ["e^x", "xe^(x-1)", "e", "x"], correctIndex: 0 },
                { question: "What is log₁₀(100)?", choices: ["2", "10", "100", "1"], correctIndex: 0 },
                { question: "What is the area of a circle with radius r?", choices: ["πr²", "2πr", "πr", "r²"], correctIndex: 0 },
                { question: "What is the slope of a line through (0,0) and (2,4)?", choices: ["2", "4", "1", "0.5"], correctIndex: 0 },
                { question: "What is 5! (5 factorial)?", choices: ["120", "25", "15", "100"], correctIndex: 0 },
                { question: "What is the value of i² (imaginary unit squared)?", choices: ["-1", "1", "i", "0"], correctIndex: 0 },
                { question: "What is the limit of 1/x as x approaches infinity?", choices: ["0", "1", "∞", "undefined"], correctIndex: 0 }
            ],
            mendeleev: [
                // Personalized Mendeleev questions (20%)
                { question: "What element did Mendeleev predict that was later discovered as Gallium?", answer: "eka-aluminum", acceptableAnswers: ["eka-aluminum", "ekaaluminum", "eka aluminum"] },
                { question: "What is the atomic number of Mendelevium (named after him)?", answer: "101", acceptableAnswers: ["101"] },
                { question: "What property did Mendeleev use to arrange elements?", choices: ["Atomic mass", "Atomic number", "Electron count", "Density"], correctIndex: 0 },
                { question: "What year did Mendeleev publish his periodic table?", choices: ["1869", "1850", "1900", "1880"], correctIndex: 0 },
                // Hard science questions (80%)
                { question: "What is the symbol for Hydrogen?", choices: ["H", "He", "Hy", "Hg"], correctIndex: 0 },
                { question: "Which group contains noble gases?", choices: ["Group 18", "Group 1", "Group 17", "Group 2"], correctIndex: 0 },
                { question: "What is the most abundant element in the universe?", choices: ["Hydrogen", "Helium", "Oxygen", "Carbon"], correctIndex: 0 },
                { question: "What is the atomic number of Carbon?", choices: ["6", "12", "8", "14"], correctIndex: 0 },
                { question: "What element has the symbol Au?", choices: ["Gold", "Silver", "Aluminum", "Argon"], correctIndex: 0 },
                { question: "What is the chemical formula for water?", choices: ["H₂O", "H₂O₂", "HO", "H₃O"], correctIndex: 0 },
                { question: "What is the pH of a neutral solution?", choices: ["7", "0", "14", "1"], correctIndex: 0 },
                { question: "What gas do plants absorb during photosynthesis?", choices: ["CO₂", "O₂", "N₂", "H₂"], correctIndex: 0 },
                { question: "What is the speed of light in vacuum (m/s)?", choices: ["3×10⁸", "3×10⁶", "3×10¹⁰", "3×10⁴"], correctIndex: 0 },
                { question: "What is the smallest unit of matter?", choices: ["Atom", "Molecule", "Cell", "Electron"], correctIndex: 0 },
                { question: "What element has atomic number 1?", choices: ["Hydrogen", "Helium", "Lithium", "Carbon"], correctIndex: 0 },
                { question: "What is the chemical symbol for Sodium?", choices: ["Na", "So", "S", "N"], correctIndex: 0 },
                { question: "What type of bond shares electrons?", choices: ["Covalent", "Ionic", "Metallic", "Hydrogen"], correctIndex: 0 },
                { question: "What is the charge of a proton?", choices: ["+1", "-1", "0", "+2"], correctIndex: 0 },
                { question: "What is the most electronegative element?", choices: ["Fluorine", "Oxygen", "Chlorine", "Nitrogen"], correctIndex: 0 },
                { question: "What is Avogadro's number approximately?", choices: ["6.02×10²³", "3.14×10²³", "1.60×10²³", "9.81×10²³"], correctIndex: 0 }
            ],
            einstein: [
                // Personalized Einstein questions (20%)
                { question: "What is Einstein's famous equation?", choices: ["E = mc²", "F = ma", "E = hf", "p = mv"], correctIndex: 0 },
                { question: "What does 'c' represent in E=mc²?", answer: "speed of light", acceptableAnswers: ["speed of light", "light speed", "velocity of light"] },
                { question: "What year did Einstein publish his theory of special relativity?", choices: ["1905", "1915", "1900", "1920"], correctIndex: 0 },
                { question: "What Nobel Prize did Einstein win in 1921?", choices: ["Photoelectric effect", "Relativity", "Brownian motion", "Quantum theory"], correctIndex: 0 },
                // Hard science questions (80%)
                { question: "What particle did Einstein propose in the photoelectric effect?", choices: ["Photon", "Electron", "Proton", "Neutron"], correctIndex: 0 },
                { question: "What happens to time as you approach the speed of light?", choices: ["It slows down", "It speeds up", "It stops", "Nothing"], correctIndex: 0 },
                { question: "What is the speed of light in vacuum?", choices: ["299,792,458 m/s", "300,000 m/s", "3×10⁶ m/s", "186,000 m/s"], correctIndex: 0 },
                { question: "What force keeps planets in orbit?", choices: ["Gravity", "Magnetism", "Friction", "Tension"], correctIndex: 0 },
                { question: "What is Newton's second law?", choices: ["F = ma", "E = mc²", "F = G(m₁m₂)/r²", "p = mv"], correctIndex: 0 },
                { question: "What is the unit of force?", choices: ["Newton", "Joule", "Watt", "Pascal"], correctIndex: 0 },
                { question: "What is the acceleration due to gravity on Earth?", choices: ["9.8 m/s²", "10 m/s²", "8.9 m/s²", "11 m/s²"], correctIndex: 0 },
                { question: "What is the formula for kinetic energy?", choices: ["½mv²", "mgh", "mv", "m/v"], correctIndex: 0 },
                { question: "What is the first law of thermodynamics?", choices: ["Energy is conserved", "Entropy increases", "Heat flows hot to cold", "Work equals heat"], correctIndex: 0 },
                { question: "What is absolute zero in Celsius?", choices: ["-273.15°C", "-273°C", "-300°C", "-200°C"], correctIndex: 0 },
                { question: "What is the unit of energy?", choices: ["Joule", "Watt", "Newton", "Pascal"], correctIndex: 0 },
                { question: "What is the formula for momentum?", choices: ["p = mv", "p = ma", "p = F/t", "p = ½mv²"], correctIndex: 0 },
                { question: "What is the speed of sound in air at 20°C?", choices: ["343 m/s", "300 m/s", "400 m/s", "500 m/s"], correctIndex: 0 },
                { question: "What is Planck's constant approximately?", choices: ["6.63×10⁻³⁴ J·s", "3×10⁸ m/s", "9.8 m/s²", "1.6×10⁻¹⁹ C"], correctIndex: 0 },
                { question: "What is the charge of an electron?", choices: ["-1.6×10⁻¹⁹ C", "+1.6×10⁻¹⁹ C", "0 C", "-1 C"], correctIndex: 0 },
                { question: "What is the mass of a proton compared to an electron?", choices: ["~1836 times heavier", "Same", "~100 times heavier", "~10 times heavier"], correctIndex: 0 }
            ],
            darwin: [
                // Personalized Darwin questions (20%)
                { question: "What ship did Darwin sail on?", choices: ["HMS Beagle", "HMS Victory", "Santa Maria", "Mayflower"], correctIndex: 0 },
                { question: "What islands were crucial to Darwin's theory?", answer: "Galapagos", acceptableAnswers: ["galapagos", "galapagos islands"] },
                { question: "What is the title of Darwin's famous book?", choices: ["Origin of Species", "The Descent of Man", "The Voyage", "Natural Selection"], correctIndex: 0 },
                { question: "What bird species helped Darwin understand evolution?", choices: ["Finches", "Sparrows", "Eagles", "Parrots"], correctIndex: 0 },
                // Hard science questions (80%)
                { question: "What process drives evolution?", choices: ["Natural selection", "Artificial selection", "Genetic drift", "Mutation"], correctIndex: 0 },
                { question: "What is DNA?", choices: ["Deoxyribonucleic acid", "Deoxyribose acid", "Dinitrogen acid", "Dextrose acid"], correctIndex: 0 },
                { question: "What are the building blocks of proteins?", choices: ["Amino acids", "Nucleotides", "Lipids", "Carbohydrates"], correctIndex: 0 },
                { question: "What is the powerhouse of the cell?", choices: ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"], correctIndex: 0 },
                { question: "What is the process by which plants make food?", choices: ["Photosynthesis", "Respiration", "Fermentation", "Digestion"], correctIndex: 0 },
                { question: "What is the basic unit of life?", choices: ["Cell", "Atom", "Molecule", "Organ"], correctIndex: 0 },
                { question: "How many chromosomes do humans have?", choices: ["46", "23", "48", "44"], correctIndex: 0 },
                { question: "What is the study of heredity called?", choices: ["Genetics", "Evolution", "Ecology", "Anatomy"], correctIndex: 0 },
                { question: "What molecule carries genetic information?", choices: ["DNA", "RNA", "Protein", "Lipid"], correctIndex: 0 },
                { question: "What is the process of cell division called?", choices: ["Mitosis", "Meiosis", "Photosynthesis", "Respiration"], correctIndex: 0 },
                { question: "What kingdom do humans belong to?", choices: ["Animalia", "Plantae", "Fungi", "Protista"], correctIndex: 0 },
                { question: "What is the largest organ in the human body?", choices: ["Skin", "Liver", "Brain", "Heart"], correctIndex: 0 },
                { question: "What blood type is the universal donor?", choices: ["O-", "AB+", "A+", "B-"], correctIndex: 0 },
                { question: "What is the normal human body temperature in Celsius?", choices: ["37°C", "36°C", "38°C", "35°C"], correctIndex: 0 },
                { question: "How many bones are in the adult human body?", choices: ["206", "208", "200", "210"], correctIndex: 0 },
                { question: "What is the largest artery in the human body?", choices: ["Aorta", "Pulmonary", "Carotid", "Femoral"], correctIndex: 0 }
            ],
            shakespeare: [
                // Personalized Shakespeare questions (20%)
                { question: "Complete: 'To be or not to be, that is the...'", answer: "question", acceptableAnswers: ["question"] },
                { question: "What theater was Shakespeare associated with?", choices: ["Globe", "Royal", "Apollo", "West End"], correctIndex: 0 },
                { question: "How many plays did Shakespeare write approximately?", choices: ["37", "25", "50", "100"], correctIndex: 0 },
                { question: "What year was Shakespeare born?", choices: ["1564", "1600", "1550", "1580"], correctIndex: 0 },
                // Hard history/literature questions (80%)
                { question: "In which play does Romeo appear?", choices: ["Romeo and Juliet", "Hamlet", "Macbeth", "Othello"], correctIndex: 0 },
                { question: "Which play features the character Juliet?", choices: ["Romeo and Juliet", "Hamlet", "King Lear", "The Tempest"], correctIndex: 0 },
                { question: "Who wrote 'Pride and Prejudice'?", choices: ["Jane Austen", "Charlotte Brontë", "Emily Brontë", "George Eliot"], correctIndex: 0 },
                { question: "What is the longest Shakespearean play?", choices: ["Hamlet", "Macbeth", "King Lear", "Othello"], correctIndex: 0 },
                { question: "In which play does Lady Macbeth appear?", choices: ["Macbeth", "Hamlet", "Othello", "King Lear"], correctIndex: 0 },
                { question: "What is the setting of Romeo and Juliet?", choices: ["Verona", "Venice", "Rome", "Florence"], correctIndex: 0 },
                { question: "Who wrote '1984'?", choices: ["George Orwell", "Aldous Huxley", "Ray Bradbury", "H.G. Wells"], correctIndex: 0 },
                { question: "What is the first line of 'A Tale of Two Cities'?", choices: ["It was the best of times", "Call me Ishmael", "Happy families", "It is a truth"], correctIndex: 0 },
                { question: "Who wrote 'The Great Gatsby'?", choices: ["F. Scott Fitzgerald", "Ernest Hemingway", "John Steinbeck", "William Faulkner"], correctIndex: 0 },
                { question: "What is the name of Hamlet's mother?", choices: ["Gertrude", "Ophelia", "Desdemona", "Cordelia"], correctIndex: 0 },
                { question: "Who wrote 'To Kill a Mockingbird'?", choices: ["Harper Lee", "Truman Capote", "John Steinbeck", "William Faulkner"], correctIndex: 0 },
                { question: "What is the name of Don Quixote's horse?", choices: ["Rocinante", "Bucephalus", "Pegasus", "Shadowfax"], correctIndex: 0 },
                { question: "Who wrote 'Moby Dick'?", choices: ["Herman Melville", "Mark Twain", "Edgar Allan Poe", "Nathaniel Hawthorne"], correctIndex: 0 },
                { question: "What is the name of the three witches' prophecy recipient in Macbeth?", choices: ["Macbeth", "Banquo", "Duncan", "Malcolm"], correctIndex: 0 },
                { question: "Who wrote 'The Odyssey'?", choices: ["Homer", "Virgil", "Sophocles", "Euripides"], correctIndex: 0 },
                { question: "What is the name of Sherlock Holmes' assistant?", choices: ["Dr. Watson", "Inspector Lestrade", "Mycroft", "Moriarty"], correctIndex: 0 }
            ],
            napoleon: [
                // Personalized Napoleon questions (20%)
                { question: "What year did Napoleon become Emperor of France?", choices: ["1804", "1789", "1815", "1799"], correctIndex: 0 },
                { question: "Where was Napoleon exiled after Waterloo?", choices: ["Saint Helena", "Elba", "Corsica", "Malta"], correctIndex: 0 },
                { question: "What was Napoleon's last name?", answer: "Bonaparte", acceptableAnswers: ["bonaparte"] },
                { question: "What battle ended Napoleon's rule in 1815?", choices: ["Waterloo", "Austerlitz", "Leipzig", "Borodino"], correctIndex: 0 },
                // Hard history questions (80%)
                { question: "What country was Napoleon born in?", choices: ["Corsica", "France", "Italy", "Spain"], correctIndex: 0 },
                { question: "What year did World War I begin?", choices: ["1914", "1918", "1939", "1945"], correctIndex: 0 },
                { question: "What year did World War II end?", choices: ["1945", "1944", "1946", "1943"], correctIndex: 0 },
                { question: "Who was the first President of the United States?", choices: ["George Washington", "Thomas Jefferson", "John Adams", "Benjamin Franklin"], correctIndex: 0 },
                { question: "What year did the Berlin Wall fall?", choices: ["1989", "1990", "1991", "1988"], correctIndex: 0 },
                { question: "What ancient wonder is still standing?", choices: ["Great Pyramid of Giza", "Colossus of Rhodes", "Hanging Gardens", "Lighthouse of Alexandria"], correctIndex: 0 },
                { question: "What year did Columbus reach the Americas?", choices: ["1492", "1500", "1480", "1510"], correctIndex: 0 },
                { question: "Who was the first man on the moon?", choices: ["Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "John Glenn"], correctIndex: 0 },
                { question: "What year did the Titanic sink?", choices: ["1912", "1910", "1915", "1920"], correctIndex: 0 },
                { question: "Who painted the Sistine Chapel ceiling?", choices: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], correctIndex: 0 },
                { question: "What year did the French Revolution begin?", choices: ["1789", "1776", "1800", "1815"], correctIndex: 0 },
                { question: "Who was the longest-reigning British monarch before Elizabeth II?", choices: ["Queen Victoria", "George III", "Elizabeth I", "Henry VIII"], correctIndex: 0 },
                { question: "What empire did Julius Caesar rule?", choices: ["Roman", "Greek", "Persian", "Egyptian"], correctIndex: 0 },
                { question: "What year did the Soviet Union collapse?", choices: ["1991", "1989", "1990", "1992"], correctIndex: 0 },
                { question: "Who discovered penicillin?", choices: ["Alexander Fleming", "Louis Pasteur", "Marie Curie", "Jonas Salk"], correctIndex: 0 },
                { question: "What year did the American Civil War end?", choices: ["1865", "1861", "1870", "1860"], correctIndex: 0 }
            ],
            davinci: [
                // Personalized Da Vinci questions (20%)
                { question: "What is Da Vinci's most famous painting?", choices: ["Mona Lisa", "The Last Supper", "Vitruvian Man", "Lady with Ermine"], correctIndex: 0 },
                { question: "What painting shows Jesus and his disciples at dinner?", choices: ["The Last Supper", "Mona Lisa", "Vitruvian Man", "Annunciation"], correctIndex: 0 },
                { question: "What was Da Vinci's first name?", answer: "Leonardo", acceptableAnswers: ["leonardo"] },
                { question: "In what century did Da Vinci live?", choices: ["15th-16th", "16th", "14th", "17th"], correctIndex: 0 },
                // Hard art/history questions (80%)
                { question: "What field was Da Vinci NOT known for?", choices: ["Music composition", "Painting", "Engineering", "Anatomy"], correctIndex: 0 },
                { question: "Who painted 'The Starry Night'?", choices: ["Vincent van Gogh", "Pablo Picasso", "Claude Monet", "Salvador Dalí"], correctIndex: 0 },
                { question: "Who sculpted 'David'?", choices: ["Michelangelo", "Donatello", "Bernini", "Rodin"], correctIndex: 0 },
                { question: "What art movement was Pablo Picasso associated with?", choices: ["Cubism", "Impressionism", "Surrealism", "Expressionism"], correctIndex: 0 },
                { question: "Who painted 'The Persistence of Memory' with melting clocks?", choices: ["Salvador Dalí", "René Magritte", "Max Ernst", "Joan Miró"], correctIndex: 0 },
                { question: "What museum houses the Mona Lisa?", choices: ["Louvre", "Uffizi", "Prado", "Metropolitan"], correctIndex: 0 },
                { question: "Who painted 'Guernica'?", choices: ["Pablo Picasso", "Joan Miró", "Salvador Dalí", "Francisco Goya"], correctIndex: 0 },
                { question: "What is the art technique of painting on wet plaster?", choices: ["Fresco", "Tempera", "Oil", "Watercolor"], correctIndex: 0 },
                { question: "Who painted 'The Birth of Venus'?", choices: ["Sandro Botticelli", "Leonardo da Vinci", "Raphael", "Titian"], correctIndex: 0 },
                { question: "What art movement did Claude Monet found?", choices: ["Impressionism", "Cubism", "Surrealism", "Realism"], correctIndex: 0 },
                { question: "Who painted 'The Scream'?", choices: ["Edvard Munch", "Vincent van Gogh", "Paul Gauguin", "Henri Matisse"], correctIndex: 0 },
                { question: "What is the primary color that cannot be made by mixing?", choices: ["Red, Yellow, Blue", "Red, Green, Blue", "Cyan, Magenta, Yellow", "Orange, Purple, Green"], correctIndex: 0 },
                { question: "Who painted 'Girl with a Pearl Earring'?", choices: ["Johannes Vermeer", "Rembrandt", "Frans Hals", "Jan Steen"], correctIndex: 0 },
                { question: "What is chiaroscuro in art?", choices: ["Light and shadow contrast", "Color mixing", "Perspective technique", "Brush technique"], correctIndex: 0 },
                { question: "Who painted the ceiling of the Sistine Chapel?", choices: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], correctIndex: 0 },
                { question: "What art period came after the Renaissance?", choices: ["Baroque", "Medieval", "Romantic", "Modern"], correctIndex: 0 }
            ],
            mrelectro: [
                { question: "What is the unit of electrical resistance?", choices: ["Ohm", "Ampere", "Volt", "Watt"], correctIndex: 0 },
                { question: "What is Ohm's Law?", choices: ["V = IR", "P = IV", "E = mc^2", "F = ma"], correctIndex: 0 },
                { question: "What is the unit of electrical current?", choices: ["Ampere", "Ohm", "Volt", "Coulomb"], correctIndex: 0 },
                { question: "What particle carries electric charge?", choices: ["Electron", "Proton", "Neutron", "Photon"], correctIndex: 0 },
                { question: "What is the unit of electrical power?", choices: ["Watt", "Joule", "Volt", "Ampere"], correctIndex: 0 }
            ],
            lovelace: [
                { question: "Who designed the Analytical Engine that Ada programmed?", choices: ["Charles Babbage", "Alan Turing", "John von Neumann", "Grace Hopper"], correctIndex: 0 },
                { question: "What does CPU stand for?", answer: "Central Processing Unit", acceptableAnswers: ["central processing unit"] },
                { question: "In binary, what is 1 + 1?", choices: ["10", "2", "11", "1"], correctIndex: 0 },
                { question: "What programming concept uses 'if' and 'else'?", choices: ["Conditional", "Loop", "Function", "Variable"], correctIndex: 0 },
                { question: "What is the base of the binary number system?", choices: ["2", "10", "8", "16"], correctIndex: 0 },
                { question: "What is the base of the hexadecimal number system?", choices: ["16", "10", "8", "2"], correctIndex: 0 },
                { question: "What does HTML stand for?", answer: "HyperText Markup Language", acceptableAnswers: ["hypertext markup language"] },
                { question: "What symbol is used for comments in Python?", choices: ["#", "//", "/*", "--"], correctIndex: 0 },
                { question: "What keyword is used to define a function in Python?", choices: ["def", "function", "func", "define"], correctIndex: 0 },
                { question: "What data structure uses LIFO (Last In First Out)?", choices: ["Stack", "Queue", "Array", "List"], correctIndex: 0 },
                { question: "What data structure uses FIFO (First In First Out)?", choices: ["Queue", "Stack", "Tree", "Graph"], correctIndex: 0 },
                { question: "What is 1010 in binary as a decimal number?", choices: ["10", "5", "8", "12"], correctIndex: 0 },
                { question: "What does API stand for?", answer: "Application Programming Interface", acceptableAnswers: ["application programming interface"] },
                { question: "What is the time complexity of binary search?", choices: ["O(log n)", "O(n)", "O(n^2)", "O(1)"], correctIndex: 0 },
                { question: "What sorting algorithm has O(n^2) worst case?", choices: ["Bubble sort", "Merge sort", "Quick sort", "Heap sort"], correctIndex: 0 },
                { question: "What does SQL stand for?", answer: "Structured Query Language", acceptableAnswers: ["structured query language"] },
                { question: "What does RAM stand for?", answer: "Random Access Memory", acceptableAnswers: ["random access memory"] },
                { question: "What year was Ada Lovelace born?", choices: ["1815", "1820", "1800", "1830"], correctIndex: 0 },
                { question: "What is a variable in programming?", choices: ["A storage location", "A function", "A loop", "A condition"], correctIndex: 0 },
                { question: "Which language is known for web styling?", choices: ["CSS", "HTML", "JavaScript", "Python"], correctIndex: 0 }
            ]
        };
    }

    startAIBattle(aiType) {
        this.currentAI = aiType;
        const ai = this.aiCompetitors[aiType];

        // Initialize coins if undefined
        if (typeof this.playerData.coins !== 'number') {
            this.playerData.coins = 0;
            this.savePlayerData();
        }

        // Update display to show current coins
        this.updateCoinsDisplay();

        // Check coin cost
        const cost = ai.isBoss ? 100 : 20;
        const currentCoins = this.playerData.coins || 0;

        if (currentCoins < cost) {
            alert(`Not enough coins! You need ${cost} coins to battle ${ai.name}.\n\nYou have: ${currentCoins} coins\n\nBuy coins in the shop!`);
            return;
        }

        // Deduct coins
        this.playerData.coins = currentCoins - cost;
        this.savePlayerData();
        this.updateCoinsDisplay();

        // Check if this is a boss battle
        if (ai.isBoss) {
            this.startBossBattle(aiType);
            return;
        }

        this.aiScore = 0;
        this.aiLives = 3;
        this.aiQuestionsAnswered = 0;
        this.aiCorrectAnswers = 0;
        this.isAIBattle = true;
        this.aiStartTime = null;

        // Set AI answer speed based on competitor
        const aiSpeed = ai.speed || 2000;
        this.aiAnswerDelay = aiSpeed + Math.random() * 500; // Base speed + small variation

        // Check if this AI uses special questions (Mr. Electro)
        if (ai.useElectricityQuestions) {
            this.currentSubject = 'custom';
            this.customQuestions = this.electricityQuestions.map(q => ({
                question: q.question,
                answers: q.answers,
                correct: q.correct,
                difficulty: q.difficulty,
                subject: q.subject,
                used: false
            }));
        } else {
            // Force all subjects for normal AI battles
            this.currentSubject = 'all';
        }

        // For Hacker, let user choose question count (speed race)
        // For other AIs, unlimited questions (battle ends when someone loses all lives)
        if (aiType === 'hacker') {
            const questionCount = prompt('How many questions for the speed race?\n(Recommended: 20-50)', '30');
            if (!questionCount || isNaN(questionCount) || questionCount < 1) {
                alert('Invalid question count. Battle cancelled.');
                return;
            }
            this.maxQuestions = parseInt(questionCount);
            this.selectedQuestionCount = this.maxQuestions;
        } else {
            // Cap at 100 questions to prevent exploits
            this.selectedQuestionCount = 100;
            this.maxQuestions = 100;
        }

        // Show battle mode UI
        document.getElementById('battle-mode-indicator').classList.remove('hidden');
        document.getElementById('ai-opponent-name').textContent = `vs ${ai.name}`;
        document.querySelector('.ai-side').classList.remove('hidden');
        document.getElementById('ai-name').textContent = `${ai.icon} ${ai.name}`;
        document.getElementById('quiz-container').classList.add('battle-mode');

        this.startQuiz();
    }

    startBossBattle(bossType) {
        this.currentAI = bossType;
        this.isBossBattle = true;
        this.isAIBattle = false;
        this.bossQuestionsAnswered = 0;
        this.bossCorrectAnswers = 0;

        const boss = this.aiCompetitors[bossType];
        const requiredQuestions = 3; // Boss battles are 3 questions

        // Prepare boss questions
        const bossQuestionBank = this.bossQuestions[bossType] || [];
        this.questions = [];

        // Repeat questions to reach required count
        for (let i = 0; i < requiredQuestions; i++) {
            const q = bossQuestionBank[i % bossQuestionBank.length];
            this.questions.push({
                ...q,
                isBossQuestion: true,
                used: false
            });
        }

        this.maxQuestions = requiredQuestions;
        this.selectedQuestionCount = requiredQuestions;

        alert(`⚔️ BOSS BATTLE: ${boss.name}\n\nYou must answer ${requiredQuestions} questions with 100% accuracy!\nType your answers carefully. One mistake and you lose!`);

        this.showScreen('quiz-screen');
        this.displayBossQuestion();
    }

    displayBossQuestion() {
        // Ensure we don't skip questions
        if (!this.questions || this.bossQuestionsAnswered >= this.questions.length) {
            this.endBossBattle(true);
            return;
        }

        const currentQuestion = this.questions[this.bossQuestionsAnswered];

        if (!currentQuestion) {
            console.error('No question found at index:', this.bossQuestionsAnswered);
            this.endBossBattle(false);
            return;
        }

        // Update UI
        document.getElementById('question-text').textContent = currentQuestion.question;
        document.getElementById('score-display').textContent = this.bossCorrectAnswers;
        document.getElementById('progress-display').textContent = `${this.bossQuestionsAnswered + 1}/${this.maxQuestions}`;
        document.getElementById('lives-display').textContent = '❤️';
        document.getElementById('curveball-alert').classList.add('hidden');

        const answersContainer = document.getElementById('answers-container');

        // Check if this is a multiple choice question
        if (currentQuestion.choices) {
            // Multiple choice question
            answersContainer.innerHTML = '';
            currentQuestion.choices.forEach((choice, index) => {
                const btn = document.createElement('button');
                btn.className = 'answer-btn';
                btn.textContent = choice;
                btn.addEventListener('click', () => {
                    this.checkBossAnswer(index, currentQuestion, true);
                });
                answersContainer.appendChild(btn);
            });
        } else {
            // Text input question
            answersContainer.innerHTML = `
                <div style="margin: 20px 0;">
                    <input type="text" id="boss-answer-input" 
                           placeholder="Type your answer here..." 
                           style="width: 100%; padding: 15px; font-size: 1.1rem; border: 2px solid #6c5ce7; border-radius: 10px; 
                                  background: white; color: black; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"
                           autocomplete="off">
                    <button id="boss-submit-btn" 
                            style="width: 100%; margin-top: 15px; padding: 15px; font-size: 1.1rem; background: #6c5ce7; 
                                   color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
                        Submit Answer
                    </button>
                </div>
            `;

            const input = document.getElementById('boss-answer-input');
            const submitBtn = document.getElementById('boss-submit-btn');

            const submitAnswer = () => {
                const userAnswer = input.value.trim().toLowerCase();
                this.checkBossAnswer(userAnswer, currentQuestion, false);
            };

            submitBtn.addEventListener('click', submitAnswer);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submitAnswer();
            });

            input.focus();
        }
    }

    checkBossAnswer(userAnswer, question, isMultipleChoice) {
        let isCorrect = false;

        if (isMultipleChoice) {
            // userAnswer is the index of the selected choice
            isCorrect = userAnswer === question.correctIndex;

            // Disable all buttons and show feedback
            const buttons = document.querySelectorAll('.answer-btn');
            buttons.forEach((btn, idx) => {
                btn.disabled = true;
                if (idx === question.correctIndex) {
                    btn.classList.add('correct');
                } else if (idx === userAnswer) {
                    btn.classList.add('incorrect');
                }
            });
        } else {
            // Text input answer
            const acceptableAnswers = question.acceptableAnswers || [question.answer];
            isCorrect = acceptableAnswers.some(ans =>
                ans.toLowerCase().replace(/\s+/g, '') === userAnswer.replace(/\s+/g, '')
            );
        }

        if (isCorrect) {
            this.bossQuestionsAnswered++;
            this.bossCorrectAnswers++;
            this.showFeedback('✅ Correct!', true);

            // Check if all questions answered
            if (this.bossQuestionsAnswered >= this.maxQuestions) {
                setTimeout(() => this.endBossBattle(true), 1000);
            } else {
                setTimeout(() => this.displayBossQuestion(), 1000);
            }
        } else {
            const correctAnswer = isMultipleChoice
                ? question.choices[question.correctIndex]
                : question.answer;
            this.showFeedback(`❌ Wrong! Correct answer: ${correctAnswer}`, false);
            setTimeout(() => this.endBossBattle(false), 2000);
        }
    }

    endBossBattle(won) {
        this.isBossBattle = false;

        if (won) {
            const boss = this.aiCompetitors[this.currentAI];
            const reward = 5000;
            this.playerData.totalScore += reward;

            if (!this.playerData.bossesDefeated) {
                this.playerData.bossesDefeated = {};
            }
            this.playerData.bossesDefeated[this.currentAI] = true;

            this.savePlayerData();
            this.checkAchievements();

            // Boss drops a random item
            this.dropBossLoot();

            // Check if this is part of Boss Rush
            if (this.isBossRush) {
                this.bossRushScore += reward;
                alert(`🎉 Boss ${this.bossRushIndex}/8 defeated!\n\n+${reward} points!`);
                setTimeout(() => this.startNextBossRush(), 1000);
                return;
            }

            alert(`🎉 VICTORY! You defeated ${boss.name}!\n\n+${reward} points!\n\nCheck your inventory for a boss drop!`);
        } else {
            // Boss Rush fails if you lose any boss
            if (this.isBossRush) {
                this.isBossRush = false;
                alert(`💀 BOSS RUSH FAILED!\n\nDefeated by ${this.aiCompetitors[this.currentAI].name}.\n\nTry again!`);
            } else {
                alert(`💀 DEFEAT! You failed the boss challenge.\n\nTry again when you're ready!`);
            }
        }

        this.showScreen('ai-pvp-screen');
        this.renderAIPvPScreen();
    }

    simulateAIAnswer(question, isPlayerCurveball) {
        const ai = this.aiCompetitors[this.currentAI];
        let aiAccuracy = ai.accuracy;

        // Apply AI-specific logic
        if (isPlayerCurveball) {
            aiAccuracy = ai.curveballAccuracy;
        }

        // Mr. Electro special accuracy for hard/insane questions
        if (this.currentAI === 'mrelectro' && question.difficulty >= 3) {
            aiAccuracy = ai.hardInsaneAccuracy || 0.99;
        }

        // Subject bosses get bonus accuracy on their specialty
        if (ai.specialty && question.subject === ai.specialty) {
            aiAccuracy = Math.min(1.0, aiAccuracy + 0.02);
        }

        // Einstein struggles with modern trivia (post-1955)
        if (this.currentAI === 'einstein' && question.category === 'trivia' && question.isModern) {
            aiAccuracy *= 0.6;
        }

        // Cheater struggles with hard math
        if (this.currentAI === 'cheater' && question.category === 'math' && question.difficulty >= 3) {
            aiAccuracy *= 0.3;
        }

        const isCorrect = Math.random() < aiAccuracy;

        if (isCorrect) {
            this.aiScore += isPlayerCurveball ? 3 : 1;
        } else {
            this.aiLives -= isPlayerCurveball ? 3 : 1;
        }

        return isCorrect;
    }





    // Daily Challenge System
    getDayOfCycle(date = new Date()) {
        // Start from a fixed date (Jan 1, 2024) and cycle every 196 days (28 days * 7 weeks)
        const startDate = new Date('2024-01-01');
        const daysDiff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
        return (daysDiff % 196) + 1;
    }

    getDayOfWeek(date = new Date()) {
        return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    }

    generateDailyChallengeQuestions(dayOfCycle) {
        // Use hardcoded questions from the 196-day cycle
        const questionIndex = (dayOfCycle - 1) % this.dailyChallengeQuestions.length;
        const dailyQ = this.dailyChallengeQuestions[questionIndex];

        // Convert to quiz format
        return [{
            question: dailyQ.question,
            answers: dailyQ.answers,
            correct: dailyQ.correct,
            difficulty: dailyQ.difficulty,
            subject: 'trivia',
            used: false
        }];
    }

    generateDailyChallengeQuestionsOld(dayOfCycle) {
        // OLD METHOD - kept for reference
        // Use day of cycle as seed for consistent daily questions
        const seed = dayOfCycle;

        // Get all questions from all subjects
        const allQuestions = [];
        Object.values(this.questionBank).forEach(subjectQuestions => {
            allQuestions.push(...subjectQuestions);
        });

        // Seeded random selection for consistent daily questions
        const seededRandom = (seed) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        // Select 1 question using seeded random
        const randomIndex = Math.floor(seededRandom(seed) * allQuestions.length);
        return [{ ...allQuestions[randomIndex], used: false }];
    }

    getTodaysChallengeInfo() {
        const today = new Date();
        const dayOfCycle = this.getDayOfCycle(today);
        const dayOfWeek = this.getDayOfWeek(today);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return {
            date: today.toDateString(),
            dayOfCycle: dayOfCycle,
            dayOfWeek: dayOfWeek,
            dayName: dayNames[dayOfWeek],
            isCompleted: this.playerData.completedChallenges[today.toDateString()] || false
        };
    }

    getChallengeInfo(daysAgo = 0) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const dayOfCycle = this.getDayOfCycle(date);
        const dayOfWeek = this.getDayOfWeek(date);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Ensure completedChallenges exists
        if (!this.playerData.completedChallenges) {
            this.playerData.completedChallenges = {};
        }

        return {
            date: date.toDateString(),
            dayOfCycle: dayOfCycle,
            dayOfWeek: dayOfWeek,
            dayName: dayNames[dayOfWeek],
            isCompleted: this.playerData.completedChallenges[date.toDateString()] || false,
            daysAgo: daysAgo
        };
    }

    startDailyChallenge(daysAgo = 0) {
        const challengeInfo = this.getChallengeInfo(daysAgo);

        // Check if already completed
        if (challengeInfo.isCompleted) {
            alert('You already completed this daily challenge!');
            return;
        }

        this.currentDailyChallenge = challengeInfo;
        this.isDailyChallenge = true;
        this.maxQuestions = 1;
        this.selectedQuestionCount = 1;

        // Generate 1 question for this specific day
        this.questions = this.generateDailyChallengeQuestions(challengeInfo.dayOfCycle);
        this.questions.forEach(q => q.used = false);

        this.startQuiz();
    }

    startMultiDayChallenge(days) {
        // Check if all required days are completed
        const today = new Date();
        const missingDays = [];

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();

            if (!this.playerData.completedChallenges[dateStr]) {
                missingDays.push(i);
            }
        }

        if (missingDays.length > 0) {
            alert(`You need to complete the daily challenges for the last ${days} days first!\nMissing: ${missingDays.length} day(s)`);
            return;
        }

        // Check if this multi-day challenge was already completed today
        const challengeKey = `${days}day_${today.toDateString()}`;
        if (this.playerData.completedMultiDayChallenges && this.playerData.completedMultiDayChallenges[challengeKey]) {
            alert(`You already completed the ${days}-day challenge today! Come back tomorrow!`);
            return;
        }

        // Collect questions from the last N days
        this.currentDailyChallenge = {
            type: 'multiday',
            days: days,
            date: today.toDateString()
        };
        this.isDailyChallenge = true;
        this.maxQuestions = days;
        this.selectedQuestionCount = days;

        // Generate questions from last N days
        const questions = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayOfCycle = this.getDayOfCycle(date);
            const dayQuestions = this.generateDailyChallengeQuestions(dayOfCycle);
            questions.push(...dayQuestions);
        }

        this.questions = questions;
        this.questions.forEach(q => q.used = false);

        this.startQuiz();
    }

    completeDailyChallenge(score) {
        // Handle multi-day challenges
        if (this.currentDailyChallenge.type === 'multiday') {
            const days = this.currentDailyChallenge.days;
            const challengeKey = `${days}day_${this.currentDailyChallenge.date}`;

            if (!this.playerData.completedMultiDayChallenges) {
                this.playerData.completedMultiDayChallenges = {};
            }

            this.playerData.completedMultiDayChallenges[challengeKey] = {
                score: score,
                completedAt: new Date().toISOString(),
                perfect: score === days
            };

            // Award rewards
            if (days === 10) {
                this.playerData.totalScore += 500;
                alert('🎉 10-DAY CHALLENGE COMPLETE! +500 points!');
            } else if (days === 20) {
                this.playerData.totalScore += 1200;
                alert('🎉 20-DAY CHALLENGE COMPLETE! +1,200 points!');
            } else if (days === 30) {
                this.playerData.totalScore += 3000;
                this.unlockAchievementItem('crown');
                alert('🎉 MONTHLY CHALLENGE COMPLETE! +3,000 points + Crown unlocked!');
            }

            this.isDailyChallenge = false;
            this.currentDailyChallenge = null;
            this.checkAchievements();
            this.savePlayerData();
            this.renderDailyChallenges();
            return;
        }

        // Handle single daily challenge
        const challengeDate = this.currentDailyChallenge.date;
        const daysAgo = this.currentDailyChallenge.daysAgo;

        // Mark as completed
        this.playerData.completedChallenges[challengeDate] = {
            score: score,
            completedAt: new Date().toISOString(),
            perfect: score === 1
        };

        // Update statistics
        this.playerData.dailyChallengesCompleted = (this.playerData.dailyChallengesCompleted || 0) + 1;

        if (score === 1) {
            this.playerData.perfectDailies = (this.playerData.perfectDailies || 0) + 1;
        }

        // Track by day of week
        const dayOfWeek = this.currentDailyChallenge.dayName;
        if (!this.playerData.dailyChallengesByDay) {
            this.playerData.dailyChallengesByDay = {};
        }
        this.playerData.dailyChallengesByDay[dayOfWeek] = true;

        // Update streak (only for current/recent challenges)
        if (daysAgo <= 1) {
            this.updateDailyStreak();
        }

        // Track oldest challenge completed
        if (daysAgo > (this.playerData.oldestChallengeCompleted || 0)) {
            this.playerData.oldestChallengeCompleted = daysAgo;
        }

        // Check for completed cycles
        this.checkCompletedCycles();

        this.isDailyChallenge = false;
        this.currentDailyChallenge = null;

        this.checkAchievements();
        this.savePlayerData();
        this.renderDailyChallenges();
    }

    updateDailyStreak() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayCompleted = this.playerData.completedChallenges[today.toDateString()];
        const yesterdayCompleted = this.playerData.completedChallenges[yesterday.toDateString()];

        if (todayCompleted) {
            if (yesterdayCompleted || this.playerData.dailyStreak === 0) {
                this.playerData.dailyStreak = (this.playerData.dailyStreak || 0) + 1;
            } else {
                this.playerData.dailyStreak = 1;
            }
        }
    }

    checkCompletedCycles() {
        // Check if player has completed a full 28-day cycle
        const completedDays = Object.keys(this.playerData.completedChallenges);
        const cycleGroups = {};

        completedDays.forEach(dateStr => {
            const date = new Date(dateStr);
            const dayOfCycle = this.getDayOfCycle(date);
            const cycleNumber = Math.floor((dayOfCycle - 1) / 28);

            if (!cycleGroups[cycleNumber]) {
                cycleGroups[cycleNumber] = new Set();
            }
            cycleGroups[cycleNumber].add((dayOfCycle - 1) % 28);
        });

        // Count completed cycles (cycles with all 28 days)
        let completedCycles = 0;
        Object.values(cycleGroups).forEach(cycleSet => {
            if (cycleSet.size === 28) {
                completedCycles++;
            }
        });

        this.playerData.completedCycles = completedCycles;
    }

    renderDailyChallenges() {
        this.renderTodaysChallenge();
        this.renderChallengeCalendar();
    }

    renderTodaysChallenge() {
        const container = document.getElementById('today-challenge-card');
        if (!container) return;

        const todayInfo = this.getTodaysChallengeInfo();

        container.innerHTML = `
            <div class="challenge-header">
                <h5>${todayInfo.dayName}</h5>
                <span class="challenge-date">${todayInfo.date}</span>
            </div>
            <div class="challenge-info">
                <span class="challenge-cycle">Day ${todayInfo.dayOfCycle} of 196</span>
                <span class="challenge-questions">28 Questions</span>
            </div>
            <div class="challenge-status">
                ${todayInfo.isCompleted ?
                `<span class="completed">✅ Completed</span>` :
                `<button class="challenge-btn" onclick="game.startDailyChallenge(0)">Start Today's Challenge</button>`
            }
            </div>
        `;
    }

    renderChallengeCalendar() {
        const container = document.getElementById('challenge-calendar-grid');
        if (!container) return;

        let calendarHTML = '';

        // Show last 30 days
        for (let i = 1; i <= 30; i++) {
            const challengeInfo = this.getChallengeInfo(i);
            const statusClass = challengeInfo.isCompleted ? 'completed' : 'available';

            calendarHTML += `
                <div class="calendar-day ${statusClass}" onclick="game.startDailyChallenge(${i})" title="${challengeInfo.dayName}, ${challengeInfo.date}">
                    <div class="day-number">${i}</div>
                    <div class="day-name">${challengeInfo.dayName.slice(0, 3)}</div>
                    <div class="day-status">${challengeInfo.isCompleted ? '✅' : '📅'}</div>
                </div>
            `;
        }

        container.innerHTML = calendarHTML;
    }

    // AI Battle Real-time Methods
    displayAIQuestion(question) {
        document.getElementById('ai-question-text').textContent = question.question;

        // Show AI thinking
        document.querySelector('.ai-thinking').style.display = 'block';

        // Display AI answers
        const aiAnswersContainer = document.getElementById('ai-answers-container');
        aiAnswersContainer.innerHTML = '';

        question.answers.forEach((answer, index) => {
            const div = document.createElement('div');
            div.className = 'ai-answer-option';
            div.textContent = answer;
            div.dataset.index = index;
            aiAnswersContainer.appendChild(div);
        });
    }

    scheduleAIAnswer(question) {
        // AI answers after a delay
        const delay = this.aiAnswerDelay;

        setTimeout(() => {
            this.processAIAnswer(question);
        }, delay);
    }

    processAIAnswer(question) {
        const ai = this.aiCompetitors[this.currentAI];
        let aiAccuracy = ai.accuracy;

        // Apply AI-specific logic
        if (this.isCurveball) {
            aiAccuracy = ai.curveballAccuracy || aiAccuracy;
        }

        // Einstein struggles with modern trivia (post-1955)
        if (this.currentAI === 'einstein' && question.category === 'trivia') {
            aiAccuracy *= 0.6;
        }

        // Cheater struggles with hard math
        if (this.currentAI === 'cheater' && question.category === 'math' && question.difficulty >= 3) {
            aiAccuracy *= 0.3;
        }

        const isCorrect = Math.random() < aiAccuracy;

        // Update AI stats
        this.aiQuestionsAnswered++;

        if (isCorrect) {
            this.aiScore += this.isCurveball ? 3 : 1;
            this.aiCorrectAnswers++;
        } else {
            this.aiLives -= this.isCurveball ? 3 : 1;
        }

        // Visual feedback
        this.showAIAnswer(question, isCorrect);

        // Update AI display
        document.getElementById('ai-lives-display').textContent = '❤️'.repeat(Math.max(0, this.aiLives));
        document.getElementById('ai-score-display').textContent = this.aiScore;
        document.getElementById('ai-progress-display').textContent = `${this.aiQuestionsAnswered}/${this.maxQuestions}`;

        // Check if AI lost
        if (this.aiLives <= 0) {
            setTimeout(() => this.endAIBattle(), 1000);
        }
    }

    showAIAnswer(question, isCorrect) {
        document.querySelector('.ai-thinking').style.display = 'none';

        const correctAnswers = Array.isArray(question.correct) ? question.correct : [question.correct];
        const aiAnswers = document.querySelectorAll('.ai-answer-option');

        // Highlight correct answer(s)
        correctAnswers.forEach(index => {
            aiAnswers[index].classList.add('ai-correct');
        });

        // If AI got it wrong, show what they picked
        if (!isCorrect) {
            const wrongIndex = Math.floor(Math.random() * question.answers.length);
            if (!correctAnswers.includes(wrongIndex)) {
                aiAnswers[wrongIndex].classList.add('ai-incorrect');
            }
        }

        // Show feedback
        const feedbackText = isCorrect ? '✅ Correct!' : '❌ Wrong!';
        document.getElementById('ai-feedback-text').textContent = feedbackText;
        document.getElementById('ai-feedback').style.display = 'block';

        // Hide feedback after 2 seconds
        setTimeout(() => {
            document.getElementById('ai-feedback').style.display = 'none';
            aiAnswers.forEach(ans => {
                ans.classList.remove('ai-correct', 'ai-incorrect');
            });
        }, 2000);
    }

    endAIBattle() {
        // Hide feedback/next button immediately
        const feedbackEl = document.getElementById('feedback');
        if (feedbackEl) {
            feedbackEl.classList.add('hidden');
        }

        const playerTime = Math.round((new Date() - this.startTime) / 1000);

        let playerWon = false;
        let pointsEarned = 0;

        if (this.currentAI === 'hacker') {
            // Hacker: Speed-based battle
            // AI completes in 2 seconds per question
            const aiTime = this.maxQuestions * 2;

            // Player wins if they finish before AI AND have lives remaining
            if (this.lives > 0 && playerTime < aiTime) {
                playerWon = true;
                pointsEarned = this.score * 100; // Huge reward for beating Hacker
            } else {
                playerWon = false;
                pointsEarned = this.score * 1; // Small consolation
            }
        } else {
            // Other AIs: Lives-based battle
            // Player wins if AI loses all lives OR player has more lives when max questions reached
            if (this.aiLives <= 0) {
                playerWon = true;
            } else if (this.lives <= 0) {
                playerWon = false;
            } else if (this.questionsAnswered >= this.maxQuestions) {
                // Max questions reached - whoever has more lives wins
                playerWon = this.lives > this.aiLives;
            } else {
                // Both still have lives and haven't reached max questions
                playerWon = this.lives > this.aiLives;
            }

            // Normal scoring: score * AI accuracy, capped at reasonable amount
            const aiAcc = this.aiCompetitors[this.currentAI].accuracy;
            const basePoints = Math.round(this.score * aiAcc * 10);
            // Cap points at 1000 to prevent exploits from long battles
            pointsEarned = Math.min(basePoints, 1000);
        }

        if (playerWon) {
            this.handleAIBattleWin(pointsEarned);
        } else {
            this.handleAIBattleLoss(pointsEarned);
        }
    }

    handleAIBattleWin(pointsEarned) {
        if (!this.playerData.aiDefeated) {
            this.playerData.aiDefeated = {};
        }
        this.playerData.aiDefeated[this.currentAI] = (this.playerData.aiDefeated[this.currentAI] || 0) + 1;

        // Process cheat debt before adding points
        const actualPoints = this.processCheatDebt(pointsEarned);

        // Show debt notification if points were deducted
        if (actualPoints < pointsEarned && this.playerData.cheatDebt > 0) {
            setTimeout(() => {
                alert(`⚠️ Cheat Debt: ${pointsEarned - actualPoints} points deducted\n${this.playerData.cheatDebt} points remaining until debt is paid`);
            }, 500);
        }

        // Add bonus points to total score
        this.playerData.totalScore += actualPoints;

        // Unlock achievement items
        if (this.currentAI === 'hacker') {
            const duration = Math.round((new Date() - this.startTime) / 1000);
            const aiDuration = this.maxQuestions * 2;
            if (duration >= aiDuration) {
                alert(`You completed the quiz, but the Hacker was faster! You earned ${pointsEarned} points. Try again!`);
                this.endGame(false);
                return;
            }
            // Unlock hacker laptop
            this.unlockAchievementItem('laptop');
            if (!this.playerData.unlockedAvatars.includes('hacker_beater')) {
                this.playerData.unlockedAvatars.push('hacker_beater');
            }
        }

        if (this.currentAI === 'cheater') {
            // Unlock cheater's grin
            this.unlockAchievementItem('cheater_grin');
        }

        if (this.currentAI === 'einstein') {
            if (!this.playerData.unlockedAvatars.includes('nerd_century')) {
                this.playerData.unlockedAvatars.push('nerd_century');
            }
        }

        this.checkAchievements();
        this.savePlayerData();
        alert(`🎉 Congratulations! You defeated ${this.aiCompetitors[this.currentAI].name}!\n\nYou earned ${pointsEarned} bonus points!`);
        this.endGame(true);
    }

    handleAIBattleLoss(pointsEarned) {
        // Process cheat debt before adding points
        const actualPoints = this.processCheatDebt(pointsEarned);

        // Still earn some points for trying
        this.playerData.totalScore += actualPoints;
        this.savePlayerData();

        let message = `${this.aiCompetitors[this.currentAI].name} wins this round!\n\nYou earned ${actualPoints} points. Try again!`;
        if (actualPoints < pointsEarned && this.playerData.cheatDebt > 0) {
            message += `\n\n⚠️ Cheat Debt: ${pointsEarned - actualPoints} points deducted\n${this.playerData.cheatDebt} points remaining`;
        }

        alert(message);
        this.endGame(false);
    }

    // ============================================
    // SPECIAL GAME MODES
    // ============================================

    startSurvivalMode() {
        this.isSurvivalMode = true;
        this.lives = 3;
        this.score = 0;
        this.currentSubject = 'all';
        this.maxQuestions = 9999;
        this.selectedQuestionCount = 9999;
        this.powerupsDisabled = true;
        this.cheatCodeActive = false;

        alert('🏃‍♂️ SURVIVAL MODE\n\nEndless questions from all subjects!\nDifficulty increases every 10 questions.\nNo powerups or cheats allowed.\n\nHow long can you survive?');
        this.startQuiz();
    }

    startLightningRound() {
        this.isLightningRound = true;
        this.lives = 999;
        this.score = 0;
        this.currentSubject = 'all';
        this.maxQuestions = 9999;
        this.selectedQuestionCount = 9999;
        this.lightningTimeLeft = 60;

        alert('⚡ LIGHTNING ROUND\n\nAnswer as many questions as possible in 60 seconds!\nSpeed bonuses for quick answers!\n\nReady... Set... GO!');
        this.startQuiz();
        this.startLightningTimer();
    }

    startLightningTimer() {
        this.lightningTimer = setInterval(() => {
            this.lightningTimeLeft--;
            this.updateLightningDisplay();

            if (this.lightningTimeLeft <= 0) {
                clearInterval(this.lightningTimer);
                this.endGame(true);
            }
        }, 1000);
    }

    updateLightningDisplay() {
        const timerEl = document.getElementById('quiz-timer');
        if (timerEl) {
            timerEl.textContent = `⚡ ${this.lightningTimeLeft}s`;
            timerEl.classList.remove('hidden');
            if (this.lightningTimeLeft <= 10) {
                timerEl.style.color = '#ff0000';
            }
        }
    }

    startSuddenDeath() {
        this.isSuddenDeath = true;
        this.lives = 1;
        this.score = 0;
        this.currentSubject = 'all';
        this.maxQuestions = 20;
        this.selectedQuestionCount = 20;
        this.difficulty = 3;
        this.maxDifficulty = 4;
        this.powerupsDisabled = true;

        alert('💀 SUDDEN DEATH\n\nOnly 1 life!\nAll questions are Hard or Insane difficulty!\nNo powerups allowed!\n\n10x point multiplier!\n\nDo you dare?');
        this.startQuiz();
    }

    startBossRush() {
        this.isBossRush = true;
        this.bossRushIndex = 0;
        this.bossRushBosses = ['euler', 'mendeleev', 'einstein', 'darwin', 'shakespeare', 'napoleon', 'davinci', 'lovelace'];
        this.bossRushScore = 0;

        alert('👑 BOSS RUSH MODE\n\nFight all 8 bosses back-to-back!\nNo breaks between battles!\n100% accuracy required for each!\n\nEpic rewards await!');
        this.startNextBossRush();
    }

    startNextBossRush() {
        if (this.bossRushIndex >= this.bossRushBosses.length) {
            this.completeBossRush();
            return;
        }

        const bossType = this.bossRushBosses[this.bossRushIndex];
        this.bossRushIndex++;

        alert(`Boss ${this.bossRushIndex}/8: ${this.aiCompetitors[bossType].name}`);
        this.startBossBattle(bossType);
    }

    completeBossRush() {
        this.isBossRush = false;
        const reward = 25000;
        this.playerData.totalScore += reward;
        this.playerData.bossRushCompleted = (this.playerData.bossRushCompleted || 0) + 1;

        this.unlockAchievementItem('boss_rush_crown');
        this.savePlayerData();
        this.checkAchievements();

        alert(`🎉 BOSS RUSH COMPLETE!\n\nYou defeated all 8 bosses!\n\n+${reward} points!\nBoss Rush Crown unlocked!`);
        this.showScreen('home-screen');
    }

    initializeQuestionOfTheDay() {
        const today = new Date().toDateString();
        const qotdKey = `qotd_${today}`;

        if (localStorage.getItem(qotdKey)) {
            return;
        }

        const seed = new Date().getDate() + new Date().getMonth() * 31;
        const allQuestions = [];
        Object.values(this.questionBank).forEach(subjectQuestions => {
            const hardQuestions = subjectQuestions.filter(q => q.difficulty >= 3);
            allQuestions.push(...hardQuestions);
        });

        const index = seed % allQuestions.length;
        this.questionOfTheDay = allQuestions[index];
    }

    showQuestionOfTheDay() {
        if (!this.questionOfTheDay) return;

        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.9); display: flex; align-items: center; 
                        justify-content: center; z-index: 10000;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            padding: 40px; border-radius: 20px; max-width: 600px; color: white;">
                    <h2 style="text-align: center; margin-bottom: 20px;">🌟 Question of the Day</h2>
                    <p style="font-size: 1.2rem; margin: 20px 0;">${this.questionOfTheDay.question}</p>
                    <div id="qotd-answers" style="display: grid; gap: 10px; margin: 20px 0;"></div>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="width: 100%; padding: 15px; background: white; color: #667eea; 
                                   border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
                        Skip for Today
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const answersDiv = document.getElementById('qotd-answers');
        this.questionOfTheDay.answers.forEach((answer, index) => {
            const btn = document.createElement('button');
            btn.textContent = answer;
            btn.style.cssText = 'padding: 15px; background: rgba(255,255,255,0.2); border: 2px solid white; border-radius: 10px; color: white; cursor: pointer; font-size: 1rem;';
            btn.addEventListener('click', () => this.answerQuestionOfTheDay(index, modal));
            answersDiv.appendChild(btn);
        });
    }

    answerQuestionOfTheDay(selectedIndex, modal) {
        const correct = selectedIndex === this.questionOfTheDay.correct;
        const today = new Date().toDateString();

        localStorage.setItem(`qotd_${today}`, correct ? 'correct' : 'wrong');

        if (correct) {
            this.playerData.totalScore += 1000;
            this.savePlayerData();
            alert('🎉 CORRECT!\n\n+1,000 points!');
        } else {
            alert(`❌ Wrong!\n\nCorrect answer: ${this.questionOfTheDay.answers[this.questionOfTheDay.correct]}`);
        }

        modal.remove();
    }

    initializeRival() {
        if (!this.playerData.rivalActive) {
            this.playerData.rivalActive = false;
            this.playerData.rivalLevel = 1;
            this.playerData.rivalWrongAnswers = [];
        }

        if (this.playerData.quizzesCompleted >= 10 && !this.playerData.rivalActive) {
            this.playerData.rivalActive = true;
            setTimeout(() => {
                alert('🤺 A RIVAL HAS APPEARED!\n\nYour rival has been studying your mistakes...\nThey will challenge you with questions you got wrong!\n\nDefeat them to prove your knowledge!');
            }, 2000);
        }
    }

    trackWrongAnswer(question) {
        if (!this.playerData.rivalWrongAnswers) {
            this.playerData.rivalWrongAnswers = [];
        }

        if (this.playerData.rivalWrongAnswers.length < 50) {
            this.playerData.rivalWrongAnswers.push({
                question: question.question,
                answers: question.answers,
                correct: question.correct,
                subject: this.currentSubject
            });
        }
    }

    startRivalBattle() {
        if (!this.playerData.rivalActive || !this.playerData.rivalWrongAnswers ||
            this.playerData.rivalWrongAnswers.length < 5) {
            alert('Your rival needs more data! Get some questions wrong first!');
            return;
        }

        this.isRivalBattle = true;
        this.currentSubject = 'custom';
        this.customQuestions = this.playerData.rivalWrongAnswers.slice(0, 10);
        this.maxQuestions = this.customQuestions.length;
        this.selectedQuestionCount = this.maxQuestions;

        alert(`🤺 RIVAL BATTLE!\n\nYour rival challenges you with ${this.maxQuestions} questions you got wrong!\n\nDefeat them to level up!`);
        this.startQuiz();
    }

    checkPrestige() {
        const level = this.calculateLevel();

        if (level >= 100 && !this.playerData.prestigeLevel) {
            this.showPrestigeOption();
        }
    }

    showPrestigeOption() {
        const prestige = confirm('🌟 PRESTIGE AVAILABLE!\n\nYou have reached level 100!\n\nPrestige to:\n• Reset your level\n• Gain +5% permanent point bonus\n• Unlock exclusive cosmetics\n• Join the Prestige Leaderboard\n\nPrestige now?');

        if (prestige) {
            this.performPrestige();
        }
    }

    performPrestige() {
        this.playerData.prestigeLevel = (this.playerData.prestigeLevel || 0) + 1;
        this.playerData.prestigeBonus = this.playerData.prestigeLevel * 0.05;

        this.playerData.totalScore = 0;
        this.playerData.quizzesCompleted = 0;

        this.savePlayerData();

        alert(`⭐ PRESTIGE ${this.playerData.prestigeLevel}!\n\nYou now have +${this.playerData.prestigeBonus * 100}% permanent point bonus!\n\nExclusive Prestige ${this.playerData.prestigeLevel} cosmetics unlocked!`);
        location.reload();
    }

    initializePowerUpCombos() {
        this.powerUpCombos = {
            'smart_skip': { items: ['5050', 'skip'], effect: 'Skip to easier question', icon: '🎯' },
            'second_chance': { items: ['life', 'time'], effect: 'Revive with time bonus', icon: '⏰' },
            'mega_multiplier': { items: ['double', 'combo'], effect: '5x points for next question', icon: '💥' }
        };
    }

    checkPowerUpCombo(item1, item2) {
        for (const [comboName, combo] of Object.entries(this.powerUpCombos)) {
            if (combo.items.includes(item1) && combo.items.includes(item2)) {
                this.activatePowerUpCombo(comboName, combo);
                return true;
            }
        }
        return false;
    }

    activatePowerUpCombo(comboName, combo) {
        alert(`💥 POWER-UP COMBO!\n\n${combo.icon} ${comboName.toUpperCase()}\n\n${combo.effect}`);
        this.playSound('achievement');

        switch (comboName) {
            case 'smart_skip':
                this.difficulty = Math.max(1, this.difficulty - 1);
                this.nextQuestion();
                break;
            case 'second_chance':
                this.lives += 2;
                this.lightningTimeLeft += 10;
                break;
            case 'mega_multiplier':
                this.currentMultiplier *= 5;
                break;
        }
    }
}

// Make game globally accessible for onclick handlers
let game;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing QuizGame...');
    try {
        game = new QuizGame();
        console.log('QuizGame initialized successfully:', game);
    } catch (error) {
        console.error('Error initializing QuizGame:', error);
    }
});