/**
 * gravity-slingshot.js - 引力弹弓游戏（Gravity Slingshot）
 * 核心玩法：拖拽发射能量球，利用行星引力弯曲弹道，射入虫洞
 */
const GravitySlingshot = (() => {
    'use strict';

    const PI = Math.PI;
    const TAU = PI * 2;
    const G = 1000000; // 引力常数（游戏内调参）
    const MAX_SPEED = 600;
    const TRAIL_LENGTH = 60;
    const PREDICTION_STEPS = 300;
    const PREDICTION_DT = 1 / 60;

    // ===== 状态 =====
    let canvas, ctx, W, H;
    let active = false;
    let running = false;
    let animId = null;

    // 关卡
    let currentLevel = 0;
    let shots = 0;
    let bestShots = {};
    let totalShots = 0;
    let totalStars = 0;

    // 发射器
    let launcher = { x: 0, y: 0 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragEnd = { x: 0, y: 0 };

    // 能量球
    let ball = null;
    let ballTrail = [];
    let ballActive = false;

    // 预测轨迹
    let prediction = [];

    // 场景对象
    let planets = [];
    let wormhole = null;
    let stars = [];

    // 粒子
    let particles = [];

    // 反馈
    let feedbackText = '';
    let feedbackTimer = 0;
    let feedbackColor = '#22C55E';
    let levelComplete = false;

    // 知识提示
    let knowledgeTips = [];
    let currentTipIndex = 0;
    let tipTimer = 0;

    // ===== 成就与皮肤数据 =====
    let unlockedAchievements = [];
    let unlockedSkins = [];
    let equippedSkins = { ball: 'default', wormhole: 'default', planet: 'default' };
    let globalParticles = []; // For planet skins global effects

    let totalLaunches = parseInt(localStorage.getItem('slingshot_total_launches') || '0', 10);
    let totalWins = parseInt(localStorage.getItem('slingshot_total_wins') || '0', 10);
    let consecutiveFails = 0; // 连续失败次数

    const ACHIEVEMENTS = [
        { id: 'firstLaunch', i18nKey: 'slingshot.achievement.firstLaunch' },
        { id: 'bullseye', i18nKey: 'slingshot.achievement.bullseye' },
        { id: 'neverGiveUp', i18nKey: 'slingshot.achievement.neverGiveUp' },
        { id: 'starExplorer', i18nKey: 'slingshot.achievement.starExplorer', total: 15 },
        { id: 'blackHoleSurvivor', i18nKey: 'slingshot.achievement.blackHoleSurvivor' },
        { id: 'gravityMaster', i18nKey: 'slingshot.achievement.gravityMaster' },
        { id: 'perfectionist', i18nKey: 'slingshot.achievement.perfectionist' }
    ];

    const SKINS = {
        ball: [
            { id: 'default', i18nKey: 'slingshot.skin.ball.default' },
            { id: 'comet', i18nKey: 'slingshot.skin.ball.comet', total: 25 }, // 累计发射25次
            { id: 'pulsar', i18nKey: 'slingshot.skin.ball.pulsar', total: 15 }, // 累计15星
            { id: 'meteor', i18nKey: 'slingshot.skin.ball.meteor' }, // 单局5次以上通关
            { id: 'darkMatter', i18nKey: 'slingshot.skin.ball.darkMatter' }, // 通关第10关
            { id: 'galaxy', i18nKey: 'slingshot.skin.ball.galaxy' } // 满星通关全部
        ],
        wormhole: [
            { id: 'default', i18nKey: 'slingshot.skin.wormhole.default' },
            { id: 'spaceRift', i18nKey: 'slingshot.skin.wormhole.spaceRift', total: 20 }, // 累计通关20次
            { id: 'quantumTunnel', i18nKey: 'slingshot.skin.wormhole.quantumTunnel' }, // 1杆通关
            { id: 'whiteHole', i18nKey: 'slingshot.skin.wormhole.whiteHole', total: 3 } // 解锁3个成就
        ],
        planet: [
            { id: 'default', i18nKey: 'slingshot.skin.planet.default' },
            { id: 'iceAge', i18nKey: 'slingshot.skin.planet.iceAge', total: 50 }, // 累计发射50次
            { id: 'lavaWorld', i18nKey: 'slingshot.skin.planet.lavaWorld' }, // 通关第12关
            { id: 'cyberNeon', i18nKey: 'slingshot.skin.planet.cyberNeon' }, // 解锁所有球皮肤
            { id: 'ringedPlanet', i18nKey: 'slingshot.skin.planet.ringedPlanet', total: 30 } // 累计30星
        ]
    };

    // ===== DOM =====
    let elLevel, elShots, elBest;
    let elWinOverlay, elStars;
    let elKnowledgeTip, elKnowledgeText;
    let elCompleteOverlay, elCompleteTotalShots, elCompleteTotalStars, elCompleteBtn;
    let elStartOverlay, elLevelSelectOverlay;

    // ===== 关卡数据 =====
    const levels = [
        // Level 1: 直线射击（教学关）
        {
            launcher: { x: 0.1, y: 0.5 },
            wormhole: { x: 0.85, y: 0.5 },
            planets: [],
            par: 1,
            tip: 'slingshot.knowledge.radius'
        },
        // Level 2: 单行星偏转
        {
            launcher: { x: 0.1, y: 0.7 },
            wormhole: { x: 0.85, y: 0.3 },
            planets: [{ x: 0.45, y: 0.5, r: 0.06, mass: 1 }],
            par: 2,
            tip: 'slingshot.knowledge.area'
        },
        // Level 3: 双行星通道
        {
            launcher: { x: 0.08, y: 0.5 },
            wormhole: { x: 0.9, y: 0.5 },
            planets: [
                { x: 0.35, y: 0.3, r: 0.05, mass: 0.8 },
                { x: 0.35, y: 0.7, r: 0.05, mass: 0.8 }
            ],
            par: 2,
            tip: 'slingshot.knowledge.tangent'
        },
        // Level 4: 引力弹弓
        {
            launcher: { x: 0.08, y: 0.2 },
            wormhole: { x: 0.9, y: 0.8 },
            planets: [
                { x: 0.5, y: 0.5, r: 0.08, mass: 2 }
            ],
            par: 2,
            tip: 'slingshot.knowledge.arc'
        },
        // Level 5: 三行星迷宫
        {
            launcher: { x: 0.08, y: 0.5 },
            wormhole: { x: 0.92, y: 0.15 },
            planets: [
                { x: 0.3, y: 0.4, r: 0.05, mass: 1 },
                { x: 0.5, y: 0.7, r: 0.06, mass: 1.2 },
                { x: 0.7, y: 0.3, r: 0.05, mass: 0.9 }
            ],
            par: 3,
            tip: 'slingshot.knowledge.pi'
        },
        // Level 6: 大行星引力场
        {
            launcher: { x: 0.08, y: 0.8 },
            wormhole: { x: 0.92, y: 0.2 },
            planets: [
                { x: 0.26, y: 0.3, r: 0.05, mass: 1.0 },
                { x: 0.5, y: 0.5, r: 0.12, mass: 3 },
                { x: 0.8, y: 0.55, r: 0.27, mass: 8 },
            ],
            par: 2,
            tip: 'slingshot.knowledge.tangent'
        },
        // Level 7: 小行星带
        {
            launcher: { x: 0.05, y: 0.5 },
            wormhole: { x: 0.95, y: 0.5 },
            planets: [
                { x: 0.25, y: 0.35, r: 0.03, mass: 0.5 },
                { x: 0.25, y: 0.65, r: 0.03, mass: 0.5 },
                { x: 0.45, y: 0.4, r: 0.03, mass: 0.5 },
                { x: 0.45, y: 0.6, r: 0.03, mass: 0.5 },
                { x: 0.65, y: 0.35, r: 0.03, mass: 0.5 },
                { x: 0.65, y: 0.65, r: 0.03, mass: 0.5 }
            ],
            par: 3,
            tip: 'slingshot.knowledge.arc'
        },
        // Level 8: 螺旋轨道
        {
            launcher: { x: 0.08, y: 0.9 },
            wormhole: { x: 0.5, y: 0.1 },
            planets: [
                { x: 0.3, y: 0.5, r: 0.07, mass: 1.5 },
                { x: 0.6, y: 0.4, r: 0.05, mass: 1 },
                { x: 0.4, y: 0.2, r: 0.04, mass: 0.8 }
            ],
            par: 3,
            tip: 'slingshot.knowledge.pi'
        },
        // Level 9: 引力走廊 (Gravity Corridor)
        {
            launcher: { x: 0.1, y: 0.5 },
            wormhole: { x: 0.9, y: 0.5 },
            planets: [
                { x: 0.3, y: 0.25, r: 0.15, mass: 30 },
                { x: 0.5, y: 0.75, r: 0.15, mass: 30 },
                { x: 0.7, y: 0.25, r: 0.15, mass: 30 }
            ],
            par: 2,
            tip: 'slingshot.knowledge.arc'
        },
        // Level 10: 死亡黑洞 (Deadly Black Hole)
        {
            launcher: { x: 0.1, y: 0.5 },
            wormhole: { x: 0.9, y: 0.8 },
            planets: [
                { x: 0.5, y: 0.5, r: 0.03, mass: 4.5, color: '#000000', solid: true }, // 体积小，质量极大
                { x: 0.55, y: 0.8, r: 0.03, mass: 4.5, color: '#000000', solid: true }, // 体积小，质量极大
                { x: 0.7, y: 0.4, r: 0.03, mass: 4.5, color: '#000000', solid: true } // 体积小，质量极大
            ],
            par: 2,
            tip: 'slingshot.knowledge.tangent'
        },
        // Level 11: 双星系统 (Binary System)
        {
            launcher: { x: 0.1, y: 0.8 },
            wormhole: { x: 0.9, y: 0.2 },
            planets: [
                { x: 0.45, y: 0.45, r: 0.08, mass: 1.8 },
                { x: 0.55, y: 0.55, r: 0.08, mass: 1.8 }
            ],
            par: 3,
            tip: 'slingshot.knowledge.area'
        },
        // Level 12: 混乱星系 (Chaos Galaxy)
        {
            launcher: { x: 0.08, y: 0.15 },
            wormhole: { x: 0.92, y: 0.85 },
            planets: [
                { x: 0.26, y: 0.3, r: 0.05, mass: 1.0 },
                { x: 0.5, y: 0.3, r: 0.1, mass: 2.3 },
                { x: 0.4, y: 0.7, r: 0.06, mass: 1.2 },
                { x: 0.8, y: 0.75, r: 0.03, mass: 4.5, color: '#000000', solid: true },
            ],
            par: 4,
            tip: 'slingshot.knowledge.radius'
        }
    ];

    // ===== UI 功能函数 =====
    let currentSkinTab = 'ball';
    let currentViewingSkin = null;
    let currentViewingSkinType = null;

    function renderAchievements() {
        const list = document.getElementById('slingshotAchievementList');
        if (!list) return;
        list.innerHTML = '';

        const achievementIcons = {
            firstLaunch: '🎯', bullseye: '🎯', neverGiveUp: '👑', starExplorer: '✨',
            blackHoleSurvivor: '🔥', gravityMaster: '⚔️', perfectionist: '⏱️'
        };

        ACHIEVEMENTS.forEach(ach => {
            const isUnlocked = unlockedAchievements.includes(ach.id);
            const icon = achievementIcons[ach.id] || '🏆';
            const name = GameI18N.t(ach.i18nKey);

            let badgeHtml = '';
            if (isUnlocked) {
                badgeHtml = `<span class="achievement-badge">已达成</span>`;
            } else {
                badgeHtml = `<span class="achievement-badge locked-badge">🔒</span>`;
            }

            const card = document.createElement('div');
            card.className = `achievement-card ${isUnlocked ? '' : 'locked'}`;
            card.innerHTML = `
                <div class="achievement-icon">${icon}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${name}</div>
                    <div class="achievement-desc"></div>
                </div>
                ${badgeHtml}
            `;
            card.onclick = () => {
                GameAudio.playClick();
                showAchievementDetail(ach);
            };
            list.appendChild(card);
        });
    }

    function showAchievementDetail(ach) {
        const isUnlocked = unlockedAchievements.includes(ach.id);
        document.getElementById('slingshotAchievementDetailName').textContent = GameI18N.t(ach.i18nKey);
        document.getElementById('slingshotAchievementDetailDesc').textContent = GameI18N.t(ach.i18nKey + '.desc');

        const progressText = document.getElementById('slingshotAchievementDetailProgressText');
        const progressBar = document.getElementById('slingshotAchievementDetailProgressBar');

        if (ach.total) {
            let current = 0;
            if (ach.id === 'starExplorer') {
                let allStars = 0;
                for (let i = 0; i < levels.length; i++) {
                    const s = bestShots[i];
                    if (s) allStars += (s <= levels[i].par ? 3 : s <= levels[i].par + 1 ? 2 : 1);
                }
                current = allStars;
            }
            current = Math.min(current, ach.total);
            progressText.textContent = `${current}/${ach.total}`;
            progressBar.style.width = `${(current / ach.total) * 100}%`;
            progressText.parentElement.style.display = 'flex';
            progressBar.parentElement.parentElement.style.display = 'block';
        } else {
            progressText.textContent = isUnlocked ? '1/1' : '0/1';
            progressBar.style.width = isUnlocked ? '100%' : '0%';
            progressText.parentElement.style.display = 'flex';
            progressBar.parentElement.parentElement.style.display = 'block';
        }

        document.getElementById('slingshotAchievementDetailOverlay').style.display = 'flex';
    }

    function renderSkins(type) {
        const list = document.getElementById('slingshotSkinList');
        if (!list) return;
        list.innerHTML = '';

        const previewRenderers = {
            ball: (k) => `<div style="color:#FFF;">${k === 'comet' ? '❄️' : k === 'pulsar' ? '✨' : k === 'meteor' ? '🔥' : k === 'darkMatter' ? '🌑' : k === 'galaxy' ? '🌌' : '⚽'}</div>`,
            wormhole: (k) => `<div style="color:#FFF;">${k === 'spaceRift' ? '⚡' : k === 'quantumTunnel' ? '🌐' : k === 'whiteHole' ? '☀️' : '🌀'}</div>`,
            planet: (k) => `<div style="color:#FFF;">${k === 'iceAge' ? '🧊' : k === 'lavaWorld' ? '🌋' : k === 'cyberNeon' ? '🌃' : k === 'ringedPlanet' ? '🪐' : '🌍'}</div>`
        };

        SKINS[type].forEach(skin => {
            let isUnlocked = unlockedSkins.includes(skin.id);
            let isEquipped = equippedSkins[type] === skin.id;

            // ---- Force local condition check for skins before rendering to fix "reached but locked" bug ----
            if (!isUnlocked) {
                if (skin.id === 'comet' && totalLaunches >= 25) isUnlocked = true;
                if (skin.id === 'iceAge' && totalLaunches >= 50) isUnlocked = true;

                if (skin.id === 'pulsar' || skin.id === 'ringedPlanet') {
                    let stars = 0;
                    for (let i = 0; i < levels.length; i++) {
                        const s = bestShots[i];
                        if (s) stars += (s <= levels[i].par ? 3 : s <= levels[i].par + 1 ? 2 : 1);
                    }
                    if (skin.id === 'pulsar' && stars >= 15) isUnlocked = true;
                    if (skin.id === 'ringedPlanet' && stars >= 30) isUnlocked = true;
                }

                if (skin.id === 'spaceRift' && totalWins >= 20) isUnlocked = true;
                if (skin.id === 'whiteHole' && unlockedAchievements.length >= 3) isUnlocked = true;

                if (skin.id === 'cyberNeon') {
                    let allBallSkins = true;
                    SKINS.ball.forEach(bs => {
                        if (bs.id !== 'default' && !unlockedSkins.includes(bs.id)) allBallSkins = false;
                    });
                    if (allBallSkins) isUnlocked = true;
                }

                if (isUnlocked) {
                    unlockedSkins.push(skin.id);
                    saveProgress();
                }
            }
            // ----------------------------------------------------------------------------------------------

            const name = GameI18N.t(skin.i18nKey);
            const desc = GameI18N.t(skin.i18nKey + '.desc');

            let btnHtml = '';
            if (isUnlocked) {
                if (isEquipped) {
                    btnHtml = `<button class="btn skin-btn" disabled style="opacity:0.5;cursor:default;">${GameI18N.t('slingshot.equipped')}</button>`;
                } else {
                    btnHtml = `<button class="btn btn-primary skin-btn">${GameI18N.t('slingshot.equip')}</button>`;
                }
            }

            const card = document.createElement('div');
            card.className = `skin-card ${isUnlocked ? '' : 'locked'}`;

            card.innerHTML = `
                <div class="skin-preview">
                    ${previewRenderers[type] ? previewRenderers[type](skin.id) : ''}
                </div>
                <div class="skin-name">${name}</div>
                ${btnHtml}
                ${!isUnlocked ? `
                    <div class="skin-locked-overlay">
                        <div class="skin-locked-icon">🔒</div>
                        <div class="skin-locked-desc">${desc}</div>
                    </div>
                ` : ''}
            `;

            card.onclick = (e) => {
                // If clicked on button, don't open detail
                if (e.target.tagName.toLowerCase() === 'button') {
                    e.stopPropagation();
                    GameAudio.playClick();
                    equippedSkins[type] = skin.id;
                    saveProgress();

                    // 如果更换的是星球皮肤，实时更新背景音乐
                    if (type === 'planet') {
                        GameAudio.playBgm('slingshot_' + (skin.id || 'default'));
                    }

                    renderSkins(currentSkinTab);
                    return;
                }
                GameAudio.playClick();
                showSkinDetail(type, skin);
            };
            list.appendChild(card);
        });
    }

    function showSkinDetail(type, skin) {
        currentViewingSkin = skin;
        currentViewingSkinType = type;
        let isUnlocked = unlockedSkins.includes(skin.id);
        let isEquipped = equippedSkins[type] === skin.id;

        document.getElementById('slingshotSkinDetailName').textContent = GameI18N.t(skin.i18nKey);
        document.getElementById('slingshotSkinDetailDesc').textContent = GameI18N.t(skin.i18nKey + '.desc');

        const progressText = document.getElementById('slingshotSkinDetailProgressText');
        const progressBar = document.getElementById('slingshotSkinDetailProgressBar');

        if (skin.total) {
            let current = 0;
            if (skin.id === 'comet' || skin.id === 'iceAge') current = totalLaunches;
            if (skin.id === 'pulsar' || skin.id === 'ringedPlanet') {
                let allStars = 0;
                for (let i = 0; i < levels.length; i++) {
                    const s = bestShots[i];
                    if (s) allStars += (s <= levels[i].par ? 3 : s <= levels[i].par + 1 ? 2 : 1);
                }
                current = allStars;
            }
            if (skin.id === 'spaceRift') current = totalWins;
            if (skin.id === 'whiteHole') current = unlockedAchievements.length;

            current = Math.min(current, skin.total);
            if (isUnlocked) current = skin.total; // Ensure progress is maxed out if already unlocked

            progressText.textContent = `${current}/${skin.total}`;
            progressBar.style.width = `${(current / skin.total) * 100}%`;
            progressText.parentElement.style.display = 'flex';
            progressBar.parentElement.parentElement.style.display = 'block';
        } else {
            progressText.textContent = isUnlocked ? '1/1' : '0/1';
            progressBar.style.width = isUnlocked ? '100%' : '0%';
            progressText.parentElement.style.display = 'flex';
            progressBar.parentElement.parentElement.style.display = 'block';
        }

        const equipBtn = document.getElementById('slingshotSkinDetailEquipBtn');
        if (isUnlocked) {
            equipBtn.style.display = 'block';
            equipBtn.textContent = isEquipped ? GameI18N.t('slingshot.equipped') : GameI18N.t('slingshot.equip');
            equipBtn.disabled = isEquipped;
            equipBtn.className = isEquipped ? 'btn btn-outline btn-primary-full' : 'btn btn-primary btn-primary-full';
        } else {
            equipBtn.style.display = 'none';
        }

        document.getElementById('slingshotSkinDetailOverlay').style.display = 'flex';
    }

    function drawSkinPreviewInLoop() {
        const pCanvas = document.getElementById('slingshotSkinPreviewCanvas');
        if (!pCanvas) return;
        const pCtx = pCanvas.getContext('2d');
        const w = pCanvas.width;
        const h = pCanvas.height;
        const cx = w / 2;
        const cy = h / 2;

        pCtx.clearRect(0, 0, w, h);

        if (!currentViewingSkin || !currentViewingSkinType) return;

        // Temporarily replace global ctx and equippedSkins to use existing draw functions
        const oldCtx = ctx;
        ctx = pCtx;
        const oldEquipped = { ...equippedSkins };
        equippedSkins[currentViewingSkinType] = currentViewingSkin.id;

        if (currentViewingSkinType === 'ball') {
            const oldBall = ball;
            ball = { x: cx, y: cy };
            drawBall();
            ball = oldBall;
        } else if (currentViewingSkinType === 'wormhole') {
            const oldWh = wormhole;
            wormhole = { x: cx, y: cy, r: 30, angle: Date.now() / 1000 };
            drawWormhole();
            wormhole = oldWh;
        } else if (currentViewingSkinType === 'planet') {
            const oldPlanets = planets;
            planets = [{ x: cx, y: cy, r: 35, color: '#3B82F6', solid: false }];
            drawPlanets();
            planets = oldPlanets;
        }

        ctx = oldCtx;
        equippedSkins = oldEquipped;
    }

    // ===== 初始化 =====
    function init() {
        // 加载进度
        try {
            const savedAchievements = localStorage.getItem('slingshot_achievements');
            if (savedAchievements) unlockedAchievements = JSON.parse(savedAchievements);
            const savedSkins = localStorage.getItem('slingshot_skins');
            if (savedSkins) unlockedSkins = JSON.parse(savedSkins);
            else unlockedSkins = ['default']; // 默认拥有

            const savedEquipped = localStorage.getItem('slingshot_equipped_skins');
            if (savedEquipped) {
                equippedSkins = { ...equippedSkins, ...JSON.parse(savedEquipped) };
            }
        } catch (e) { console.error('Failed to load slingshot progress', e); }

        canvas = document.getElementById('slingshotCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        elLevel = document.getElementById('slingshotLevel');
        elShots = document.getElementById('slingshotShots');
        elBest = document.getElementById('slingshotBest');
        elWinOverlay = document.getElementById('slingshotWinOverlay');
        elStars = document.getElementById('slingshotStars');
        elKnowledgeTip = document.getElementById('slingshotKnowledgeTip');
        elKnowledgeText = document.getElementById('slingshotKnowledgeText');
        elCompleteOverlay = document.getElementById('slingshotCompleteOverlay');
        elCompleteTotalShots = document.getElementById('completeTotalShots');
        elCompleteTotalStars = document.getElementById('completeTotalStars');
        elCompleteBtn = document.getElementById('slingshotCompleteBtn');
        elStartOverlay = document.getElementById('slingshotStartOverlay');
        elLevelSelectOverlay = document.getElementById('slingshotLevelSelectOverlay');

        initKnowledgeTips();
        bindEvents();
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function initKnowledgeTips() {
        knowledgeTips = [
            GameI18N.t('slingshot.knowledge.radius'),
            GameI18N.t('slingshot.knowledge.area'),
            GameI18N.t('slingshot.knowledge.tangent'),
            GameI18N.t('slingshot.knowledge.arc'),
            GameI18N.t('slingshot.knowledge.pi'),
        ];
    }

    function resizeCanvas() {
        if (!canvas) return;
        const wrapper = canvas.parentElement;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        W = rect.width;
        H = rect.height;
    }

    function bindEvents() {
        const nextBtn = document.getElementById('slingshotNextBtn');
        if (nextBtn) nextBtn.addEventListener('click', nextLevel);

        const retryBtn = document.getElementById('slingshotRetryBtn');
        if (retryBtn) retryBtn.addEventListener('click', retryLevel);

        const quickRetryBtn = document.getElementById('slingshotQuickRetryBtn');
        if (quickRetryBtn) quickRetryBtn.addEventListener('click', retryLevel);

        const startBtn = document.getElementById('slingshotStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                GameAudio.playClick();
                if (elStartOverlay) elStartOverlay.style.display = 'none';
                running = true;
                loadLevel(0); // Start from level 1
            });
        }

        const selectLevelBtn = document.getElementById('slingshotSelectLevelBtn');
        if (selectLevelBtn) {
            selectLevelBtn.addEventListener('click', () => {
                GameAudio.playClick();
                if (elStartOverlay) elStartOverlay.style.display = 'none';
                if (elLevelSelectOverlay) elLevelSelectOverlay.style.display = 'flex';
            });
        }

        const closeLevelSelectBtn = document.getElementById('slingshotCloseLevelSelectBtn');
        if (closeLevelSelectBtn) {
            closeLevelSelectBtn.addEventListener('click', () => {
                GameAudio.playClick();
                if (elLevelSelectOverlay) elLevelSelectOverlay.style.display = 'none';
                if (elStartOverlay) elStartOverlay.style.display = 'flex';
            });
        }

        const levelBtns = document.querySelectorAll('.slingshot-level-btn');
        levelBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(e.target.dataset.level, 10);
                GameAudio.playClick();
                if (elLevelSelectOverlay) elLevelSelectOverlay.style.display = 'none';
                running = true;
                loadLevel(level);
            });
        });

        const backFromStartBtn = document.getElementById('slingshotBackFromStartBtn');
        if (backFromStartBtn) {
            // 这个事件实际上在 game.js 里统一绑定了，但这里加上防御性关闭逻辑
            backFromStartBtn.addEventListener('click', () => {
                document.getElementById('slingshotStartOverlay').style.display = 'none';
            });
        }

        if (elCompleteBtn) {
            elCompleteBtn.addEventListener('click', () => {
                GameAudio.playClick();
                if (elCompleteOverlay) elCompleteOverlay.style.display = 'none';
                hide();
                document.getElementById('slingshotBackBtn').click();
            });
        }

        // 成就和皮肤的按钮事件
        const achievementBtn = document.getElementById('slingshotAchievementBtn');
        if (achievementBtn) {
            achievementBtn.addEventListener('click', () => {
                GameAudio.playClick();
                if (elStartOverlay) elStartOverlay.style.display = 'none';
                document.getElementById('slingshotAchievementOverlay').style.display = 'flex';
                renderAchievements();
            });
        }

        const skinBtn = document.getElementById('slingshotSkinBtn');
        if (skinBtn) {
            skinBtn.addEventListener('click', () => {
                GameAudio.playClick();
                if (elStartOverlay) elStartOverlay.style.display = 'none';
                document.getElementById('slingshotSkinOverlay').style.display = 'flex';
                renderSkins(currentSkinTab);
            });
        }

        const achCloseBtn = document.getElementById('slingshotAchievementCloseBtn');
        if (achCloseBtn) {
            achCloseBtn.addEventListener('click', () => {
                GameAudio.playClick();
                document.getElementById('slingshotAchievementOverlay').style.display = 'none';
                if (elStartOverlay) elStartOverlay.style.display = 'flex';
            });
        }

        const skinCloseBtn = document.getElementById('slingshotSkinCloseBtn');
        if (skinCloseBtn) {
            skinCloseBtn.addEventListener('click', () => {
                GameAudio.playClick();
                document.getElementById('slingshotSkinOverlay').style.display = 'none';
                if (elStartOverlay) elStartOverlay.style.display = 'flex';
            });
        }

        const achDetailCloseBtn = document.getElementById('slingshotAchievementDetailCloseBtn');
        if (achDetailCloseBtn) {
            achDetailCloseBtn.addEventListener('click', () => {
                GameAudio.playClick();
                document.getElementById('slingshotAchievementDetailOverlay').style.display = 'none';
            });
        }

        const skinDetailCloseBtn = document.getElementById('slingshotSkinDetailCloseBtn');
        if (skinDetailCloseBtn) {
            skinDetailCloseBtn.addEventListener('click', () => {
                GameAudio.playClick();
                document.getElementById('slingshotSkinDetailOverlay').style.display = 'none';
            });
        }

        // Skin Tabs
        document.querySelectorAll('#slingshotSkinTabs .skin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                GameAudio.playClick();
                document.querySelectorAll('#slingshotSkinTabs .skin-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                currentSkinTab = e.target.dataset.target;
                renderSkins(currentSkinTab);
            });
        });

        // Equip button
        const equipBtn = document.getElementById('slingshotSkinDetailEquipBtn');
        if (equipBtn) {
            equipBtn.addEventListener('click', () => {
                if (!currentViewingSkin || !currentViewingSkinType) return;
                GameAudio.playClick();
                equippedSkins[currentViewingSkinType] = currentViewingSkin.id;
                saveProgress();

                // 如果更换的是星球皮肤，实时更新背景音乐
                if (currentViewingSkinType === 'planet') {
                    GameAudio.playBgm('slingshot_' + (currentViewingSkin.id || 'default'));
                }

                renderSkins(currentSkinTab); // update list UI
                showSkinDetail(currentViewingSkinType, currentViewingSkin); // update detail UI
            });
        }

        if (canvas) {
            canvas.addEventListener('pointerdown', onPointerDown);
            canvas.addEventListener('pointermove', onPointerMove);
            canvas.addEventListener('pointerup', onPointerUp);
            canvas.addEventListener('pointercancel', onPointerUp);
        }
    }

    // ===== 游戏流程 =====
    function show() {
        active = true;
        totalShots = 0;
        totalStars = 0;
        init();
        resizeCanvas();
        generateStars();

        // 根据当前装备的星球皮肤播放对应的 BGM
        GameAudio.playBgm('slingshot_' + (equippedSkins.planet || 'default'));

        // 显示开始卡片，并暂停游戏逻辑
        const startOverlay = document.getElementById('slingshotStartOverlay');
        if (startOverlay) startOverlay.style.display = 'flex';
        running = false;

        if (elWinOverlay) elWinOverlay.style.display = 'none';
        if (elCompleteOverlay) elCompleteOverlay.style.display = 'none';
        gameLoop();
    }

    function hide() {
        active = false;
        running = false;
        GameAudio.stopBgm();
        if (animId) cancelAnimationFrame(animId);
        animId = null;
    }

    function loadLevel(idx) {
        if (idx >= levels.length) idx = 0;
        currentLevel = idx;
        const level = levels[idx];

        // 设置发射器
        launcher.x = level.launcher.x * W;
        launcher.y = level.launcher.y * H;

        // 设置虫洞
        wormhole = {
            x: level.wormhole.x * W,
            y: level.wormhole.y * H,
            r: Math.min(W, H) * 0.03,
            angle: 0
        };

        // 设置行星
        planets = level.planets.map(p => ({
            x: p.x * W,
            y: p.y * H,
            r: p.r * Math.min(W, H),
            mass: p.mass,
            color: p.color || ['#2563EB', '#7C3AED', '#EC4899', '#06B6D4', '#F59E0B'][Math.floor(Math.random() * 5)],
            solid: !!p.solid
        }));

        // 重置状态
        ball = null;
        ballTrail = [];
        ballActive = false;
        isDragging = false;
        prediction = [];
        shots = 0;
        levelComplete = false;
        particles = [];
        feedbackText = '';
        feedbackTimer = 0;

        updateUI();
        showKnowledgeTip(level.tip);
    }

    function nextLevel() {
        GameAudio.playClick();
        if (elWinOverlay) elWinOverlay.style.display = 'none';

        if (currentLevel >= levels.length - 1) {
            loadLevel(0);
        } else {
            loadLevel(currentLevel + 1);
        }
    }

    function showCompleteOverlay() {
        if (elCompleteTotalShots) elCompleteTotalShots.textContent = totalShots;
        if (elCompleteTotalStars) elCompleteTotalStars.textContent = totalStars + '/' + (levels.length * 3);
        if (elCompleteOverlay) elCompleteOverlay.style.display = 'flex';
        GameAudio.playStarRating(3);
    }

    function retryLevel() {
        GameAudio.playClick();
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        loadLevel(currentLevel);
    }

    function generateStars() {
        stars = [];
        for (let i = 0; i < 80; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.5 + 0.3,
                alpha: Math.random() * 0.5 + 0.1,
                twinkle: Math.random() * TAU
            });
        }

        // 全局皮肤特效粒子 (冰川/熔岩/赛博)
        globalParticles = [];
        for (let i = 0; i < 50; i++) {
            globalParticles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 2,
                speedY: Math.random() * 2 + 1, // Base fall speed
                life: Math.random(),
                offset: Math.random() * 100
            });
        }
    }

    let toastQueue = [];
    let toastTimer = 0;
    let toastCurrent = null;

    // ===== 状态存储 =====
    function saveProgress() {
        localStorage.setItem('slingshot_achievements', JSON.stringify(unlockedAchievements));
        localStorage.setItem('slingshot_skins', JSON.stringify(unlockedSkins));
        localStorage.setItem('slingshot_equipped_skins', JSON.stringify(equippedSkins));
        localStorage.setItem('slingshot_total_launches', totalLaunches.toString());
        localStorage.setItem('slingshot_total_wins', totalWins.toString());
    }

    function showToast(message, icon = '🏆') {
        toastQueue.push({ message, icon });
        if (toastTimer <= 0) {
            showNextToast();
        }
    }

    function showNextToast() {
        if (toastQueue.length === 0) return;
        toastCurrent = toastQueue.shift();

        const toastEl = document.getElementById('slingshotToast');
        const iconEl = document.getElementById('slingshotToastIcon');
        const textEl = document.getElementById('slingshotToastText');

        if (toastEl && iconEl && textEl) {
            iconEl.textContent = toastCurrent.icon;
            textEl.textContent = toastCurrent.message;
            toastEl.style.transform = 'translateX(-50%) translateY(0)';
            toastEl.style.opacity = '1';
            GameAudio.playAchievement();

            setTimeout(() => {
                toastEl.style.transform = 'translateX(-50%) translateY(-100%)';
                toastEl.style.opacity = '0';

                setTimeout(() => {
                    toastCurrent = null;
                    if (toastQueue.length > 0) showNextToast();
                }, 300); // 等待动画结束
            }, 3000);
        }
    }

    // ===== 交互 =====
    function checkAchievements(isWin = false) {
        // --- 1. 检查成就 ---
        ACHIEVEMENTS.forEach(ach => {
            if (unlockedAchievements.includes(ach.id)) return;

            let unlocked = false;
            switch (ach.id) {
                case 'firstLaunch':
                    if (totalLaunches >= 1) unlocked = true;
                    break;
                case 'bullseye':
                    if (isWin && currentLevel > 0 && shots === 1) unlocked = true;
                    break;
                case 'neverGiveUp':
                    if (isWin && consecutiveFails >= 3) unlocked = true;
                    break;
                case 'starExplorer':
                    let allStars = 0;
                    for (let i = 0; i < levels.length; i++) {
                        const s = bestShots[i];
                        if (s) {
                            const par = levels[i].par;
                            allStars += (s <= par ? 3 : s <= par + 1 ? 2 : 1);
                        }
                    }
                    if (allStars >= 15) unlocked = true;
                    break;
                case 'blackHoleSurvivor':
                    if (isWin && currentLevel === 9) unlocked = true;
                    break;
                case 'gravityMaster':
                    if (isWin && currentLevel === 11) {
                        let completedAll = true;
                        for (let i = 0; i < 12; i++) {
                            if (!bestShots[i]) completedAll = false;
                        }
                        if (completedAll) unlocked = true;
                    }
                    break;
                case 'perfectionist':
                    if (isWin) {
                        let fullStars = true;
                        for (let i = 0; i < 12; i++) {
                            const s = bestShots[i];
                            if (!s || s > levels[i].par) {
                                fullStars = false;
                                break;
                            }
                        }
                        if (fullStars) unlocked = true;
                    }
                    break;
            }

            if (unlocked) {
                unlockedAchievements.push(ach.id);
                showToast(GameI18N.t('slingshot.unlockedAchievement') + ': ' + GameI18N.t(ach.i18nKey), '🏆');
            }
        });

        // --- 2. 检查皮肤 ---
        Object.keys(SKINS).forEach(type => {
            SKINS[type].forEach(skin => {
                if (unlockedSkins.includes(skin.id)) return;

                let unlocked = false;
                switch (skin.id) {
                    case 'comet':
                        if (totalLaunches >= 25) unlocked = true;
                        break;
                    case 'pulsar':
                        let starsPulsar = 0;
                        for (let i = 0; i < levels.length; i++) {
                            const s = bestShots[i];
                            if (s) starsPulsar += (s <= levels[i].par ? 3 : s <= levels[i].par + 1 ? 2 : 1);
                        }
                        if (starsPulsar >= 15) unlocked = true;
                        break;
                    case 'meteor':
                        if (isWin && shots > 5) unlocked = true;
                        break;
                    case 'darkMatter':
                        if (isWin && currentLevel === 9) unlocked = true;
                        break;
                    case 'galaxy':
                        if (isWin && unlockedAchievements.includes('perfectionist')) unlocked = true;
                        break;

                    case 'spaceRift':
                        if (totalWins >= 20) unlocked = true;
                        break;
                    case 'quantumTunnel':
                        if (isWin && currentLevel > 0 && shots === 1) unlocked = true;
                        break;
                    case 'whiteHole':
                        if (unlockedAchievements.length >= 3) unlocked = true;
                        break;

                    case 'iceAge':
                        if (totalLaunches >= 50) unlocked = true;
                        break;
                    case 'lavaWorld':
                        if (isWin && currentLevel === 11) unlocked = true;
                        break;
                    case 'cyberNeon':
                        let allBallSkins = true;
                        SKINS.ball.forEach(bs => {
                            if (bs.id !== 'default' && !unlockedSkins.includes(bs.id)) allBallSkins = false;
                        });
                        if (allBallSkins) unlocked = true;
                        break;
                    case 'ringedPlanet':
                        let starsRinged = 0;
                        for (let i = 0; i < levels.length; i++) {
                            const s = bestShots[i];
                            if (s) starsRinged += (s <= levels[i].par ? 3 : s <= levels[i].par + 1 ? 2 : 1);
                        }
                        if (starsRinged >= 30) unlocked = true;
                        break;
                }

                if (unlocked) {
                    unlockedSkins.push(skin.id);
                    showToast(GameI18N.t('slingshot.unlockedSkin') + ': ' + GameI18N.t(skin.i18nKey), '🎨');
                }
            });
        });

        saveProgress();
    }

    // ===== 交互 =====
    function onPointerDown(e) {
        if (!running || levelComplete || ballActive) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 检查是否点击在发射器附近
        const dx = x - launcher.x;
        const dy = y - launcher.y;
        if (Math.sqrt(dx * dx + dy * dy) < 50) {
            isDragging = true;
            dragStart.x = launcher.x;
            dragStart.y = launcher.y;
            dragEnd.x = x;
            dragEnd.y = y;
            canvas.setPointerCapture(e.pointerId);
        }
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        dragEnd.x = e.clientX - rect.left;
        dragEnd.y = e.clientY - rect.top;
        // 更新预测轨迹
        updatePrediction();
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;

        // 计算发射速度（拖拽方向的反方向）
        const dx = dragStart.x - dragEnd.x;
        const dy = dragStart.y - dragEnd.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 15) {
            prediction = [];
            return; // 拖拽太短，不发射
        }

        const speed = Math.min(dist * 3, MAX_SPEED);
        const angle = Math.atan2(dy, dx);

        launchBall(
            launcher.x,
            launcher.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
    }

    function launchBall(x, y, vx, vy) {
        ball = { x, y, vx, vy };
        ballTrail = [];
        ballActive = true;
        shots++;
        totalLaunches++;
        saveProgress();
        prediction = [];
        updateUI();
        GameAudio.playLaunch();
        checkAchievements();
    }

    // ===== 物理模拟 =====
    function updateBall(dt) {
        if (!ball || !ballActive) return;

        // 引力加速度
        planets.forEach(p => {
            const dx = p.x - ball.x;
            const dy = p.y - ball.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);
            const minDist = p.r + 5; // 防止除零
            const safeDist = Math.max(dist, minDist);

            // F = G * M / r²
            const force = G * p.mass / (safeDist * safeDist);
            const ax = (dx / safeDist) * force;
            const ay = (dy / safeDist) * force;

            ball.vx += ax * dt;
            ball.vy += ay * dt;
        });

        // 限速
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > MAX_SPEED) {
            ball.vx = (ball.vx / speed) * MAX_SPEED;
            ball.vy = (ball.vy / speed) * MAX_SPEED;
        }

        // 更新位置
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // 轨迹
        ballTrail.push({ x: ball.x, y: ball.y });
        if (ballTrail.length > TRAIL_LENGTH) ballTrail.shift();

        // 碰撞检测 - 行星
        for (const p of planets) {
            const dx = ball.x - p.x;
            const dy = ball.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.r) {
                onBallCollision(p);
                return;
            }
        }

        // 碰撞检测 - 虫洞
        if (wormhole) {
            const dx = ball.x - wormhole.x;
            const dy = ball.y - wormhole.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < wormhole.r + 10) {
                onBallHitWormhole();
                return;
            }
        }

        // 出界检测
        if (ball.x < -50 || ball.x > W + 50 || ball.y < -50 || ball.y > H + 50) {
            onBallOutOfBounds();
        }
    }

    function onBallCollision(planet) {
        ballActive = false;
        consecutiveFails++;
        GameAudio.playCollision();
        spawnParticles(ball.x, ball.y, planet.color, 20);
        feedbackText = GameI18N.t('slingshot.fail');
        feedbackColor = '#EF4444';
        feedbackTimer = 50;
        ball = null;
    }

    function onBallHitWormhole() {
        ballActive = false;
        levelComplete = true;
        totalWins++;
        GameAudio.playHitWormhole();
        spawnParticles(wormhole.x, wormhole.y, '#A78BFA', 40);

        const level = levels[currentLevel];
        const stars = shots <= level.par ? 3 : shots <= level.par + 1 ? 2 : 1;
        const starsText = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

        totalShots += shots;
        totalStars += stars;
        saveProgress();

        if (elStars) elStars.textContent = starsText;

        const winTitle = elWinOverlay ? elWinOverlay.querySelector('h2') : null;
        const nextBtn = document.getElementById('slingshotNextBtn');

        if (currentLevel === levels.length - 1) {
            if (winTitle) winTitle.textContent = GameI18N.t('slingshot.congrats');
            if (nextBtn) {
                nextBtn.textContent = GameI18N.t('slingshot.playAgain');
                nextBtn.classList.remove('btn-primary');
                nextBtn.classList.add('btn-outline');
            }
        } else {
            if (winTitle) winTitle.textContent = GameI18N.t('slingshot.win');
            if (nextBtn) {
                nextBtn.textContent = GameI18N.t('slingshot.next');
                nextBtn.classList.remove('btn-outline');
                nextBtn.classList.add('btn-primary');
            }
        }

        if (elWinOverlay) elWinOverlay.style.display = 'flex';

        GameAudio.playStarRating(stars);

        const key = `slingshot_best_${currentLevel}`;
        const prev = bestShots[currentLevel];
        if (!prev || shots < prev) {
            bestShots[currentLevel] = shots;
            localStorage.setItem(key, shots.toString());
        }

        checkAchievements(true);
        consecutiveFails = 0; // 成功后重置失败次数
        updateUI();
    }

    function onBallOutOfBounds() {
        ballActive = false;
        consecutiveFails++;
        feedbackText = GameI18N.t('slingshot.fail');
        feedbackColor = '#EF4444';
        feedbackTimer = 50;
        ball = null;
    }

    // ===== 弹道预测 =====
    function updatePrediction() {
        if (!isDragging) { prediction = []; return; }

        const dx = dragStart.x - dragEnd.x;
        const dy = dragStart.y - dragEnd.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) { prediction = []; return; }

        const speed = Math.min(dist * 3, MAX_SPEED);
        const angle = Math.atan2(dy, dx);

        let px = launcher.x, py = launcher.y;
        let pvx = Math.cos(angle) * speed;
        let pvy = Math.sin(angle) * speed;

        prediction = [{ x: px, y: py }];

        for (let i = 0; i < PREDICTION_STEPS; i++) {
            // 引力
            planets.forEach(p => {
                const ddx = p.x - px;
                const ddy = p.y - py;
                const distSq = ddx * ddx + ddy * ddy;
                const dist = Math.sqrt(distSq);
                const safeDist = Math.max(dist, p.r + 5);
                const force = G * p.mass / (safeDist * safeDist);
                pvx += (ddx / safeDist) * force * PREDICTION_DT;
                pvy += (ddy / safeDist) * force * PREDICTION_DT;
            });

            const speedNow = Math.sqrt(pvx * pvx + pvy * pvy);
            if (speedNow > MAX_SPEED) {
                pvx = (pvx / speedNow) * MAX_SPEED;
                pvy = (pvy / speedNow) * MAX_SPEED;
            }

            px += pvx * PREDICTION_DT;
            py += pvy * PREDICTION_DT;

            // 碰撞检测
            let hit = false;
            for (const p of planets) {
                const ddx = px - p.x;
                const ddy = py - p.y;
                if (Math.sqrt(ddx * ddx + ddy * ddy) < p.r) { hit = true; break; }
            }
            if (hit) break;

            if (wormhole) {
                const ddx = px - wormhole.x;
                const ddy = py - wormhole.y;
                if (Math.sqrt(ddx * ddx + ddy * ddy) < wormhole.r + 10) {
                    prediction.push({ x: px, y: py });
                    break;
                }
            }

            if (px < -50 || px > W + 50 || py < -50 || py > H + 50) break;

            prediction.push({ x: px, y: py });
        }
    }

    // ===== 粒子 =====
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * TAU;
            const s = 1 + Math.random() * 5;
            particles.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: 1,
                decay: 0.008 + Math.random() * 0.015,
                size: 2 + Math.random() * 5,
                color
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.03;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    // ===== 知识提示 =====
    function showKnowledgeTip(tipKey) {
        if (!elKnowledgeTip || !elKnowledgeText) return;
        const tip = GameI18N.t(tipKey);
        elKnowledgeText.textContent = tip;
        elKnowledgeTip.classList.add('visible');
        clearTimeout(tipTimer);
        tipTimer = setTimeout(() => {
            if (elKnowledgeTip) elKnowledgeTip.classList.remove('visible');
        }, 5000);
    }

    // ===== UI =====
    function updateUI() {
        if (elLevel) elLevel.textContent = currentLevel + 1;
        if (elShots) elShots.textContent = shots;
        const best = bestShots[currentLevel] || localStorage.getItem(`slingshot_best_${currentLevel}`);
        if (elBest) elBest.textContent = best || '-';
    }

    // ===== 渲染 =====
    function gameLoop() {
        if (!active || !canvas) return;
        update();
        draw();

        const skinDetail = document.getElementById('slingshotSkinDetailOverlay');
        if (skinDetail && skinDetail.style.display === 'flex') {
            drawSkinPreviewInLoop();
        }

        animId = requestAnimationFrame(gameLoop);
    }

    function update() {
        if (ballActive) {
            // 使用固定时间步长，避免帧率影响
            updateBall(PREDICTION_DT);
        }
        if (wormhole) wormhole.angle += 0.03;
        updateParticles();
        if (feedbackTimer > 0) feedbackTimer--;
        // 星星闪烁
        stars.forEach(s => s.twinkle += 0.02);
    }

    function draw() {
        if (!ctx) return;

        // 清屏 - 太空背景
        ctx.fillStyle = '#050A18';
        ctx.fillRect(0, 0, W, H);

        // 星空
        drawStars();

        // 行星引力场
        drawGravityFields();

        // 预测轨迹
        drawPrediction();

        // 行星
        drawPlanets();

        // 虫洞
        drawWormhole();

        // 发射器
        drawLauncher();

        // 能量球轨迹
        drawBallTrail();

        // 能量球
        drawBall();

        // 粒子
        drawParticles();

        // 反馈文字
        drawFeedback();

        // 拖拽力度指示
        if (isDragging) drawDragIndicator();
    }

    function drawStars() {
        stars.forEach(s => {
            const alpha = s.alpha + Math.sin(s.twinkle) * 0.15;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, TAU);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`;
            ctx.fill();
        });

        // 绘制全局皮肤特效
        const skin = equippedSkins.planet;
        if (skin === 'iceAge' || skin === 'lavaWorld' || skin === 'cyberNeon') {
            globalParticles.forEach(p => {
                // Update particle positions
                if (skin === 'iceAge') {
                    p.y += p.speedY * 0.5;
                    p.x += Math.sin(Date.now() / 1000 + p.offset) * 0.5;
                    if (p.y > H + 10) p.y = -10;
                } else if (skin === 'lavaWorld') {
                    p.y -= p.speedY;
                    p.x += p.speedX;
                    if (p.y < -10) {
                        p.y = H + 10;
                        p.x = Math.random() * W;
                    }
                } else if (skin === 'cyberNeon') {
                    p.y += p.speedY * 3;
                    if (p.y > H + 10) {
                        p.y = -10;
                        p.x = Math.random() * W;
                    }
                }

                // Draw particle
                ctx.beginPath();
                if (skin === 'iceAge') {
                    ctx.arc(p.x, p.y, p.size, 0, TAU);
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.4})`;
                    ctx.fill();
                } else if (skin === 'lavaWorld') {
                    ctx.arc(p.x, p.y, p.size * 1.5, 0, TAU);
                    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(249, 115, 22, 0.8)' : 'rgba(239, 68, 68, 0.6)'; // Orange/Red
                    ctx.fill();
                } else if (skin === 'cyberNeon') {
                    ctx.rect(p.x, p.y, 2, p.size * 8); // Data rain
                    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(6, 182, 212, 0.6)' : 'rgba(244, 114, 182, 0.6)'; // Cyan/Pink
                    ctx.fill();
                }
            });

            // 赛博霓虹：偶尔画飞船光轨
            if (skin === 'cyberNeon' && Math.random() < 0.02) {
                const startY = Math.random() * H;
                ctx.beginPath();
                ctx.moveTo(-50, startY);
                ctx.lineTo(W + 50, startY - 100 + Math.random() * 200);
                const grad = ctx.createLinearGradient(-50, startY, W + 50, startY);
                grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
                grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.8)');
                grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
                ctx.strokeStyle = grad;
                ctx.lineWidth = Math.random() * 3 + 1;
                ctx.stroke();
            }
        }
    }

    function drawGravityFields() {
        planets.forEach(p => {
            const grad = ctx.createRadialGradient(p.x, p.y, p.r, p.x, p.y, p.r * 2.5);
            grad.addColorStop(0, `rgba(37, 99, 235, 0.08)`);
            grad.addColorStop(1, 'rgba(37, 99, 235, 0)');
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 2.5, 0, TAU);
            ctx.fillStyle = grad;
            ctx.fill();
        });
    }

    function drawPlanets() {
        planets.forEach(p => {
            if (p.solid) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, TAU);
                ctx.fillStyle = p.color;
                ctx.fill();
                return;
            }

            const skin = equippedSkins.planet || 'default';
            let baseColor = p.color;
            let edgeColor = `rgba(255, 255, 255, 0.15)`;

            if (skin === 'iceAge') {
                // Keep base color but make it lighter/cooler
                baseColor = blendColors(p.color, '#E0F2FE', 0.6);
                edgeColor = 'rgba(255, 255, 255, 0.6)';
            } else if (skin === 'lavaWorld') {
                // 熔岩世界基础色：暗色岩石地表
                baseColor = blendColors(p.color, '#1C1917', 0.8);
                edgeColor = '#EA580C';
            } else if (skin === 'cyberNeon') {
                baseColor = '#000000';
                edgeColor = blendColors(p.color, '#F472B6', 0.7); // Pinkish base edge
            }

            // 行星本体（径向渐变模拟球体）
            const grad = ctx.createRadialGradient(
                p.x - p.r * 0.3, p.y - p.r * 0.3, 0,
                p.x, p.y, p.r
            );

            if (skin === 'cyberNeon') {
                grad.addColorStop(0, '#1E293B');
                grad.addColorStop(1, '#000000');
            } else {
                grad.addColorStop(0, lightenColor(baseColor, 30));
                grad.addColorStop(0.7, baseColor);
                grad.addColorStop(1, darkenColor(baseColor, 40));
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.fillStyle = grad;
            ctx.fill();

            // 行星边缘光或特殊纹理
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.strokeStyle = edgeColor;
            ctx.lineWidth = skin === 'cyberNeon' ? 2 : 1;
            ctx.stroke();

            // 特殊皮肤的内部细节
            if (skin === 'iceAge') {
                // 绘制随机冰裂纹
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.beginPath();
                // 使用星球坐标作为随机数种子，保证裂纹稳定
                const seed = p.x + p.y;
                for (let i = 0; i < 3; i++) {
                    let cx = (Math.sin(seed + i * 10) * 0.5) * p.r;
                    let cy = (Math.cos(seed + i * 20) * 0.5) * p.r;
                    ctx.moveTo(cx, cy);
                    for (let j = 0; j < 3; j++) {
                        cx += (Math.sin(seed + i * j * 15) * 0.4) * p.r;
                        cy += (Math.cos(seed + i * j * 25) * 0.4) * p.r;
                        // 确保裂纹不出界
                        if (cx * cx + cy * cy < p.r * p.r * 0.9) {
                            ctx.lineTo(cx, cy);
                        }
                    }
                }
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            } else if (skin === 'lavaWorld') {
                // 熔岩世界重做：发光裂纹和火山口
                ctx.save();
                ctx.translate(p.x, p.y);

                // 使用剪切路径确保内容不画出星球范围
                ctx.beginPath();
                ctx.arc(0, 0, p.r, 0, TAU);
                ctx.clip();

                let currentSeed = p.x + p.y;
                function nextRand() {
                    let x = Math.sin(currentSeed++) * 10000;
                    return x - Math.floor(x);
                }

                const time = Date.now() / 1000;
                const pulse = (Math.sin(time * 2) + 1) / 2; // 0 到 1 的脉动

                // 发光配置
                ctx.shadowColor = '#EA580C';
                ctx.shadowBlur = 8 + pulse * 6; // 随时间呼吸的辉光

                // 1. 绘制岩浆裂缝 (贯穿星球的锯齿连线)
                const numCracks = 3 + Math.floor(nextRand() * 3); // 3 到 5 条裂缝
                for (let i = 0; i < numCracks; i++) {
                    ctx.beginPath();
                    let angle = nextRand() * TAU; // 裂缝主方向
                    let steps = 6 + Math.floor(nextRand() * 6); // 6 到 11 个节点

                    for (let j = 0; j < steps; j++) {
                        // 从星球一端贯穿到另一端
                        let dist = p.r - (p.r * 2 * (j / (steps - 1)));
                        // 垂直于主方向的随机偏移，制造锯齿感
                        let deviation = (nextRand() - 0.5) * p.r * 0.6;

                        let cx = Math.cos(angle) * dist - Math.sin(angle) * deviation;
                        let cy = Math.sin(angle) * dist + Math.cos(angle) * deviation;

                        if (j === 0) ctx.moveTo(cx, cy);
                        else ctx.lineTo(cx, cy);
                    }

                    // 裂缝外围岩浆色
                    ctx.lineWidth = 2 + nextRand() * 2;
                    ctx.strokeStyle = '#EA580C'; // 亮橙色
                    ctx.stroke();

                    // 裂缝中心高温色
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#FEF08A'; // 偏黄白
                    ctx.stroke();
                }

                // 2. 绘制暗色地貌斑块 (陨石坑/暗礁)，替代原来的“蛋”
                const numCraters = 3 + Math.floor(nextRand() * 4);
                for (let i = 0; i < numCraters; i++) {
                    let dist = nextRand() * p.r * 0.7;
                    let angle = nextRand() * TAU;
                    let cx = Math.cos(angle) * dist;
                    let cy = Math.sin(angle) * dist;
                    let cr = p.r * (0.1 + nextRand() * 0.2);

                    ctx.beginPath();
                    let sides = 5 + Math.floor(nextRand() * 3); // 5-7边形，使其看起来像破碎的岩石块
                    for (let j = 0; j < sides; j++) {
                        let a = j * (TAU / sides);
                        let r = cr * (0.8 + nextRand() * 0.4);
                        let px = cx + Math.cos(a) * r;
                        let py = cy + Math.sin(a) * r;
                        if (j === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();

                    ctx.fillStyle = 'rgba(10, 5, 5, 0.6)'; // 半透明深色，增加地表层次
                    ctx.fill();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(234, 88, 12, 0.3)'; // 边缘微弱的岩浆红光
                    ctx.stroke();
                }

                // 3. 添加边缘大气辉光 (模拟球体被内部岩浆照亮的效果)
                ctx.shadowBlur = 0;
                const atmosphereGrad = ctx.createRadialGradient(0, 0, p.r * 0.6, 0, 0, p.r);
                atmosphereGrad.addColorStop(0, 'rgba(234, 88, 12, 0)');
                atmosphereGrad.addColorStop(1, 'rgba(234, 88, 12, 0.4)');
                ctx.fillStyle = atmosphereGrad;
                ctx.beginPath();
                ctx.arc(0, 0, p.r, 0, TAU);
                ctx.fill();

                ctx.restore();
            } else if (skin === 'cyberNeon') {
                // 重新设计赛博霓虹星球样式
                ctx.save();
                ctx.translate(p.x, p.y);

                // 1. 基础发光底盘 (Hexagon)
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3 + Date.now() / 3000 * (p.mass % 2 === 0 ? 1 : -1);
                    const px = Math.cos(angle) * p.r * 0.8;
                    const py = Math.sin(angle) * p.r * 0.8;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = blendColors(p.color, '#0F172A', 0.8);
                ctx.fill();
                ctx.strokeStyle = blendColors(p.color, '#06B6D4', 0.8); // Cyan tint
                ctx.lineWidth = 2;
                ctx.stroke();

                // 2. 旋转的刻度环 (Outer Tech Ring)
                ctx.rotate(Date.now() / 1500 * (p.mass % 2 === 0 ? -1 : 1));
                ctx.beginPath();
                ctx.arc(0, 0, p.r * 0.95, 0, Math.PI * 1.5); // Broken ring
                ctx.strokeStyle = blendColors(p.color, '#F472B6', 0.8); // Pink tint
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 15, 30, 10]);
                ctx.stroke();
                ctx.setLineDash([]);

                // 3. 内部十字瞄准线 (Crosshair)
                ctx.beginPath();
                ctx.moveTo(-p.r * 0.4, 0); ctx.lineTo(p.r * 0.4, 0);
                ctx.moveTo(0, -p.r * 0.4); ctx.lineTo(0, p.r * 0.4);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // 4. 中心能量核 (Glowing Core)
                ctx.beginPath();
                ctx.arc(0, 0, p.r * 0.25, 0, TAU);
                ctx.fillStyle = blendColors(p.color, '#38BDF8', 0.6); // Light blue tint
                ctx.shadowColor = blendColors(p.color, '#38BDF8', 0.6);
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.restore();
            }

            // 如果是光环星，画一个光环
            if (skin === 'ringedPlanet') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(Math.PI / 6); // 倾斜30度
                ctx.beginPath();
                ctx.ellipse(0, 0, p.r * 1.8, p.r * 0.5, 0, 0, TAU);
                ctx.strokeStyle = lightenColor(p.color, 40);
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                ctx.stroke();
                // 外侧淡光环
                ctx.beginPath();
                ctx.ellipse(0, 0, p.r * 2.2, p.r * 0.7, 0, 0, TAU);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.3;
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    function drawWormhole() {
        if (!wormhole) return;
        const { x, y, r, angle } = wormhole;
        const skin = equippedSkins.wormhole || 'default';

        if (skin === 'spaceRift') {
            // 时空裂隙 (锯齿闪电)
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-angle * 1.5);
            for (let i = 0; i < 3; i++) {
                const ringR = r + 5 + i * 10;
                ctx.beginPath();
                for (let j = 0; j <= 20; j++) {
                    const a = (j / 20) * TAU;
                    const rad = ringR + (Math.random() - 0.5) * 8; // 随机波动
                    const px = Math.cos(a) * rad;
                    const py = Math.sin(a) * rad;
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 - i * 0.2})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.restore();

            const grad = ctx.createRadialGradient(x, y, 0, x, y, r + 5);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.3, 'rgba(100, 116, 139, 0.8)');
            grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
            ctx.beginPath();
            ctx.arc(x, y, r + 5, 0, TAU);
            ctx.fillStyle = grad;
            ctx.fill();
        }
        else if (skin === 'quantumTunnel') {
            // 量子隧道 (网格/波纹)
            for (let i = 0; i < 4; i++) {
                const ringR = r + 8 + i * 8;
                const startAngle = angle * 2 + i * 0.5;
                ctx.beginPath();
                ctx.arc(x, y, ringR, startAngle, startAngle + PI * 1.5);
                ctx.strokeStyle = `rgba(20, 184, 166, ${0.7 - i * 0.15})`; // Teal
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r + 5);
            grad.addColorStop(0, 'rgba(20, 184, 166, 0.9)');
            grad.addColorStop(0.6, 'rgba(13, 148, 136, 0.4)');
            grad.addColorStop(1, 'rgba(15, 118, 110, 0)');
            ctx.beginPath();
            ctx.arc(x, y, r + 5, 0, TAU);
            ctx.fillStyle = grad;
            ctx.fill();
        }
        else if (skin === 'whiteHole') {
            // 白洞 (极亮白核，金光晕)
            ctx.shadowColor = '#FBBF24';
            ctx.shadowBlur = 20;

            for (let i = 0; i < 3; i++) {
                const ringR = r + 10 + i * 10;
                const startAngle = -angle + i * 0.5;
                ctx.beginPath();
                ctx.arc(x, y, ringR, startAngle, startAngle + PI * 1.8);
                ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 - i * 0.1})`; // Amber
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, r + 10);
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.8)');
            grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.beginPath();
            ctx.arc(x, y, r + 10, 0, TAU);
            ctx.fillStyle = grad;
            ctx.fill();
        }
        else {
            // 默认 (紫色多层旋转)
            for (let i = 0; i < 3; i++) {
                const ringR = r + 8 + i * 8;
                const startAngle = angle + i * 0.5;
                ctx.beginPath();
                ctx.arc(x, y, ringR, startAngle, startAngle + PI * 1.2);
                ctx.strokeStyle = `rgba(167, 139, 250, ${0.6 - i * 0.15})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            const grad = ctx.createRadialGradient(x, y, 0, x, y, r + 5);
            grad.addColorStop(0, 'rgba(167, 139, 250, 0.8)');
            grad.addColorStop(0.5, 'rgba(124, 58, 237, 0.4)');
            grad.addColorStop(1, 'rgba(124, 58, 237, 0)');
            ctx.beginPath();
            ctx.arc(x, y, r + 5, 0, TAU);
            ctx.fillStyle = grad;
            ctx.fill();

            // 中心点
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, TAU);
            ctx.fillStyle = '#E0E7FF';
            ctx.fill();
        }
    }

    function drawLauncher() {
        const { x, y } = launcher;

        // 发射器底座
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, TAU);
        ctx.fillStyle = '#334155';
        ctx.fill();
        ctx.strokeStyle = '#60A5FA';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 内圈
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, TAU);
        ctx.fillStyle = '#60A5FA';
        ctx.fill();

        // 提示文字（未拖拽时）
        if (!isDragging && !ballActive && !levelComplete) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(GameI18N.t('slingshot.launch'), x, y + 30);
        }
    }

    function drawDragIndicator() {
        const dx = dragStart.x - dragEnd.x;
        const dy = dragStart.y - dragEnd.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) return;

        // 拖拽线（从发射器到鼠标）
        ctx.beginPath();
        ctx.moveTo(launcher.x, launcher.y);
        ctx.lineTo(dragEnd.x, dragEnd.y);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 力度指示（发射方向）
        const speed = Math.min(dist * 3, MAX_SPEED);
        const power = speed / MAX_SPEED;
        const angle = Math.atan2(dy, dx);
        const indicatorLen = 30 + power * 40;

        ctx.beginPath();
        ctx.moveTo(launcher.x, launcher.y);
        ctx.lineTo(
            launcher.x + Math.cos(angle) * indicatorLen,
            launcher.y + Math.sin(angle) * indicatorLen
        );
        ctx.strokeStyle = power > 0.8 ? '#EF4444' : power > 0.5 ? '#F59E0B' : '#22C55E';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 箭头
        const arrowX = launcher.x + Math.cos(angle) * indicatorLen;
        const arrowY = launcher.y + Math.sin(angle) * indicatorLen;
        ctx.beginPath();
        ctx.arc(arrowX, arrowY, 4, 0, TAU);
        ctx.fillStyle = power > 0.8 ? '#EF4444' : power > 0.5 ? '#F59E0B' : '#22C55E';
        ctx.fill();
    }

    function drawPrediction() {
        if (prediction.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(prediction[0].x, prediction[0].y);
        for (let i = 1; i < prediction.length; i++) {
            ctx.lineTo(prediction[i].x, prediction[i].y);
        }
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawBallTrail() {
        if (ballTrail.length < 2) return;
        const skin = equippedSkins.ball || 'default';
        for (let i = 1; i < ballTrail.length; i++) {
            const alpha = i / ballTrail.length * 0.6;
            const size = (i / ballTrail.length) * 3;
            ctx.beginPath();
            ctx.arc(ballTrail[i].x, ballTrail[i].y, size, 0, TAU);

            if (skin === 'comet') ctx.fillStyle = `rgba(186, 230, 253, ${alpha})`;
            else if (skin === 'pulsar') ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
            else if (skin === 'meteor') ctx.fillStyle = `rgba(249, 115, 22, ${alpha})`;
            else if (skin === 'darkMatter') ctx.fillStyle = `rgba(30, 58, 138, ${alpha})`;
            else if (skin === 'galaxy') {
                const hue = (Date.now() / 10 + i * 5) % 360;
                ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
            }
            else ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`; // default

            ctx.fill();
        }
    }

    function drawBall() {
        if (!ball) return;
        const skin = equippedSkins.ball || 'default';

        let color = '#22C55E';
        let glowColor1 = 'rgba(34, 197, 94, 0.4)';
        let glowColor2 = 'rgba(34, 197, 94, 0)';

        if (skin === 'comet') {
            color = '#7DD3FC';
            glowColor1 = 'rgba(125, 211, 252, 0.5)';
            glowColor2 = 'rgba(125, 211, 252, 0)';
        } else if (skin === 'pulsar') {
            const blink = Math.sin(Date.now() / 100) * 0.5 + 0.5;
            color = `rgba(168, 85, 247, ${0.5 + blink * 0.5})`;
            glowColor1 = `rgba(168, 85, 247, ${0.4 + blink * 0.2})`;
            glowColor2 = 'rgba(168, 85, 247, 0)';
        } else if (skin === 'meteor') {
            color = '#F97316';
            glowColor1 = 'rgba(249, 115, 22, 0.5)';
            glowColor2 = 'rgba(249, 115, 22, 0)';
        } else if (skin === 'darkMatter') {
            color = '#000000';
            glowColor1 = 'rgba(107, 33, 168, 0.8)';
            glowColor2 = 'rgba(30, 58, 138, 0)';
        } else if (skin === 'galaxy') {
            const hue = (Date.now() / 20) % 360;
            color = `hsl(${hue}, 100%, 60%)`;
            glowColor1 = `hsla(${hue}, 100%, 60%, 0.5)`;
            glowColor2 = `hsla(${hue}, 100%, 60%, 0)`;
        }

        // 光晕
        const grad = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 15);
        grad.addColorStop(0, glowColor1);
        grad.addColorStop(1, glowColor2);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 15, 0, TAU);
        ctx.fillStyle = grad;
        ctx.fill();

        // 能量球
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 6, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();

        // 高光 (暗物质不显示高光)
        if (skin !== 'darkMatter') {
            ctx.beginPath();
            ctx.arc(ball.x - 2, ball.y - 2, 2, 0, TAU);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
        }
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }

    function drawFeedback() {
        if (feedbackTimer <= 0 || !feedbackText) return;
        const alpha = Math.min(1, feedbackTimer / 25);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = feedbackColor;
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(feedbackText, W / 2, 50);
        ctx.restore();
    }

    // ===== 颜色工具 =====
    function lightenColor(hex, amount) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
    }

    function darkenColor(hex, amount) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
    }

    function blendColors(color1, color2, percentage) {
        if (!color1 || !color2) return color1 || color2 || '#FFFFFF';

        // Ensure colors are hex format
        const parseHex = (c) => {
            if (c.startsWith('#')) {
                if (c.length === 4) { // #RGB
                    return parseInt(c[1] + c[1] + c[2] + c[2] + c[3] + c[3], 16);
                }
                return parseInt(c.slice(1), 16);
            }
            return 0x888888;
        };

        const c1 = parseHex(color1);
        const c2 = parseHex(color2);

        const r1 = c1 >> 16;
        const g1 = (c1 >> 8) & 0x00FF;
        const b1 = c1 & 0x0000FF;

        const r2 = c2 >> 16;
        const g2 = (c2 >> 8) & 0x00FF;
        const b2 = c2 & 0x0000FF;

        const r = Math.round(r1 + (r2 - r1) * percentage);
        const g = Math.round(g1 + (g2 - g1) * percentage);
        const b = Math.round(b1 + (b2 - b1) * percentage);

        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
    }

    return { show, hide };
})();
