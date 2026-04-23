/**
 * chord-breaker.js - 弦之裂变游戏（Chord Breaker）
 * 核心玩法：发射能量球在圆内弹射，击中弦上的节点消除弦段
 */
const ChordBreaker = (() => {
    'use strict';

    const PI = Math.PI;
    const TAU = PI * 2;
    const BALL_SPEED = 5;
    const PREDICTION_STEPS = 200;
    const NODE_RADIUS = 10;
    const HIT_TOLERANCE = 14;
    const SHOT_COOLDOWN_MS = 1000;

    let canvas, ctx, W, H;
    let active = false;
    let animId = null;

    // 关卡
    let currentLevel = 0;
    let shots = 0;
    let remainingNodes = 0;
    let levelStars = [];

    // 圆
    let cx, cy, R;

    // 弦和节点
    let chords = [];
    let nodes = [];

    // 球
    let balls = [];

    // 发射
    let launchStartAngle = 0;
    let launchAngle = 0;
    let isDragging = false;
    let dragPos = null;
    let prediction = [];
    let nextBallReady = true;
    let nextBallReadyAt = 0;

    // 粒子
    let particles = [];

    // 反馈
    let feedbackText = '';
    let feedbackTimer = 0;
    let feedbackColor = '#22C55E';
    let levelComplete = false;

    // 知识提示
    let tipTimer = 0;

    // UI 交互与成就/皮肤相关变量
    let elLevelSelectOverlay;
    let currentSkinTab = 'skin'; // 'skin' | 'ball'
    let currentViewingSkin = null;
    let currentViewingSkinType = null;
    let toastQueue = [];
    let toastTimer = 0;
    let toastCurrent = null;

    // 背景装饰动画状态
    function createBgAnimState() {
        return {
            initialized: false,
            lastW: 0, lastH: 0,
            deepSpace: { stars: [], planets: [] },
            cherryBlossom: { petals: [] },
            ocean: { bubbles: [], largeFishes: [], crabs: [], jellyfishes: [], kelps: [], corals: [] },
            goldenAge: { sparks: [], beams: [] },
            cyberpunk: { buildings: [], cars: [] }
        };
    }

    let bgAnimState = createBgAnimState();
    let previewBgAnimState = createBgAnimState();

    // ===== 状态存储 =====
    let unlockedAchievements = [];
    let unlockedSkins = ['default'];
    let equippedSkins = { skin: 'default', ball: 'default' };
    let totalReflections = parseInt(localStorage.getItem('chord_total_reflections') || '0', 10);
    let consecutiveFails = 0; // 连续失败次数
    let chordBgmAudio = null;
    let chordBgmSkinId = '';

    function getChordBgmSrc(skinId) {
        const sid = skinId || 'default';
        const map = {
            default: '../assets/audio/game/chord-breaker/space.mp3',
            cherryBlossom: '../assets/audio/game/chord-breaker/cherry_blossom.mp3',
            deepOcean: '../assets/audio/game/chord-breaker/sea.mp3',
            goldenAge: '../assets/audio/game/chord-breaker/golden_age.mp3',
            cyberMatrix: '../assets/audio/game/chord-breaker/cyberpunk.mp3'
        };
        return map[sid] || map.default;
    }

    function getChordBgmVolume() {
        let v = 0.5;
        if (window.GameAudio && typeof window.GameAudio.getVolume === 'function') {
            const gv = Number(window.GameAudio.getVolume());
            if (Number.isFinite(gv)) v = gv;
        }
        v = Math.max(0, Math.min(1, v));
        return Math.max(0.2, v * 0.5);
    }

    function playChordBgm(skinId) {
        const sid = skinId || 'default';
        if (window.GameAudio && typeof window.GameAudio.playBgm === 'function') {
            window.GameAudio.playBgm('chord_' + sid);
            return;
        }

        if (window.GameAudio && typeof window.GameAudio.isBgmEnabled === 'function' && !window.GameAudio.isBgmEnabled()) {
            return;
        }

        const src = getChordBgmSrc(sid);

        if (!chordBgmAudio || chordBgmSkinId !== sid) {
            if (chordBgmAudio) {
                chordBgmAudio.pause();
            }
            chordBgmAudio = new Audio(src);
            chordBgmAudio.loop = true;
            chordBgmSkinId = sid;
        }

        chordBgmAudio.volume = getChordBgmVolume();
        const p = chordBgmAudio.play();
        if (p !== undefined) {
            p.catch((e) => console.warn('Chord BGM播放失败:', e));
        }
    }

    function stopChordBgm() {
        if (window.GameAudio && typeof window.GameAudio.stopBgm === 'function') {
            window.GameAudio.stopBgm();
        }
        if (!chordBgmAudio) return;
        chordBgmAudio.pause();
    }

    // 定义成就
    const ACHIEVEMENTS = [
        { id: 'novice', i18nKey: 'chord.achievement.novice' }, // 首次通关第 1 关
        { id: 'gettingTheHangOfIt', i18nKey: 'chord.achievement.gettingTheHangOfIt', total: 15 }, // 累计获得 15 颗星星
        { id: 'fiveStarChain', i18nKey: 'chord.achievement.fiveStarChain' }, // 只发射一次通关第十关
        { id: 'geometryMaster', i18nKey: 'chord.achievement.geometryMaster' }, // 成功通关最高难度（第 12 关）
        { id: 'perfectionist', i18nKey: 'chord.achievement.perfectionist' }, // 在所有 12 个关卡中全部获得 3 星评价
        { id: 'chordResonance', i18nKey: 'chord.achievement.chordResonance', total: 50 }, // 累计反射 50 次
        { id: 'neverGiveUp', i18nKey: 'chord.achievement.neverGiveUp' } // 在同一个关卡中发射 5 个球后通关
    ];

    // 定义皮肤
    const SKINS = {
        skin: [
            { id: 'default', i18nKey: 'chord.skin.default' }, // 经典霓虹
            { id: 'cherryBlossom', i18nKey: 'chord.skin.cherryBlossom', total: 15 }, // 累计15星
            { id: 'deepOcean', i18nKey: 'chord.skin.deepOcean' }, // 通关第8关
            { id: 'goldenAge', i18nKey: 'chord.skin.goldenAge' }, // 达成【完美主义】（12关全3星）
            { id: 'cyberMatrix', i18nKey: 'chord.skin.cyberMatrix', total: 50 } // 达成【弦音共振】（累计反射50次）
        ],
        ball: [
            { id: 'default', i18nKey: 'chord.skin.ball.default' }, // 纯白光球
            { id: 'fireball', i18nKey: 'chord.skin.ball.fireball', total: 20 }, // 炽热火球（累计20星）
            { id: 'frostCore', i18nKey: 'chord.skin.ball.frostCore' }, // 冰霜核心（达成初探弦界）
            { id: 'darkMatter', i18nKey: 'chord.skin.ball.darkMatter' }, // 暗影物质（达成百折不挠）
            { id: 'lightning', i18nKey: 'chord.skin.ball.lightning' } // 闪电穿梭（达成五星连珠）
        ]
    };

    // 皮肤的具体视觉配置（对应Step3，这里先声明）
    const SKIN_CONFIG = {
        default: {
            nodeOuter: '#00f3ff', nodeInner: '#ffffff', nodeGlow: '#00f3ff',
            beamGradientStart: '#00f3ff', beamGradientEnd: '#0088ff', beamGlow: '#00f3ff',
            particleColors: ['#00f3ff', '#ffffff', '#0088ff'],
            bgDark: '#0a0a1a',
            bgStops: [
                { stop: 0, color: '#0F172A' },
                { stop: 0.5, color: '#0B1120' },
                { stop: 1, color: '#070C15' },
            ]
        },
        cherryBlossom: {
            nodeOuter: '#ff9ebd', nodeInner: '#ffffff', nodeGlow: '#ff9ebd',
            beamGradientStart: '#ff9ebd', beamGradientEnd: '#e0b0ff', beamGlow: '#ff9ebd',
            particleColors: ['#ff9ebd', '#ffffff', '#e0b0ff'],
            bgDark: '#1a0a10'
        },
        deepOcean: {
            nodeOuter: '#0055ff', nodeInner: '#40e0d0', nodeGlow: '#0055ff',
            beamGradientStart: '#40e0d0', beamGradientEnd: '#0055ff', beamGlow: '#40e0d0',
            particleColors: ['#40e0d0', '#0055ff', '#ffffff'],
            bgDark: '#020b14',
            bgStops: [
                { stop: 0, color: 'rgba(6, 78, 112, 1)' },
                { stop: 0.5, color: 'rgba(10, 48, 82, 1)' },
                { stop: 1, color: 'rgba(5, 20, 40, 1)' },
            ]
        },
        goldenAge: {
            nodeOuter: '#ffd700', nodeInner: '#ffffff', nodeGlow: '#ffd700',
            beamGradientStart: '#ffd700', beamGradientEnd: '#ff8c00', beamGlow: '#ffd700',
            particleColors: ['#ffd700', '#ff8c00', '#ffffff'],
            bgDark: '#141000'
        },
        cyberMatrix: {
            nodeOuter: '#ff00ff', nodeInner: '#39ff14', nodeGlow: '#ff00ff',
            beamGradientStart: '#39ff14', beamGradientEnd: '#ff00ff', beamGlow: '#39ff14',
            particleColors: ['#ff00ff', '#39ff14', '#ffffff'],
            bgDark: '#051005',
            bgStops: [
                { stop: 0, color: 'rgba(40, 10, 50, 1)' },
                { stop: 0.5, color: 'rgba(20, 5, 35, 1)' },
                { stop: 1, color: 'rgba(8, 2, 15, 1)' },
            ]
        }
    };

    // DOM
    let elLevel, elShots, elNodes;
    let elStartOverlay, elWinOverlay, elStars, elFinalOverlay, elFinalStars, elFinalScore;
    let elKnowledgeTip, elKnowledgeText;

    // ===== 关卡数据 =====
    // chords: [{x1,y1,x2,y2}] — 归一化坐标 (-1 to 1)
    // nodes: [{chordIdx, t}] — t是弦上的参数位置 (0-1)
    const levels = [
        // Level 1: 单弦，1个节点（教学关）
        {
            chords: [{ x1: -0.6, y1: -0.2, x2: 0.6, y2: 0.2 }],
            nodes: [{ chordIdx: 0, t: 0.5 }],
            par: 2,
            tip: 'chord.knowledge.reflection'
        },
        // Level 2: 两根平行弦
        {
            chords: [
                { x1: -0.7, y1: -0.3, x2: 0.7, y2: -0.3 },
                { x1: -0.7, y1: 0.3, x2: 0.7, y2: 0.3 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.5 },
                { chordIdx: 1, t: 0.5 }
            ],
            par: 2,
            tip: 'chord.knowledge.reflection'
        },
        // Level 3: 交叉弦 — 交弦定理
        {
            chords: [
                { x1: -0.7, y1: -0.4, x2: 0.7, y2: 0.4 },
                { x1: -0.5, y1: 0.5, x2: 0.5, y2: -0.5 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.3 },
                { chordIdx: 0, t: 0.7 },
                { chordIdx: 1, t: 0.4 },
                { chordIdx: 1, t: 0.6 }
            ],
            par: 3,
            tip: 'chord.knowledge.chordTheorem'
        },
        // Level 4: 三弦放射状
        {
            chords: [
                { x1: -0.8, y1: 0, x2: 0.3, y2: -0.5 },
                { x1: -0.8, y1: 0, x2: 0.3, y2: 0.5 },
                { x1: -0.2, y1: -0.6, x2: -0.2, y2: 0.6 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.6 },
                { chordIdx: 1, t: 0.6 },
                { chordIdx: 2, t: 0.3 },
                { chordIdx: 2, t: 0.7 }
            ],
            par: 3,
            tip: 'chord.knowledge.perpBisector'
        },
        // Level 5: 密集网格
        {
            chords: [
                { x1: -0.7, y1: -0.5, x2: 0.7, y2: -0.5 },
                { x1: -0.7, y1: 0, x2: 0.7, y2: 0 },
                { x1: -0.7, y1: 0.5, x2: 0.7, y2: 0.5 },
                { x1: -0.3, y1: -0.7, x2: -0.3, y2: 0.7 },
                { x1: 0.3, y1: -0.7, x2: 0.3, y2: 0.7 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.5 },
                { chordIdx: 1, t: 0.5 },
                { chordIdx: 2, t: 0.5 },
                { chordIdx: 3, t: 0.5 },
                { chordIdx: 4, t: 0.5 }
            ],
            par: 4,
            tip: 'chord.knowledge.chordTheorem'
        },
        // Level 6: X形交叉+额外弦
        {
            chords: [
                { x1: -0.8, y1: -0.6, x2: 0.8, y2: 0.6 },
                { x1: -0.8, y1: 0.6, x2: 0.8, y2: -0.6 },
                { x1: -0.4, y1: -0.3, x2: 0.4, y2: 0.3 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.25 },
                { chordIdx: 0, t: 0.75 },
                { chordIdx: 1, t: 0.25 },
                { chordIdx: 1, t: 0.75 },
                { chordIdx: 2, t: 0.5 }
            ],
            par: 4,
            tip: 'chord.knowledge.chordTheorem'
        },
        // Level 7: 三角形内弦
        {
            chords: [
                { x1: -0.5, y1: -0.6, x2: 0.5, y2: -0.6 },
                { x1: -0.7, y1: 0.5, x2: 0.2, y2: -0.3 },
                { x1: 0.7, y1: 0.5, x2: -0.2, y2: -0.3 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.3 },
                { chordIdx: 0, t: 0.7 },
                { chordIdx: 1, t: 0.5 },
                { chordIdx: 2, t: 0.5 }
            ],
            par: 3,
            tip: 'chord.knowledge.perpBisector'
        },
        // Level 8: 高难度密集交叉
        {
            chords: [
                { x1: -0.8, y1: -0.3, x2: 0.8, y2: -0.3 },
                { x1: -0.6, y1: 0.5, x2: 0.6, y2: 0.5 },
                { x1: -0.3, y1: -0.7, x2: 0.3, y2: 0.7 },
                { x1: 0, y1: -0.6, x2: 0, y2: 0.6 },
                { x1: -0.5, y1: -0.5, x2: 0.5, y2: 0.5 },
                { x1: -0.5, y1: 0.2, x2: 0.5, y2: -0.2 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.5 },
                { chordIdx: 1, t: 0.5 },
                { chordIdx: 2, t: 0.5 },
                { chordIdx: 3, t: 0.5 },
                { chordIdx: 4, t: 0.5 },
                { chordIdx: 5, t: 0.5 }
            ],
            par: 5,
            tip: 'chord.knowledge.chordTheorem'
        },
        // Level 9: 菱形阵列
        {
            chords: [
                { x1: -0.5, y1: 0, x2: 0, y2: -0.5 },
                { x1: 0, y1: -0.5, x2: 0.5, y2: 0 },
                { x1: 0.5, y1: 0, x2: 0, y2: 0.5 },
                { x1: 0, y1: 0.5, x2: -0.5, y2: 0 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.5 },
                { chordIdx: 1, t: 0.5 },
                { chordIdx: 2, t: 0.5 },
                { chordIdx: 3, t: 0.5 }
            ],
            par: 4,
            tip: 'chord.knowledge.reflection'
        },
        // Level 10: 五芒星
        {
            chords: [
                { x1: 0, y1: -0.7, x2: 0.41, y2: 0.56 },
                { x1: 0.41, y1: 0.56, x2: -0.66, y2: -0.22 },
                { x1: -0.66, y1: -0.22, x2: 0.66, y2: -0.22 },
                { x1: 0.66, y1: -0.22, x2: -0.41, y2: 0.56 },
                { x1: -0.41, y1: 0.56, x2: 0, y2: -0.7 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.5 },
                { chordIdx: 1, t: 0.5 },
                { chordIdx: 2, t: 0.5 },
                { chordIdx: 3, t: 0.5 },
                { chordIdx: 4, t: 0.5 }
            ],
            par: 5,
            tip: 'chord.knowledge.chordTheorem'
        },
        // Level 11: 平行与相交
        {
            chords: [
                { x1: -0.6, y1: -0.4, x2: 0.6, y2: -0.4 },
                { x1: -0.6, y1: 0, x2: 0.6, y2: 0 },
                { x1: -0.6, y1: 0.4, x2: 0.6, y2: 0.4 },
                { x1: -0.5, y1: -0.6, x2: 0.5, y2: 0.6 },
                { x1: 0.5, y1: -0.6, x2: -0.5, y2: 0.6 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.5 },
                { chordIdx: 1, t: 0.5 },
                { chordIdx: 2, t: 0.5 },
                { chordIdx: 3, t: 0.3 },
                { chordIdx: 4, t: 0.3 }
            ],
            par: 5,
            tip: 'chord.knowledge.perpBisector'
        },
        // Level 12: 终极曼陀罗
        {
            chords: [
                { x1: -0.8, y1: 0, x2: 0.8, y2: 0 },
                { x1: 0, y1: -0.8, x2: 0, y2: 0.8 },
                { x1: -0.6, y1: -0.6, x2: 0.6, y2: 0.6 },
                { x1: -0.6, y1: 0.6, x2: 0.6, y2: -0.6 },
                { x1: -0.4, y1: -0.4, x2: 0.4, y2: -0.4 },
                { x1: 0.4, y1: -0.4, x2: 0.4, y2: 0.4 },
                { x1: 0.4, y1: 0.4, x2: -0.4, y2: 0.4 },
                { x1: -0.4, y1: 0.4, x2: -0.4, y2: -0.4 }
            ],
            nodes: [
                { chordIdx: 0, t: 0.2 },
                { chordIdx: 0, t: 0.8 },
                { chordIdx: 1, t: 0.2 },
                { chordIdx: 1, t: 0.8 },
                { chordIdx: 2, t: 0.5 },
                { chordIdx: 3, t: 0.5 },
                { chordIdx: 4, t: 0.5 },
                { chordIdx: 6, t: 0.5 }
            ],
            par: 6,
            tip: 'chord.knowledge.chordTheorem'
        }
    ];

    // ===== 初始化 =====
    function init() {
        canvas = document.getElementById('chordCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        elLevel = document.getElementById('chordLevel');
        elShots = document.getElementById('chordShots');
        elNodes = document.getElementById('chordNodes');
        elStartOverlay = document.getElementById('chordStartOverlay');
        elLevelSelectOverlay = document.getElementById('chordLevelSelectOverlay');
        elWinOverlay = document.getElementById('chordWinOverlay');
        elStars = document.getElementById('chordStars');
        elFinalOverlay = document.getElementById('chordFinalOverlay');
        elFinalStars = document.getElementById('chordFinalStars');
        elFinalScore = document.getElementById('chordFinalScore');
        elKnowledgeTip = document.getElementById('chordKnowledgeTip');
        elKnowledgeText = document.getElementById('chordKnowledgeText');

        bindEvents();
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
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
        W = rect.width; H = rect.height;
        cx = W / 2; cy = H / 2;
        R = Math.min(W, H) * 0.42;
    }

    function bindEvents() {
        const startBtn = document.getElementById('chordStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
                GameAudio.playClick();
                if (elStartOverlay) elStartOverlay.style.display = 'none';
                active = true;
                loadLevel(0);
            });
        }

        const selectLevelBtn = document.getElementById('chordSelectLevelBtn');
        if (selectLevelBtn) {
            selectLevelBtn.addEventListener('click', () => {
                if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
                GameAudio.playClick();
                if (elStartOverlay) elStartOverlay.style.display = 'none';
                if (elLevelSelectOverlay) elLevelSelectOverlay.style.display = 'flex';
            });
        }

        const closeLevelSelectBtn = document.getElementById('chordCloseLevelSelectBtn');
        if (closeLevelSelectBtn) {
            closeLevelSelectBtn.addEventListener('click', () => {
                GameAudio.playClick();
                if (elLevelSelectOverlay) elLevelSelectOverlay.style.display = 'none';
                if (elStartOverlay) elStartOverlay.style.display = 'flex';
            });
        }

        const levelBtns = document.querySelectorAll('.chord-level-btn');
        levelBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(e.target.dataset.level, 10);
                GameAudio.playClick();
                if (elLevelSelectOverlay) elLevelSelectOverlay.style.display = 'none';
                active = true;
                loadLevel(level);
            });
        });

        // 成就和皮肤按钮事件
        const achievementBtn = document.getElementById('chordAchievementBtn');
        if (achievementBtn) {
            achievementBtn.addEventListener('click', () => {
                if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
                GameAudio.playClick();
                if (elStartOverlay) elStartOverlay.style.display = 'none';
                document.getElementById('chordAchievementOverlay').style.display = 'flex';
                renderAchievements();
            });
        }

        const skinBtn = document.getElementById('chordSkinBtn');
        if (skinBtn) {
            skinBtn.addEventListener('click', () => {
                if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
                GameAudio.playClick();
                if (elStartOverlay) elStartOverlay.style.display = 'none';
                document.getElementById('chordSkinOverlay').style.display = 'flex';

                // 每次打开都重置为第一个 Tab (ball)
                const skinTabsArr = document.querySelectorAll('#chordSkinTabs .skin-tab');
                if (skinTabsArr.length > 0) {
                    skinTabsArr.forEach(t => t.classList.remove('active'));
                    skinTabsArr[0].classList.add('active');
                    currentSkinTab = skinTabsArr[0].dataset.target;
                    renderSkins(currentSkinTab);
                } else {
                    renderSkins(currentSkinTab);
                }
            });
        }

        const skinTabs = document.getElementById('chordSkinTabs');
        if (skinTabs) {
            skinTabs.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'button') {
                    GameAudio.playClick();
                    document.querySelectorAll('#chordSkinTabs .skin-tab').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    currentSkinTab = e.target.dataset.target;
                    renderSkins(currentSkinTab);
                }
            });
        }

        const achCloseBtn = document.getElementById('chordAchievementCloseBtn');
        if (achCloseBtn) {
            achCloseBtn.addEventListener('click', () => {
                GameAudio.playClick();
                document.getElementById('chordAchievementOverlay').style.display = 'none';
                if (elStartOverlay) elStartOverlay.style.display = 'flex';
            });
        }

        const skinCloseBtn = document.getElementById('chordSkinCloseBtn');
        if (skinCloseBtn) {
            skinCloseBtn.addEventListener('click', () => {
                GameAudio.playClick();
                document.getElementById('chordSkinOverlay').style.display = 'none';
                if (elStartOverlay) elStartOverlay.style.display = 'flex';
            });
        }

        const achDetailCloseBtn = document.getElementById('chordAchievementDetailCloseBtn');
        if (achDetailCloseBtn) {
            achDetailCloseBtn.addEventListener('click', () => {
                GameAudio.playClick();
                document.getElementById('chordAchievementDetailOverlay').style.display = 'none';
            });
        }

        const skinDetailCloseBtn = document.getElementById('chordSkinDetailCloseBtn');
        if (skinDetailCloseBtn) {
            skinDetailCloseBtn.addEventListener('click', () => {
                GameAudio.playClick();
                document.getElementById('chordSkinDetailOverlay').style.display = 'none';
            });
        }

        const equipBtn = document.getElementById('chordSkinDetailEquipBtn');
        if (equipBtn) {
            equipBtn.addEventListener('click', () => {
                if (currentViewingSkin && unlockedSkins.includes(currentViewingSkin.id)) {
                    if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
                    GameAudio.playClick();
                    equippedSkins[currentViewingSkinType] = currentViewingSkin.id;
                    saveProgress();

                    if (currentViewingSkinType === 'skin') {
                        playChordBgm(currentViewingSkin.id);
                    }

                    renderSkins(currentSkinTab);
                    showSkinDetail(currentViewingSkinType, currentViewingSkin);
                }
            });
        }

        const nextBtn = document.getElementById('chordNextBtn');
        if (nextBtn) nextBtn.addEventListener('click', nextLevel);

        const retryBtn = document.getElementById('chordRetryBtn');
        if (retryBtn) retryBtn.addEventListener('click', retryLevel);

        const quickRetryBtn = document.getElementById('chordQuickRetryBtn');
        if (quickRetryBtn) quickRetryBtn.addEventListener('click', retryLevel);

        const replayAllBtn = document.getElementById('chordReplayAllBtn');
        if (replayAllBtn) replayAllBtn.addEventListener('click', replayAll);

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
        init();
        loadProgress(); // 每次进入游戏界面重新读取一次存档数据
        resizeCanvas();
        if (elStartOverlay) elStartOverlay.style.display = 'flex';
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        if (elFinalOverlay) elFinalOverlay.style.display = 'none';

        // 立即尝试播放背景音乐 (弦之裂变专用播放器，确保使用本游戏音频文件)
        if (window.GameAudio) {
            // 兜底修复：历史本地存储把音频设为关闭时，确保进入该游戏能恢复播放
            if (typeof window.GameAudio.isEnabled === 'function' &&
                typeof window.GameAudio.setEnabled === 'function' &&
                !window.GameAudio.isEnabled()) {
                window.GameAudio.setEnabled(true);
            }
        }
        playChordBgm(equippedSkins.skin || 'default');

        gameLoop();
    }

    function hide() {
        active = false;
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        if (elFinalOverlay) elFinalOverlay.style.display = 'none';

        // 停止背景音乐
        stopChordBgm();
    }

    function startGame(startLevel = 0) {
        if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
        currentLevel = startLevel;
        levelStars = Array(levels.length).fill(0);
        loadLevel(startLevel);
        if (elStartOverlay) elStartOverlay.style.display = 'none';
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        if (elFinalOverlay) elFinalOverlay.style.display = 'none';
    }

    function nextLevel() {
        GameAudio.playClick();
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        if (currentLevel >= levels.length - 1) {
            showFinalResults();
            return;
        }
        loadLevel(currentLevel + 1);
    }

    function retryLevel() {
        consecutiveFails++;
        GameAudio.playClick();
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        if (elFinalOverlay) elFinalOverlay.style.display = 'none';
        loadLevel(currentLevel);
    }

    function replayAll() {
        GameAudio.playClick();
        startGame();
    }

    function loadProgress() {
        try {
            const saved = localStorage.getItem('chordBreaker_progress');
            if (saved) {
                levelStars = JSON.parse(saved);
            } else {
                levelStars = new Array(levels.length).fill(0);
            }

            const savedAchievements = localStorage.getItem('chordBreaker_achievements');
            if (savedAchievements) {
                unlockedAchievements = JSON.parse(savedAchievements);
            } else {
                unlockedAchievements = [];
            }

            const savedSkins = localStorage.getItem('chordBreaker_skins');
            if (savedSkins) {
                unlockedSkins = JSON.parse(savedSkins);
            } else {
                unlockedSkins = ['default'];
            }

            const savedEquipped = localStorage.getItem('chordBreaker_equipped_skins');
            if (savedEquipped) {
                equippedSkins = { ...equippedSkins, ...JSON.parse(savedEquipped) };
            } else {
                equippedSkins = { skin: 'default', ball: 'default' };
            }

            totalReflections = parseInt(localStorage.getItem('chord_total_reflections') || '0', 10);
        } catch (e) {
            console.error('Failed to load chord progress', e);
            levelStars = new Array(levels.length).fill(0);
            unlockedAchievements = [];
            unlockedSkins = ['default'];
            equippedSkins = { skin: 'default', ball: 'default' };
        }
    }

    function saveProgress() {
        try {
            localStorage.setItem('chordBreaker_progress', JSON.stringify(levelStars));
            localStorage.setItem('chordBreaker_achievements', JSON.stringify(unlockedAchievements));
            localStorage.setItem('chordBreaker_skins', JSON.stringify(unlockedSkins));
            localStorage.setItem('chordBreaker_equipped_skins', JSON.stringify(equippedSkins));
            localStorage.setItem('chord_total_reflections', totalReflections.toString());
        } catch (e) {
            console.error('Failed to save chord progress', e);
        }
    }

    function getSkinConfig() {
        const activeSkinId = equippedSkins.skin || 'default';
        return SKIN_CONFIG[activeSkinId] || SKIN_CONFIG['default'];
    }

    function getBallSkinConfig() {
        const activeBallId = equippedSkins.ball || 'default';
        const ballConfigs = {
            default: { color: '#ffffff', glow: '#ffffff', trailType: 'line', trailColor: 'rgba(255,255,255,0.4)' },
            fireball: { color: '#fbbf24', glow: '#f59e0b', trailType: 'particle', trailColor: '#f97316' },
            frostCore: { color: '#bae6fd', glow: '#38bdf8', trailType: 'diamond', trailColor: 'rgba(186,230,253,0.5)' },
            darkMatter: { color: '#1e1e1e', glow: '#8b5cf6', trailType: 'mist', trailColor: 'rgba(139,92,246,0.3)' },
            lightning: { color: '#fef08a', glow: '#eab308', trailType: 'zigzag', trailColor: 'rgba(250,204,21,0.6)' }
        };
        return ballConfigs[activeBallId] || ballConfigs['default'];
    }

    // ===== 成就与皮肤弹窗及渲染逻辑 =====

    function renderAchievements() {
        const list = document.getElementById('chordAchievementList');
        if (!list) return;
        list.innerHTML = '';

        const achievementIcons = {
            novice: '🎯', gettingTheHangOfIt: '✨', fiveStarChain: '⭐', geometryMaster: '⚔️',
            perfectionist: '⏱️', chordResonance: '🎶', neverGiveUp: '🔥'
        };

        ACHIEVEMENTS.forEach(ach => {
            const isUnlocked = unlockedAchievements.includes(ach.id);
            const icon = achievementIcons[ach.id] || '🏆';
            const name = GameI18N.t(ach.i18nKey);

            let badgeHtml = '';
            if (isUnlocked) {
                badgeHtml = `<span class="achievement-badge">${GameI18N.t('chord.achievement.unlocked') || '已达成'}</span>`;
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
        let isUnlocked = unlockedAchievements.includes(ach.id);

        const iconMap = {
            novice: '🎯', gettingTheHangOfIt: '✨', fiveStarChain: '⭐', geometryMaster: '⚔️',
            perfectionist: '⏱️', chordResonance: '🎶', neverGiveUp: '🔥'
        };
        document.getElementById('chordAchievementDetailIcon').textContent = iconMap[ach.id] || '🏆';
        document.getElementById('chordAchievementDetailName').textContent = GameI18N.t(ach.i18nKey);
        document.getElementById('chordAchievementDetailDesc').textContent = GameI18N.t(ach.i18nKey + '.desc');

        const progressText = document.getElementById('chordAchievementDetailProgressText');
        const progressBar = document.getElementById('chordAchievementDetailProgressBar');

        if (ach.total) {
            let current = 0;
            if (ach.id === 'gettingTheHangOfIt') {
                let stars = 0;
                for (let i = 0; i < levels.length; i++) {
                    if (levelStars[i]) stars += levelStars[i];
                }
                current = stars;
            }
            if (ach.id === 'chordResonance') {
                current = totalReflections;
            }

            current = Math.min(current, ach.total);
            if (isUnlocked) current = ach.total;

            progressText.textContent = `${current}/${ach.total}`;
            progressBar.style.width = `${(current / ach.total) * 100}%`;
        } else {
            progressText.textContent = isUnlocked ? '1/1' : '0/1';
            progressBar.style.width = isUnlocked ? '100%' : '0%';
        }

        document.getElementById('chordAchievementDetailOverlay').style.display = 'flex';
    }

    // ===== 皮肤渲染与交互逻辑 =====
    function renderSkins(type) {
        const list = document.getElementById('chordSkinList');
        if (!list) return;
        list.innerHTML = '';

        const previewRenderers = {
            skin: (k) => {
                if (k === 'cherryBlossom') return `<div style="color:#ff9ebd; font-size: 2rem;">🌸</div>`;
                if (k === 'deepOcean') return `<div style="color:#0055ff; font-size: 2rem;">🌊</div>`;
                if (k === 'goldenAge') return `<div style="color:#ffd700; font-size: 2rem;">✨</div>`;
                if (k === 'cyberMatrix') return `<div style="color:#39ff14; font-size: 2rem;">⚡</div>`;
                return `<div style="color:#00f3ff; font-size: 2rem;">⚛️</div>`;
            },
            ball: (k) => {
                if (k === 'fireball') return `<div style="color:#f97316; font-size: 2rem;">🔥</div>`;
                if (k === 'frostCore') return `<div style="color:#38bdf8; font-size: 2rem;">❄️</div>`;
                if (k === 'darkMatter') return `<div style="color:#8b5cf6; font-size: 2rem;">🌑</div>`;
                if (k === 'lightning') return `<div style="color:#eab308; font-size: 2rem;">⚡</div>`;
                return `<div style="color:#ffffff; font-size: 2rem;">⚪</div>`;
            }
        };

        SKINS[type].forEach(skin => {
            let isUnlocked = unlockedSkins.includes(skin.id);
            let isEquipped = equippedSkins[type] === skin.id;

            // ---- Local condition check for skins ----
            if (!isUnlocked) {
                let stars = 0;
                for (let i = 0; i < levels.length; i++) {
                    const s = levelStars[i];
                    if (s) stars += s;
                }

                if (type === 'skin') {
                    if (skin.id === 'cherryBlossom' && stars >= 15) isUnlocked = true;
                    if (skin.id === 'deepOcean' && levelStars[7] > 0) isUnlocked = true; // 第8关(索引7)通关

                    let allThreeStars = true;
                    for (let i = 0; i < 12; i++) {
                        if (!levelStars[i] || levelStars[i] < 3) {
                            allThreeStars = false;
                            break;
                        }
                    }
                    if (skin.id === 'goldenAge' && allThreeStars) isUnlocked = true;
                    if (skin.id === 'cyberMatrix' && totalReflections >= 50) isUnlocked = true;
                } else if (type === 'ball') {
                    if (skin.id === 'fireball' && stars >= 20) isUnlocked = true;
                    if (skin.id === 'frostCore' && levelStars[0] > 0) isUnlocked = true; // 初探弦界(通关第1关)
                    if (skin.id === 'darkMatter' && unlockedAchievements.includes('neverGiveUp')) isUnlocked = true;
                    if (skin.id === 'lightning' && unlockedAchievements.includes('fiveStarChain')) isUnlocked = true;
                }

                if (isUnlocked) {
                    unlockedSkins.push(skin.id);
                    saveProgress();
                }
            }
            // ------------------------------------------

            const name = GameI18N.t(skin.i18nKey);
            const desc = GameI18N.t(skin.i18nKey + '.desc');

            let btnHtml = '';
            if (isUnlocked) {
                if (isEquipped) {
                    btnHtml = `<button class="btn skin-btn" disabled style="opacity:0.5;cursor:default;">${GameI18N.t('chord.equipped')}</button>`;
                } else {
                    btnHtml = `<button class="btn btn-primary skin-btn">${GameI18N.t('chord.equip')}</button>`;
                }
            } else {
                btnHtml = `<button class="btn skin-btn locked-btn" disabled>🔒</button>`;
            }

            const card = document.createElement('div');
            card.className = `skin-card ${isUnlocked ? '' : 'locked'}`;

            card.innerHTML = `
                <div class="skin-preview">
                    ${previewRenderers[type](skin.id)}
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
                if (e.target.tagName.toLowerCase() === 'button') {
                    e.stopPropagation();
                    if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
                    GameAudio.playClick();
                    equippedSkins[type] = skin.id;
                    saveProgress();

                    if (type === 'skin') {
                        playChordBgm(skin.id);
                    }

                    renderSkins(currentSkinTab);
                    return;
                }
                if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
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

        document.getElementById('chordSkinDetailName').textContent = GameI18N.t(skin.i18nKey);
        document.getElementById('chordSkinDetailDesc').textContent = GameI18N.t(skin.i18nKey + '.desc');

        const progressText = document.getElementById('chordSkinDetailProgressText');
        const progressBar = document.getElementById('chordSkinDetailProgressBar');

        if (skin.total) {
            let current = 0;
            if (skin.id === 'cherryBlossom' || skin.id === 'fireball') {
                let stars = 0;
                for (let i = 0; i < levels.length; i++) {
                    const s = levelStars[i];
                    if (s) stars += s;
                }
                current = stars;
            }
            if (skin.id === 'cyberMatrix') {
                current = totalReflections;
            }

            current = Math.min(current, skin.total);
            if (isUnlocked) current = skin.total;

            progressText.textContent = `${current}/${skin.total}`;
            progressBar.style.width = `${(current / skin.total) * 100}%`;
        } else {
            progressText.textContent = isUnlocked ? '1/1' : '0/1';
            progressBar.style.width = isUnlocked ? '100%' : '0%';
        }

        const equipBtn = document.getElementById('chordSkinDetailEquipBtn');
        const equippedBtn = document.getElementById('chordSkinDetailEquippedBtn');

        if (isUnlocked) {
            if (isEquipped) {
                equipBtn.style.display = 'none';
                equippedBtn.style.display = 'block';
            } else {
                equipBtn.style.display = 'block';
                equippedBtn.style.display = 'none';
            }
        } else {
            equipBtn.style.display = 'none';
            equippedBtn.style.display = 'none';
        }

        document.getElementById('chordSkinDetailOverlay').style.display = 'flex';
    }

    function drawSkinPreviewInLoop() {
        if (!currentViewingSkin) return;
        const cvs = document.getElementById('chordSkinPreviewCanvas');
        if (!cvs) return;
        const c = cvs.getContext('2d');
        c.clearRect(0, 0, cvs.width, cvs.height);

        const cx = cvs.width / 2;
        const cy = cvs.height / 2;
        const R = 60;

        if (currentViewingSkinType === 'skin') {
            const config = SKIN_CONFIG[currentViewingSkin.id] || SKIN_CONFIG['default'];

            // 绘制预览背景
            if (config.bgStops) {
                const grad = c.createRadialGradient(cx, cy, 0, cx, cy, R * 4);
                config.bgStops.forEach(s => grad.addColorStop(s.stop, s.color));
                c.fillStyle = grad;
            } else {
                c.fillStyle = config.bgDark;
            }
            c.fillRect(0, 0, cvs.width, cvs.height);

            const t = performance.now() / 1000;
            drawBackgroundDecorations(c, cvs.width, cvs.height, currentViewingSkin.id, t, previewBgAnimState);

            // 圆圈
            c.beginPath();
            c.arc(cx, cy, R, 0, TAU);
            c.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            c.lineWidth = 1;
            c.stroke();

            // 连线
            c.beginPath();
            c.moveTo(cx - R * 0.8, cy - R * 0.2);
            c.lineTo(cx + R * 0.8, cy + R * 0.2);
            const grad = c.createLinearGradient(cx - R * 0.8, cy - R * 0.2, cx + R * 0.8, cy + R * 0.2);
            grad.addColorStop(0, config.beamGradientStart);
            grad.addColorStop(1, config.beamGradientEnd);
            c.strokeStyle = grad;
            c.lineWidth = 3;
            c.shadowColor = config.beamGlow;
            c.shadowBlur = 10;
            c.stroke();
            c.shadowBlur = 0;

            // 节点
            c.beginPath();
            c.arc(cx, cy, 8, 0, TAU);
            c.fillStyle = config.nodeOuter;
            c.shadowColor = config.nodeGlow;
            c.shadowBlur = 10;
            c.fill();
            c.beginPath();
            c.arc(cx, cy, 3, 0, TAU);
            c.fillStyle = config.nodeInner;
            c.fill();
            c.shadowBlur = 0;

            // 粒子
            for (let i = 0; i < 3; i++) {
                const px = cx + Math.cos(t * 2 + i * 2) * 20;
                const py = cy + Math.sin(t * 2 + i * 2) * 20;
                c.beginPath();
                c.arc(px, py, 2, 0, TAU);
                c.fillStyle = config.particleColors[i % config.particleColors.length];
                c.fill();
            }
        } else if (currentViewingSkinType === 'ball') {
            const ballConfigs = {
                default: { color: '#ffffff', glow: '#ffffff', trailType: 'line', trailColor: 'rgba(255,255,255,0.4)' },
                fireball: { color: '#fbbf24', glow: '#f59e0b', trailType: 'particle', trailColor: '#f97316' },
                frostCore: { color: '#bae6fd', glow: '#38bdf8', trailType: 'diamond', trailColor: 'rgba(186,230,253,0.5)' },
                darkMatter: { color: '#1e1e1e', glow: '#8b5cf6', trailType: 'mist', trailColor: 'rgba(139,92,246,0.3)' },
                lightning: { color: '#fef08a', glow: '#eab308', trailType: 'zigzag', trailColor: 'rgba(250,204,21,0.6)' }
            };
            const ballConf = ballConfigs[currentViewingSkin.id] || ballConfigs['default'];

            // 简单的背景
            c.fillStyle = '#0a0a1a';
            c.fillRect(0, 0, cvs.width, cvs.height);

            const t = performance.now() / 1000;
            const px = cx + Math.cos(t * 3) * 20;
            const py = cy + Math.sin(t * 3) * 20;

            // 绘制一个模拟的拖尾
            c.beginPath();
            c.arc(cx, cy, 15, 0, TAU);
            const grad = c.createRadialGradient(cx, cy, 0, cx, cy, 15);
            grad.addColorStop(0, ballConf.trailColor);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = grad;
            c.fill();

            // 绘制球体
            c.beginPath();
            c.arc(cx, cy, 6, 0, TAU);
            c.fillStyle = ballConf.color;
            c.shadowColor = ballConf.glow;
            c.shadowBlur = 15;
            c.fill();

            if (currentViewingSkin.id === 'darkMatter') {
                c.strokeStyle = '#c084fc';
                c.lineWidth = 1.5;
                c.stroke();
            }

            c.beginPath(); c.arc(cx - 2, cy - 2, 2, 0, TAU);
            c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
            c.shadowBlur = 0;
        }
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

        const toastEl = document.getElementById('chordToast');
        const iconEl = document.getElementById('chordToastIcon');
        const textEl = document.getElementById('chordToastText');

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

    function checkAchievementsAndSkins(isWin = false, starsEarned = 0, currentLevelIdx = 0) {
        let anyUnlocked = false;

        // --- 1. 检查成就 ---
        ACHIEVEMENTS.forEach(ach => {
            if (unlockedAchievements.includes(ach.id)) return;

            let unlocked = false;
            switch (ach.id) {
                case 'novice':
                    if (isWin && currentLevelIdx === 0) unlocked = true;
                    break;
                case 'gettingTheHangOfIt':
                    let totalS = 0;
                    for (let i = 0; i < levels.length; i++) {
                        if (levelStars[i]) totalS += levelStars[i];
                    }
                    if (totalS >= 15) unlocked = true;
                    break;
                case 'fiveStarChain':
                    // 关卡索引从 0 开始，第 10 关索引是 9
                    if (isWin && currentLevelIdx === 9 && shots === 1) unlocked = true;
                    break;
                case 'geometryMaster':
                    if (isWin && currentLevelIdx === 11) unlocked = true;
                    break;
                case 'perfectionist':
                    if (isWin) {
                        let fullStars = true;
                        for (let i = 0; i < 12; i++) {
                            if (!levelStars[i] || levelStars[i] < 3) {
                                fullStars = false;
                                break;
                            }
                        }
                        if (fullStars) unlocked = true;
                    }
                    break;
                case 'chordResonance':
                    if (totalReflections >= 50) unlocked = true;
                    break;
                case 'neverGiveUp':
                    if (isWin && shots >= 5) unlocked = true;
                    break;
            }

            if (unlocked) {
                unlockedAchievements.push(ach.id);
                showToast((GameI18N.t('chord.achievement.unlocked') || 'Unlocked Achievement') + ': ' + GameI18N.t(ach.i18nKey), '🏆');
                anyUnlocked = true;
            }
        });

        // --- 2. 检查皮肤 ---
        Object.keys(SKINS).forEach(type => {
            SKINS[type].forEach(skin => {
                if (unlockedSkins.includes(skin.id)) return;

                let unlocked = false;
                switch (skin.id) {
                    case 'cherryBlossom':
                        let starsCherry = 0;
                        for (let i = 0; i < levels.length; i++) {
                            if (levelStars[i]) starsCherry += levelStars[i];
                        }
                        if (starsCherry >= 15) unlocked = true;
                        break;
                    case 'deepOcean':
                        if (isWin && currentLevelIdx >= 7 && levelStars[7] > 0) unlocked = true;
                        break;
                    case 'goldenAge':
                        let allThreeStars = true;
                        for (let i = 0; i < 12; i++) {
                            if (!levelStars[i] || levelStars[i] < 3) {
                                allThreeStars = false;
                                break;
                            }
                        }
                        if (allThreeStars) unlocked = true;
                        break;
                    case 'cyberMatrix':
                        if (totalReflections >= 50) unlocked = true;
                        break;
                }

                if (unlocked) {
                    unlockedSkins.push(skin.id);
                    showToast((GameI18N.t('chord.skin.unlocked') || 'Unlocked Skin') + ': ' + GameI18N.t(skin.i18nKey), '🎨');
                    anyUnlocked = true;
                }
            });
        });

        if (anyUnlocked) saveProgress();
    }

    function loadLevel(idx) {
        if (idx < 0) idx = 0;
        if (idx >= levels.length) idx = levels.length - 1;
        currentLevel = idx;
        const level = levels[idx];

        // 播放背景音乐
        playChordBgm(equippedSkins.skin || 'default');

        // 转换归一化坐标到实际坐标
        chords = level.chords.map(c => ({
            x1: cx + c.x1 * R, y1: cy + c.y1 * R,
            x2: cx + c.x2 * R, y2: cy + c.y2 * R,
            active: true
        }));

        // 生成节点实际坐标
        nodes = level.nodes.map(n => {
            const c = chords[n.chordIdx];
            return {
                x: c.x1 + (c.x2 - c.x1) * n.t,
                y: c.y1 + (c.y2 - c.y1) * n.t,
                alive: true,
                chordIdx: n.chordIdx,
                pulse: Math.random() * TAU
            };
        });

        remainingNodes = nodes.length;
        shots = 0;
        balls = [];
        isDragging = false;
        dragPos = null;
        launchStartAngle = 0;
        launchAngle = 0;
        prediction = [];
        nextBallReady = true;
        nextBallReadyAt = 0;
        levelComplete = false;
        particles = [];
        feedbackText = '';
        feedbackTimer = 0;

        updateUI();
        showKnowledgeTip(level.tip);
    }

    // ===== 交互 =====
    function onPointerDown(e) {
        if (levelComplete || !nextBallReady) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 检查是否在圆周附近
        const dist = Math.hypot(mx - cx, my - cy);
        if (Math.abs(dist - R) < 30) {
            isDragging = true;
            dragPos = { x: mx, y: my };
            launchStartAngle = Math.atan2(my - cy, mx - cx);
            launchAngle = Math.atan2(my - cy, mx - cx);
            canvas.setPointerCapture(e.pointerId);
            updatePrediction();
        }
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        dragPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        launchAngle = Math.atan2(dragPos.y - cy, dragPos.x - cx);
        updatePrediction();
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;

        if (!dragPos || !nextBallReady) return;

        const launch = getLaunchState(launchStartAngle, launchAngle);

        balls.push({
            x: launch.startX, y: launch.startY,
            vx: launch.dirX * BALL_SPEED,
            vy: launch.dirY * BALL_SPEED,
            trail: []
        });
        shots++;
        nextBallReady = false;
        nextBallReadyAt = performance.now() + SHOT_COOLDOWN_MS;
        prediction = [];
        updateUI();
        GameAudio.playLaunch();
    }

    // ===== 物理 =====
    function updateBall(ball) {
        ball.x += ball.vx;
        ball.y += ball.vy;

        ball.trail.push({ x: ball.x, y: ball.y });

        // 动态控制拖尾长度
        const ballSkinId = equippedSkins.ball || 'default';
        let maxTrailLen = 50;
        if (ballSkinId === 'default') maxTrailLen = 15;
        else if (ballSkinId === 'darkMatter') maxTrailLen = 12;
        else if (ballSkinId === 'lightning') maxTrailLen = 10;
        else if (ballSkinId === 'fireball') maxTrailLen = 20;
        else if (ballSkinId === 'frostCore') maxTrailLen = 25;

        if (ball.trail.length > maxTrailLen) {
            ball.trail.shift();
        }

        const dx = ball.x - cx;
        const dy = ball.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= R) {
            const nx = dx / dist;
            const ny = dy / dist;
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx -= 2 * dot * nx;
            ball.vy -= 2 * dot * ny;
            ball.x = cx + nx * (R - 2);
            ball.y = cy + ny * (R - 2);
            GameAudio.playClick();

            // 记录反射次数并检查成就
            totalReflections++;
            checkAchievementsAndSkins(false, 0, currentLevel);
        }

        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (!n.alive) continue;
            const nd = Math.hypot(ball.x - n.x, ball.y - n.y);
            if (nd < HIT_TOLERANCE) {
                n.alive = false;
                remainingNodes--;
                spawnParticles(n.x, n.y, '#22C55E', 20);
                GameAudio.playPerfect();

                if (remainingNodes <= 0) {
                    onLevelComplete();
                }
            }
        }
    }

    function onLevelComplete() {
        levelComplete = true;
        balls = [];
        nextBallReady = false;
        const stars = shots <= levels[currentLevel].par ? 3 : shots === levels[currentLevel].par + 1 ? 2 : 1;

        if (!levelStars[currentLevel] || stars > levelStars[currentLevel]) {
            levelStars[currentLevel] = stars;
        }

        consecutiveFails = 0; // 重置连续失败
        saveProgress();

        if (elStars) elStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

        setTimeout(() => {
            if (currentLevel >= levels.length - 1) {
                showFinalResults();
            } else if (elWinOverlay) {
                elWinOverlay.style.display = 'flex';
            }
            GameAudio.playStarRating(stars);
            spawnParticles(cx, cy, '#F59E0B', 40);
            updateUI();

            // 触发成就与皮肤检查
            checkAchievementsAndSkins(true, stars, currentLevel);
        }, 500);
    }

    function showFinalResults() {
        const totalStars = levelStars.reduce((sum, s) => sum + (s || 0), 0);
        const maxStars = levels.length * 3;
        if (elFinalScore) elFinalScore.textContent = `${totalStars} / ${maxStars} ★`;
        if (elFinalStars) elFinalStars.textContent = `⭐ ${totalStars}`;
        if (elFinalOverlay) elFinalOverlay.style.display = 'flex';
    }

    // ===== 弹道预测 =====
    function updatePrediction() {
        if (!isDragging || !dragPos) { prediction = []; return; }
        const launch = getLaunchState(launchStartAngle, launchAngle);
        let px = launch.startX;
        let py = launch.startY;
        let pvx = launch.dirX * BALL_SPEED;
        let pvy = launch.dirY * BALL_SPEED;

        prediction = [{ x: px, y: py }];

        for (let i = 0; i < PREDICTION_STEPS; i++) {
            px += pvx; py += pvy;
            const ddx = px - cx, ddy = py - cy;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dist >= R) {
                const nnx = ddx / dist, nny = ddy / dist;
                const dot = pvx * nnx + pvy * nny;
                pvx -= 2 * dot * nnx; pvy -= 2 * dot * nny;
                px = cx + nnx * (R - 2); py = cy + nny * (R - 2);
            }
            if (i % 3 === 0) prediction.push({ x: px, y: py });
        }
    }

    function normalizeAngle(rad) {
        let r = rad;
        while (r > PI) r -= TAU;
        while (r < -PI) r += TAU;
        return r;
    }

    function getLaunchState(startAngle, aimAngle) {
        const nx = Math.cos(startAngle);
        const ny = Math.sin(startAngle);
        const tx = -ny;
        const ty = nx;
        const delta = Math.max(-PI / 2, Math.min(PI / 2, normalizeAngle(aimAngle - startAngle)));
        const tangentFactor = Math.sin(delta) * 0.85;
        let dirX = -nx + tx * tangentFactor;
        let dirY = -ny + ty * tangentFactor;
        const len = Math.hypot(dirX, dirY) || 1;
        dirX /= len;
        dirY /= len;
        return {
            startX: cx + nx * R,
            startY: cy + ny * R,
            dirX,
            dirY
        };
    }

    // ===== 粒子 =====
    function spawnParticles(x, y, color, count) {
        const config = getSkinConfig();
        const colors = config.particleColors;
        for (let i = 0; i < count; i++) {
            const a = Math.random() * TAU;
            const s = 1 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: 1, decay: 0.01 + Math.random() * 0.02,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.03;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    // ===== 背景装饰 (复用 pi-sniper 元素并增强) =====
    function initBgAnimState(state, w, h) {
        const _cx = w / 2;
        const _r = Math.min(w, h) * 0.35;

        // Deep Space (Classic Neon)
        state.deepSpace.stars = Array.from({ length: 50 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.5 + 0.5,
            vy: Math.random() * 0.3 + 0.1
        }));
        state.deepSpace.planets = [
            { x: w * 0.85, y: h * 0.2, r: Math.min(w, h) * 0.15, type: 'large', color1: '#E2C892', color2: '#9C7238' },
            { x: w * 0.15, y: h * 0.7, r: Math.min(w, h) * 0.06, type: 'moon', color1: '#67E8F9', color2: '#0284C7', hasSatellite: true },
            { x: w * 0.4, y: h * 0.1, r: Math.min(w, h) * 0.03, type: 'gas', color1: '#E879F9', color2: '#86198F' }
        ];

        // Cherry Blossom
        state.cherryBlossom.petals = Array.from({ length: 40 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: Math.random() * 4 + 2,
            vy: Math.random() * 1 + 0.5,
            vx: Math.random() * 0.5 - 0.25,
            angle: Math.random() * Math.PI * 2,
            spin: Math.random() * 0.05 - 0.025
        }));

        // Ocean
        state.ocean.bubbles = Array.from({ length: 25 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: Math.random() * 3 + 1,
            vy: -(Math.random() * 0.8 + 0.2)
        }));

        const fishArea = Math.PI * _r * _r * 0.25;
        const fishLen = Math.sqrt(fishArea / 0.4);
        state.ocean.largeFishes = [
            { type: 'A', x: -fishLen * 2, y: h * 0.35, targetY: h * 0.65, speed: 1.5, size: fishLen * 0.8, yOffset: Math.random() * Math.PI * 2 },
            { type: 'B', x: w + fishLen * 2, y: h * 0.7, targetY: h * 0.4, speed: -1.0, size: fishLen * 0.9, yOffset: Math.random() * Math.PI * 2 }
        ];

        state.ocean.crabs = [
            { cx: w * 0.2, range: w * 0.1, x: w * 0.2, speed: 0.5, size: _r * 0.15, phase: Math.random() * Math.PI * 2 },
            { cx: w * 0.8, range: w * 0.15, x: w * 0.8, speed: -0.4, size: _r * 0.12, phase: Math.random() * Math.PI * 2 }
        ];

        const jellyBaseX = w * 0.85;
        const jellyBaseY = h * 0.35;
        state.ocean.jellyfishes = Array.from({ length: 4 }, () => ({
            x: jellyBaseX + (Math.random() - 0.5) * _r * 0.6,
            y: jellyBaseY + (Math.random() - 0.5) * _r * 0.6,
            size: _r * 0.15 + Math.random() * _r * 0.05,
            phase: Math.random() * Math.PI * 2
        }));

        state.ocean.kelps = [];
        const kelpClusters = [w * 0.15, w * 0.25, w * 0.75, w * 0.85];
        kelpClusters.forEach(kx => {
            for (let i = 0; i < 5; i++) {
                state.ocean.kelps.push({
                    x: kx + (Math.random() - 0.5) * w * 0.1,
                    hRatio: 0.3 + Math.random() * 0.3
                });
            }
        });

        state.ocean.corals = [];
        const coralX = w * 0.1;
        for (let i = 0; i < 4; i++) {
            const bgType = Math.random() > 0.5 ? 'brain' : 'finger';
            const baseBgX = bgType === 'finger' ? (coralX - w * 0.06) : coralX;
            state.ocean.corals.push({
                x: baseBgX + (Math.random() - 0.5) * w * 0.05,
                type: bgType,
                size: _r * 0.2 + Math.random() * _r * 0.15,
                color: bgType === 'brain' ? '#7E22CE' : '#4338CA',
                layer: 'bg'
            });
        }
        for (let i = 0; i < 6; i++) {
            state.ocean.corals.push({
                x: coralX + (Math.random() - 0.5) * w * 0.08,
                type: Math.random() > 0.5 ? 'brain' : 'finger',
                size: _r * 0.1 + Math.random() * _r * 0.1,
                color: Math.random() > 0.5 ? '#E11D48' : '#EA580C',
                layer: 'fg'
            });
        }

        // Golden Age
        state.goldenAge.sparks = Array.from({ length: 40 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: Math.random() * 3 + 1,
            vy: -(Math.random() * 1.5 + 0.5),
            vx: Math.random() * 0.4 - 0.2,
            phase: Math.random() * Math.PI * 2
        }));
        state.goldenAge.beams = Array.from({ length: 5 }, () => ({
            x: Math.random() * w,
            w: Math.random() * w * 0.1 + 20,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.01
        }));

        // Cyberpunk: Buildings and Cars
        const bWidth = Math.max(40, w / 15);
        const buildings = [];
        for (let x = -20; x < w + 20; x += bWidth * (0.8 + Math.random() * 0.4)) {
            const isOutside = (x + bWidth < _cx - _r) || (x > _cx + _r);
            let bh = h * (0.2 + Math.random() * 0.3);
            if (isOutside) {
                bh = h * (0.4 + Math.random() * 0.4);
            }
            buildings.push({
                x: x,
                w: bWidth * (0.6 + Math.random() * 0.6),
                h: bh,
                isOutside: isOutside,
                windows: Array.from({ length: 15 }, () => ({
                    wx: Math.random(), wy: Math.random(),
                    color: ['#F472B6', '#38BDF8', '#FBBF24', '#34D399'][Math.floor(Math.random() * 4)]
                }))
            });
        }
        state.cyberpunk.buildings = buildings;
        state.cyberpunk.cars = Array.from({ length: 12 }, () => ({
            x: Math.random() * w,
            y: h * 0.1 + Math.random() * (h * 0.6),
            speed: (Math.random() * 4 + 2) * (Math.random() > 0.5 ? 1 : -1),
            color: ['#F472B6', '#38BDF8', '#34D399', '#FEF08A', '#A78BFA'][Math.floor(Math.random() * 5)],
            type: ['sport', 'cargo', 'police'][Math.floor(Math.random() * 3)],
            size: Math.random() * 0.5 + 0.8
        }));

        state.lastW = w;
        state.lastH = h;
        state.initialized = true;
    }

    // ======= 海洋皮肤辅助绘制函数 =======
    function getOceanSeabedY(x, w, h) {
        return h * 0.88 + Math.sin(x * 0.005) * (h * 0.04) + Math.cos(x * 0.01) * (h * 0.02);
    }

    function drawOceanCrab(ctx, crab, time, w, h) {
        ctx.save();
        ctx.translate(crab.x, getOceanSeabedY(crab.x, w, h) - crab.size * 0.3);

        // 身体
        ctx.fillStyle = '#E11D48';
        ctx.beginPath();
        ctx.ellipse(0, 0, crab.size, crab.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(0,0,0,0.5)';

        // 眼睛 (螃蟹是横着走的，眼睛朝向正上方)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-crab.size * 0.2, -crab.size * 0.6, crab.size * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(crab.size * 0.2, -crab.size * 0.6, crab.size * 0.1, 0, Math.PI * 2); ctx.fill();

        // 钳子动画 (一只高举，一只低垂，横着走时不变)
        const clawAngle = Math.sin(time * 5 + crab.phase) * 0.1;
        // 确保移动方向和钳子举起方向的关系，让前面那只钳子举起
        const isMovingRight = crab.speed > 0;

        // 左钳 (高举或低放)
        ctx.save();
        ctx.translate(-crab.size * 0.7, -crab.size * 0.2);
        if (!isMovingRight) {
            // 向左移动时，左钳高举，钳子张开朝上
            ctx.rotate(-Math.PI / 4 + clawAngle);
            ctx.translate(0, -crab.size * 0.4);

            // 绘制钳子下半部分
            ctx.fillStyle = '#BE123C';
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.4, 0, Math.PI, false); ctx.fill();
            // 绘制钳子上半部分 (张开)
            ctx.fillStyle = '#E11D48';
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.35, Math.PI + 0.1, Math.PI * 2 - 0.3, false); ctx.fill();
        } else {
            // 向右移动时，左钳低放，闭合
            ctx.rotate(-Math.PI / 8 - clawAngle);
            ctx.fillStyle = '#BE123C';
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#9F1239'; // 闭合线
            ctx.strokeStyle = '#9F1239'; // 修复颜色泄漏
            ctx.lineWidth = crab.size * 0.05; // 修复线宽泄漏
            ctx.beginPath(); ctx.moveTo(-crab.size * 0.3, 0); ctx.lineTo(crab.size * 0.3, 0); ctx.stroke();
        }
        ctx.restore();

        // 右钳 (低放或高举)
        ctx.save();
        ctx.translate(crab.size * 0.7, -crab.size * 0.2);
        if (isMovingRight) {
            // 向右移动时，右钳高举，钳子张开朝上
            ctx.rotate(Math.PI / 4 - clawAngle);
            ctx.translate(0, -crab.size * 0.4);

            // 绘制钳子下半部分
            ctx.fillStyle = '#BE123C';
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.4, 0, Math.PI, false); ctx.fill();
            // 绘制钳子上半部分 (张开)
            ctx.fillStyle = '#E11D48';
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.35, Math.PI + 0.1, Math.PI * 2 - 0.3, false); ctx.fill();
        } else {
            // 向左移动时，右钳低放，闭合
            ctx.rotate(Math.PI / 8 + clawAngle);
            ctx.fillStyle = '#BE123C';
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#9F1239'; // 闭合线
            ctx.strokeStyle = '#9F1239'; // 修复颜色泄漏
            ctx.lineWidth = crab.size * 0.05; // 修复线宽泄漏
            ctx.beginPath(); ctx.moveTo(-crab.size * 0.3, 0); ctx.lineTo(crab.size * 0.3, 0); ctx.stroke();
        }
        ctx.restore();

        // 步足 (左侧和右侧的步足，产生横向爬行效果)
        ctx.strokeStyle = '#9F1239';
        ctx.lineWidth = crab.size * 0.15;
        ctx.lineCap = 'round';

        // 动态计算步足的横向张开幅度
        const walkPhase = time * 15 + crab.phase;

        // 左侧步足
        for (let i = 0; i < 3; i++) {
            const offset = Math.sin(walkPhase + i) * crab.size * 0.4;
            ctx.beginPath();
            ctx.moveTo(-crab.size * 0.4, crab.size * 0.2);
            ctx.quadraticCurveTo(-crab.size * 1.0, crab.size * 0.2, -crab.size * 0.8 + offset, crab.size * 0.8);
            ctx.stroke();
        }

        // 右侧步足
        for (let i = 0; i < 3; i++) {
            const offset = Math.sin(walkPhase + i + Math.PI) * crab.size * 0.4; // 相位差半个周期
            ctx.beginPath();
            ctx.moveTo(crab.size * 0.4, crab.size * 0.2);
            ctx.quadraticCurveTo(crab.size * 1.0, crab.size * 0.2, crab.size * 0.8 + offset, crab.size * 0.8);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawOceanFish(ctx, fish, time, w) {
        ctx.save();
        let progress = 0;
        if (fish.speed > 0) progress = (fish.x + fish.size * 2) / (w + fish.size * 4);
        else progress = (w + fish.size * 2 - fish.x) / (w + fish.size * 4);
        progress = Math.max(0, Math.min(1, progress));
        const currentY = fish.y + (fish.targetY - fish.y) * progress;

        let angle = Math.atan2(fish.targetY - fish.y, w + fish.size * 4);
        if (fish.speed < 0) angle *= -1;

        ctx.translate(fish.x, currentY + Math.sin(time * 2 + fish.yOffset) * fish.size * 0.1);
        if (fish.speed < 0) ctx.scale(-1, 1);
        ctx.rotate(angle);

        const tailAngle = Math.sin(time * 8 + fish.yOffset) * 0.3;

        if (fish.type === 'A') {
            const grad = ctx.createLinearGradient(-fish.size, 0, fish.size, 0);
            grad.addColorStop(0, 'rgba(14, 116, 144, 0.7)');
            grad.addColorStop(1, 'rgba(6, 182, 212, 0.7)');
            ctx.fillStyle = grad;

            ctx.beginPath(); ctx.ellipse(0, 0, fish.size, fish.size * 0.3, 0, 0, Math.PI * 2); ctx.fill();

            ctx.save();
            ctx.translate(-fish.size * 0.8, 0);
            ctx.rotate(tailAngle);
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-fish.size * 0.5, -fish.size * 0.2, -fish.size * 0.8, -fish.size * 0.6);
            ctx.quadraticCurveTo(-fish.size * 0.5, 0, -fish.size * 0.4, 0);
            ctx.quadraticCurveTo(-fish.size * 0.5, 0, -fish.size * 0.8, fish.size * 0.6);
            ctx.quadraticCurveTo(-fish.size * 0.5, fish.size * 0.2, 0, 0); ctx.fill();
            ctx.restore();

            ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
            ctx.beginPath(); ctx.ellipse(-fish.size * 0.2, fish.size * 0.15, fish.size * 0.3, fish.size * 0.1, Math.PI / 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-fish.size * 0.1, -fish.size * 0.25, fish.size * 0.4, fish.size * 0.15, -Math.PI / 12, Math.PI, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(fish.size * 0.6, -fish.size * 0.05, fish.size * 0.05, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(fish.size * 0.62, -fish.size * 0.07, fish.size * 0.02, 0, Math.PI * 2); ctx.fill();
        } else {
            const grad = ctx.createLinearGradient(-fish.size, 0, fish.size, 0);
            grad.addColorStop(0, 'rgba(190, 24, 93, 0.7)');
            grad.addColorStop(1, 'rgba(244, 63, 94, 0.7)');
            ctx.fillStyle = grad;

            ctx.beginPath(); ctx.ellipse(0, 0, fish.size, fish.size * 0.4, 0, 0, Math.PI * 2); ctx.fill();

            ctx.save();
            ctx.translate(-fish.size * 0.8, 0);
            ctx.rotate(tailAngle * 1.5);
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(-fish.size * 0.6, -fish.size * 0.5);
            ctx.lineTo(-fish.size * 0.4, 0);
            ctx.lineTo(-fish.size * 0.6, fish.size * 0.5);
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = 'rgba(244, 63, 94, 0.6)';
            ctx.beginPath(); ctx.ellipse(-fish.size * 0.1, fish.size * 0.2, fish.size * 0.2, fish.size * 0.1, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, -fish.size * 0.3, fish.size * 0.3, fish.size * 0.1, 0, Math.PI, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(fish.size * 0.7, -fish.size * 0.1, fish.size * 0.04, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(fish.size * 0.72, -fish.size * 0.12, fish.size * 0.015, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    function drawSatellite(ctx, x, y, r, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 4);

        const panelWidth = r * 5.5;
        const panelHeight = r * 1.2;
        const coreR = r * 0.9;

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06B6D4';
        ctx.fillStyle = '#082F49';
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = Math.max(1, r * 0.15);

        ctx.beginPath();
        ctx.rect(-panelWidth / 2 - coreR * 0.2, -panelHeight / 2, panelWidth / 2 - coreR * 0.5, panelHeight);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.rect(coreR * 0.7, -panelHeight / 2, panelWidth / 2 - coreR * 0.5, panelHeight);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
        ctx.lineWidth = Math.max(0.5, r * 0.1);
        const lineCount = 3;
        const segmentW = (panelWidth / 2 - coreR * 0.5) / (lineCount + 1);

        for (let i = 1; i <= lineCount; i++) {
            let lx = -panelWidth / 2 - coreR * 0.2 + segmentW * i;
            ctx.beginPath(); ctx.moveTo(lx, -panelHeight / 2); ctx.lineTo(lx, panelHeight / 2); ctx.stroke();
            let rx = coreR * 0.7 + segmentW * i;
            ctx.beginPath(); ctx.moveTo(rx, -panelHeight / 2); ctx.lineTo(rx, panelHeight / 2); ctx.stroke();
        }

        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.4, '#94A3B8');
        coreGrad.addColorStop(0.8, '#334155');
        coreGrad.addColorStop(1, '#0F172A');

        ctx.shadowBlur = 15;
        ctx.shadowColor = '#22D3EE';
        ctx.beginPath();
        ctx.arc(0, 0, coreR, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#E0F2FE';
        ctx.fill();

        ctx.restore();
    }

    function drawOceanJellyfish(ctx, jelly, time) {
        ctx.save();
        const scale = 1 + Math.sin(time * 3 + jelly.phase) * 0.05;
        const yOffset = Math.sin(time * 0.5 + jelly.phase) * jelly.size * 0.8;

        ctx.translate(jelly.x, jelly.y + yOffset);
        ctx.rotate(10 * Math.PI / 180);
        ctx.scale(scale, scale);

        ctx.fillStyle = 'rgba(244, 114, 182, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, jelly.size, Math.PI, Math.PI * 2);
        ctx.quadraticCurveTo(jelly.size, jelly.size * 0.2, 0, jelly.size * 0.2);
        ctx.quadraticCurveTo(-jelly.size, jelly.size * 0.2, -jelly.size, 0);
        ctx.fill();

        ctx.fillStyle = 'rgba(147, 51, 234, 0.5)';
        ctx.beginPath(); ctx.arc(-jelly.size * 0.4, -jelly.size * 0.4, jelly.size * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(jelly.size * 0.3, -jelly.size * 0.6, jelly.size * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(jelly.size * 0.5, -jelly.size * 0.3, jelly.size * 0.12, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
        ctx.lineWidth = jelly.size * 0.08;
        ctx.lineCap = 'round';

        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * jelly.size * 0.3, jelly.size * 0.1);
            let cx = i * jelly.size * 0.3;
            let cy = jelly.size * 0.1;
            for (let j = 1; j <= 4; j++) {
                const wave = Math.sin(time * 2 + jelly.phase + j) * jelly.size * 0.2;
                ctx.quadraticCurveTo(cx + wave, cy + jelly.size * 0.3, cx, cy + jelly.size * 0.6);
                cy += jelly.size * 0.6;
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawOceanCoral(ctx, coral, time, seabedY) {
        ctx.save();
        ctx.translate(coral.x, seabedY);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const baseColor = coral.color;

        if (coral.type === 'finger') {
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = coral.size * 0.3;
            const numFingers = 3;
            for (let i = 0; i < numFingers; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const angleOffset = (i - (numFingers - 1) / 2) * 0.4;
                const length = coral.size * (0.8 + Math.sin(coral.x + i) * 0.2);
                const endX = Math.sin(angleOffset) * length;
                const endY = -Math.cos(angleOffset) * length;
                const sway = Math.sin(time * 2 + coral.x + i) * length * 0.1;
                ctx.quadraticCurveTo(endX * 0.5 + sway, endY * 0.5, endX, endY);
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(0, 0, coral.size * 0.8, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = coral.size * 0.08;
            ctx.beginPath(); ctx.arc(0, 0, coral.size * 0.5, Math.PI, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, coral.size * 0.25, Math.PI, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }

    function drawBackgroundDecorations(c, w, h, skinKey, time, state) {
        if (!state.initialized || state.lastW !== w || state.lastH !== h) {
            initBgAnimState(state, w, h);
        }

        c.save();
        if (skinKey === 'default') {
            // Deep Space
            state.deepSpace.planets.forEach(p => {
                if (p.type === 'large') {
                    c.save();
                    c.translate(p.x, p.y);
                    c.rotate(-Math.PI / 6);

                    c.save();
                    c.beginPath(); c.rect(-p.r * 3, -p.r * 3, p.r * 6, p.r * 3); c.clip();
                    c.beginPath(); c.ellipse(0, 0, p.r * 1.8, p.r * 0.4, 0, 0, Math.PI * 2);
                    c.lineWidth = p.r * 0.15; c.strokeStyle = 'rgba(230, 210, 180, 0.4)'; c.stroke();
                    c.beginPath(); c.ellipse(0, 0, p.r * 2.2, p.r * 0.5, 0, 0, Math.PI * 2);
                    c.lineWidth = p.r * 0.08; c.strokeStyle = 'rgba(210, 190, 160, 0.4)'; c.stroke();
                    c.restore();

                    c.beginPath(); c.arc(0, 0, p.r, 0, Math.PI * 2);
                    const pg = c.createRadialGradient(0, 0, p.r * 0.2, 0, 0, p.r);
                    pg.addColorStop(0, p.color1); pg.addColorStop(1, p.color2);
                    c.fillStyle = pg; c.fill();

                    c.save();
                    c.beginPath(); c.rect(-p.r * 3, 0, p.r * 6, p.r * 3); c.clip();
                    c.beginPath(); c.ellipse(0, 0, p.r * 1.8, p.r * 0.4, 0, 0, Math.PI * 2);
                    c.lineWidth = p.r * 0.15; c.strokeStyle = 'rgba(230, 210, 180, 0.4)'; c.stroke();
                    c.beginPath(); c.ellipse(0, 0, p.r * 2.2, p.r * 0.5, 0, 0, Math.PI * 2);
                    c.lineWidth = p.r * 0.08; c.strokeStyle = 'rgba(210, 190, 160, 0.4)'; c.stroke();
                    c.restore();

                    c.beginPath(); c.ellipse(0, p.r * 0.1, p.r * 1.8, p.r * 0.4, 0, Math.PI, Math.PI * 2);
                    c.lineWidth = p.r * 0.1; c.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    c.globalCompositeOperation = 'source-atop'; c.stroke(); c.globalCompositeOperation = 'source-over';
                    c.restore();
                } else if (p.type === 'moon') {
                    const grad = c.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r);
                    grad.addColorStop(0, p.color1);
                    grad.addColorStop(0.7, p.color2);
                    grad.addColorStop(1, '#000000');

                    c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    c.fillStyle = grad;
                    c.shadowColor = p.color1;
                    c.shadowBlur = 15;
                    c.fill();
                    c.shadowBlur = 0;

                    c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    c.lineWidth = 2;
                    c.strokeStyle = `rgba(255, 255, 255, 0.2)`;
                    c.stroke();

                    c.save();
                    c.clip();
                    c.fillStyle = 'rgba(0,0,0,0.15)';
                    c.beginPath(); c.arc(p.x - p.r * 0.2, p.y - p.r * 0.2, p.r * 0.15, 0, Math.PI * 2); c.fill();
                    c.beginPath(); c.arc(p.x + p.r * 0.3, p.y + p.r * 0.1, p.r * 0.2, 0, Math.PI * 2); c.fill();
                    c.beginPath(); c.arc(p.x + p.r * 0.1, p.y + p.r * 0.4, p.r * 0.1, 0, Math.PI * 2); c.fill();
                    c.beginPath(); c.arc(p.x - p.r * 0.4, p.y + p.r * 0.1, p.r * 0.12, 0, Math.PI * 2); c.fill();

                    c.fillStyle = 'rgba(255,255,255,0.2)';
                    c.beginPath(); c.arc(p.x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.12, 0, Math.PI * 2); c.fill();
                    c.beginPath(); c.arc(p.x + p.r * 0.25, p.y + p.r * 0.05, p.r * 0.15, 0, Math.PI * 2); c.fill();
                    c.beginPath(); c.arc(p.x + p.r * 0.05, p.y + p.r * 0.35, p.r * 0.08, 0, Math.PI * 2); c.fill();
                    c.beginPath(); c.arc(p.x - p.r * 0.45, p.y + p.r * 0.05, p.r * 0.1, 0, Math.PI * 2); c.fill();

                    const shadowGrad = c.createLinearGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, p.x + p.r * 0.7, p.y + p.r * 0.7);
                    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    shadowGrad.addColorStop(0.35, 'rgba(0,0,0,0.05)');
                    shadowGrad.addColorStop(0.65, 'rgba(0,0,0,0.85)');
                    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.98)');
                    c.fillStyle = shadowGrad;
                    c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
                    c.restore();

                    if (p.hasSatellite) {
                        c.save();
                        c.translate(p.x, p.y);
                        c.rotate(-Math.PI / 8);

                        const orbitA = p.r * 1.5;
                        const orbitB = p.r * 0.2;
                        const satSpeed = 0.5;
                        const satAngle = time * satSpeed;

                        const satX = Math.cos(satAngle) * orbitA;
                        const satY = Math.sin(satAngle) * orbitB;
                        const satR = p.r * 0.12;

                        const isBehind = Math.sin(satAngle) < 0;

                        if (!isBehind) {
                            drawSatellite(c, satX, satY, satR, satAngle);
                        } else {
                            c.save();
                            c.beginPath();
                            c.rect(-p.r * 5, -p.r * 5, p.r * 10, p.r * 10);
                            c.arc(0, 0, p.r, 0, Math.PI * 2, true);
                            c.clip();
                            drawSatellite(c, satX, satY, satR, satAngle);
                            c.restore();
                        }
                        c.restore();
                    }
                } else {
                    const grad = c.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r);
                    grad.addColorStop(0, p.color1);
                    grad.addColorStop(0.7, p.color2);
                    grad.addColorStop(1, '#000000');

                    c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    c.fillStyle = grad;
                    c.shadowColor = p.color1;
                    c.shadowBlur = 15;
                    c.fill();
                    c.shadowBlur = 0;

                    c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    c.lineWidth = 2;
                    c.strokeStyle = `rgba(255, 255, 255, 0.2)`;
                    c.stroke();

                    c.save();
                    c.clip();
                    for (let i = -0.8; i < 0.8; i += 0.2) {
                        c.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.1})`;
                        c.beginPath();
                        c.ellipse(p.x, p.y + p.r * i, p.r * 1.5, p.r * (0.05 + Math.random() * 0.1), 0, 0, Math.PI * 2);
                        c.fill();
                    }
                    for (let i = -0.6; i < 0.8; i += 0.3) {
                        c.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.1})`;
                        c.beginPath();
                        c.ellipse(p.x, p.y + p.r * i, p.r * 1.5, p.r * (0.04 + Math.random() * 0.08), 0, 0, Math.PI * 2);
                        c.fill();
                    }
                    c.fillStyle = 'rgba(0,0,0,0.1)';
                    c.beginPath(); c.ellipse(p.x + p.r * 0.3, p.y - p.r * 0.1, p.r * 0.15, p.r * 0.08, 0, 0, Math.PI * 2); c.fill();

                    const shadowGrad = c.createLinearGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, p.x + p.r * 0.7, p.y + p.r * 0.7);
                    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    shadowGrad.addColorStop(0.35, 'rgba(0,0,0,0.05)');
                    shadowGrad.addColorStop(0.65, 'rgba(0,0,0,0.85)');
                    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.98)');
                    c.fillStyle = shadowGrad;
                    c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
                    c.restore();
                }
            });

            c.fillStyle = '#FFF';
            state.deepSpace.stars.forEach(s => {
                s.y += s.vy; if (s.y > h) s.y = 0;
                c.globalAlpha = 0.5 + Math.sin(time * 2 + s.x) * 0.5;
                c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
            });
        } else if (skinKey === 'cherryBlossom') {
            state.cherryBlossom.petals.forEach(p => {
                p.x += p.vx + Math.sin(time + p.s) * 0.5;
                p.y += p.vy;
                p.angle += p.spin;

                if (p.y > h + 10) {
                    p.y = -10;
                    p.x = Math.random() * w;
                }
                if (p.x > w + 10) p.x = -10;
                else if (p.x < -10) p.x = w + 10;

                c.save();
                c.translate(p.x, p.y);
                c.rotate(p.angle);

                c.fillStyle = 'rgba(255, 183, 197, 0.8)';
                c.beginPath();
                c.moveTo(0, -p.s);
                c.bezierCurveTo(p.s, -p.s, p.s, p.s, 0, p.s);
                c.bezierCurveTo(-p.s, p.s, -p.s, -p.s, 0, -p.s);
                c.fill();
                c.restore();
            });
        } else if (skinKey === 'deepOcean') {
            // Ocean Background
            const _r = Math.min(w, h) * 0.35;

            c.fillStyle = 'rgba(255, 255, 255, 0.2)';
            state.ocean.bubbles.forEach(b => {
                b.x += Math.sin(time * 2 + b.y * 0.01);
                b.y += b.vy;
                if (b.y < -10) {
                    b.y = h + 10;
                    b.x = Math.random() * w;
                }
                c.beginPath(); c.arc(b.x, b.y, b.s, 0, Math.PI * 2); c.fill();
            });

            state.ocean.largeFishes.forEach(f => {
                drawOceanFish(c, f, time, w);
                f.x += f.speed;
                if (f.speed > 0 && f.x > w + f.size * 3) {
                    f.x = -f.size * 3;
                    f.y = h * 0.2 + Math.random() * h * 0.4;
                } else if (f.speed < 0 && f.x < -f.size * 3) {
                    f.x = w + f.size * 3;
                    f.y = h * 0.2 + Math.random() * h * 0.4;
                }
            });

            state.ocean.jellyfishes.forEach(j => drawOceanJellyfish(c, j, time));

            const maxSeabedH = h * 0.15;
            const sandGrad = c.createLinearGradient(0, h * 0.8, 0, h);
            sandGrad.addColorStop(0, '#D4A373');
            sandGrad.addColorStop(1, '#8B5A2B');
            c.fillStyle = sandGrad;

            c.beginPath();
            c.moveTo(0, h);
            for (let x = 0; x <= w; x += 20) {
                c.lineTo(x, getOceanSeabedY(x, w, h));
            }
            c.lineTo(w, getOceanSeabedY(w, w, h));
            c.lineTo(w, h);
            c.fill();

            state.ocean.corals.forEach(coral => {
                if (coral.layer === 'bg') drawOceanCoral(c, coral, time, getOceanSeabedY(coral.x, w, h));
            });

            c.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            c.lineWidth = _r * 0.08;
            c.lineCap = 'round';
            state.ocean.kelps.forEach((kelp, i) => {
                const kelpBaseY = getOceanSeabedY(kelp.x, w, h) + _r * 0.1;
                c.beginPath();
                c.moveTo(kelp.x, kelpBaseY);
                let cx = kelp.x;
                let cy = kelpBaseY;
                const kelpH = h * kelp.hRatio;
                for (let j = 0; j < 5; j++) {
                    const wave = Math.sin(time * 1.5 + i + j) * _r * 0.15;
                    c.quadraticCurveTo(cx + wave, cy - kelpH * 0.1, cx, cy - kelpH * 0.2);
                    cy -= kelpH * 0.2;
                }
                c.stroke();
            });

            state.ocean.crabs.forEach(crab => {
                drawOceanCrab(c, crab, time, w, h);
                crab.x += crab.speed;
                if (crab.speed > 0 && crab.x > crab.cx + crab.range) crab.speed *= -1;
                if (crab.speed < 0 && crab.x < crab.cx - crab.range) crab.speed *= -1;
            });

            state.ocean.corals.forEach(coral => {
                if (coral.layer === 'fg') drawOceanCoral(c, coral, time, getOceanSeabedY(coral.x, w, h));
            });

        } else if (skinKey === 'goldenAge') {
            // Golden Age - luxurious, glowing background
            state.goldenAge.beams.forEach((beam, i) => {
                const alpha = (Math.sin(time * beam.speed + beam.phase) + 1) / 2 * 0.15;
                const grad = c.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, `rgba(255, 215, 0, 0)`);
                grad.addColorStop(0.5, `rgba(255, 215, 0, ${alpha})`);
                grad.addColorStop(1, `rgba(255, 215, 0, 0)`);
                c.fillStyle = grad;

                const beamX = beam.x + Math.sin(time * 0.5 + i) * 50;
                c.fillRect(beamX, 0, beam.w, h);
            });

            state.goldenAge.sparks.forEach(s => {
                s.x += s.vx + Math.sin(time + s.phase) * 0.5;
                s.y += s.vy;

                if (s.y < -10) {
                    s.y = h + 10;
                    s.x = Math.random() * w;
                }

                c.beginPath();
                c.arc(s.x, s.y, s.s, 0, Math.PI * 2);
                c.fillStyle = 'rgba(255, 215, 0, 0.8)';
                c.shadowColor = '#FFA500';
                c.shadowBlur = 10;
                c.fill();
                c.shadowBlur = 0;
            });

            // Add a subtle vignette for the luxurious feel
            const vig = c.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, 'rgba(0,0,0,0.5)');
            c.fillStyle = vig;
            c.fillRect(0, 0, w, h);

        } else if (skinKey === 'cyberMatrix') {
            // Cyberpunk
            state.cyberpunk.buildings.forEach((b, index) => {
                c.fillStyle = '#0F172A';
                c.fillRect(b.x, h - b.h, b.w, b.h);

                if (b.isOutside) {
                    c.fillStyle = '#1E293B';
                    const beamColor = b.windows[0].color;
                    c.save();
                    c.globalCompositeOperation = 'screen';
                    const beamStartX = b.x + b.w * 0.5;
                    const beamStartY = h - b.h;
                    const beamLength = h * 0.8;
                    const beamAlpha = 0.3 + Math.sin(time * 5 + index) * 0.15;
                    const swingAngle = Math.sin(time * 1.5 + index * 0.8) * (Math.PI / 6);
                    c.translate(beamStartX, beamStartY);
                    c.rotate(swingAngle);

                    const gradient = c.createLinearGradient(0, 0, 0, -beamLength);
                    gradient.addColorStop(0, beamColor);
                    gradient.addColorStop(1, 'transparent');
                    c.fillStyle = gradient;
                    c.globalAlpha = beamAlpha;
                    c.beginPath();
                    c.moveTo(-b.w * 0.1, 0);
                    c.lineTo(b.w * 0.1, 0);
                    c.lineTo(b.w * 0.8, -beamLength);
                    c.lineTo(-b.w * 0.8, -beamLength);
                    c.fill();
                    c.restore();

                    c.strokeStyle = beamColor;
                    c.lineWidth = 2;
                    c.shadowColor = beamColor;
                    c.shadowBlur = 10;
                    c.strokeRect(b.x, h - b.h, b.w, b.h);
                    c.shadowBlur = 0;
                } else {
                    const edgeColor = b.windows[0].color;
                    c.strokeStyle = edgeColor;
                    c.lineWidth = 1;
                    c.globalAlpha = 0.6;
                    c.shadowColor = edgeColor;
                    c.shadowBlur = 5;
                    c.strokeRect(b.x, h - b.h, b.w, b.h);
                    c.shadowBlur = 0;
                    c.globalAlpha = 1.0;
                }

                c.globalAlpha = 0.8;
                b.windows.forEach(win => {
                    c.fillStyle = win.color;
                    if (b.isOutside && Math.random() > 0.5) {
                        c.shadowColor = win.color; c.shadowBlur = 5;
                        c.fillRect(b.x + win.wx * (b.w - 12) + 6, h - b.h + win.wy * (b.h - 20) + 10, 6, 12);
                        c.shadowBlur = 0;
                    } else {
                        c.fillRect(b.x + win.wx * (b.w - 8) + 4, h - b.h + win.wy * (b.h - 8) + 4, 3, 6);
                    }
                });
                c.globalAlpha = 1;
            });

            state.cyberpunk.cars.forEach(car => {
                car.x += car.speed;
                if (car.speed > 0 && car.x > w + 100) car.x = -100;
                if (car.speed < 0 && car.x < -100) car.x = w + 100;

                c.save();
                c.translate(car.x, car.y);
                const isRight = car.speed > 0;
                if (!isRight) c.scale(-1, 1);
                c.scale(car.size, car.size);

                c.shadowColor = car.color;
                c.shadowBlur = 10;

                switch (car.type) {
                    case 'sport':
                        c.fillStyle = '#1E293B';
                        c.beginPath();
                        c.moveTo(-20, 5); c.lineTo(15, 5); c.quadraticCurveTo(25, 5, 20, -5);
                        c.lineTo(5, -10); c.lineTo(-10, -10); c.lineTo(-20, -5);
                        c.closePath(); c.fill();
                        c.fillStyle = car.color; c.fillRect(-15, 2, 8, 3);
                        c.fillStyle = '#E2E8F0'; c.beginPath(); c.moveTo(-5, -5); c.lineTo(0, -9); c.lineTo(15, -5); c.closePath(); c.fill();
                        break;
                    case 'cargo':
                        c.fillStyle = '#334155'; c.fillRect(-25, -10, 30, 15);
                        c.fillStyle = '#1E293B'; c.beginPath(); c.moveTo(5, 5); c.lineTo(20, 5); c.lineTo(15, -5); c.lineTo(5, -5); c.closePath(); c.fill();
                        c.fillStyle = car.color; c.fillRect(-20, -5, 20, 2);
                        break;
                    case 'police':
                        c.fillStyle = '#0F172A';
                        c.beginPath(); c.moveTo(-15, 5); c.lineTo(15, 5); c.lineTo(10, -5); c.lineTo(-10, -5); c.closePath(); c.fill();
                        c.fillStyle = '#E2E8F0'; c.fillRect(-5, -5, 10, 10);
                        const sirenColor = Math.floor(time * 5) % 2 === 0 ? '#EF4444' : '#3B82F6';
                        c.shadowColor = sirenColor; c.fillStyle = sirenColor;
                        c.beginPath(); c.arc(0, -7, 3, 0, Math.PI * 2); c.fill();
                        break;
                }

                c.shadowColor = car.color; c.fillStyle = car.color;
                c.beginPath(); c.arc(isRight ? 18 : 15, 3, 2, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#EF4444'; c.shadowColor = '#EF4444';
                c.beginPath(); c.arc(-18, 3, 2, 0, Math.PI * 2); c.fill();

                c.shadowBlur = 0;
                c.restore();
            });
        }
        c.restore();
    }

    // ===== 知识提示 =====
    function showKnowledgeTip(tipKey) {
        if (!elKnowledgeTip || !elKnowledgeText) return;
        elKnowledgeText.textContent = GameI18N.t(tipKey);
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
        if (elNodes) elNodes.textContent = remainingNodes;
    }

    // ===== 渲染 =====
    function gameLoop() {
        if (!active) return;
        update();
        draw();

        const skinDetail = document.getElementById('chordSkinDetailOverlay');
        if (skinDetail && skinDetail.style.display === 'flex') {
            drawSkinPreviewInLoop();
        }

        animId = requestAnimationFrame(gameLoop);
    }

    function update() {
        if (!levelComplete && !nextBallReady && performance.now() >= nextBallReadyAt) {
            nextBallReady = true;
        }
        balls.forEach(updateBall);
        nodes.forEach(n => { if (n.alive) n.pulse += 0.05; });
        updateParticles();
        if (feedbackTimer > 0) feedbackTimer--;
    }

    function draw() {
        if (!ctx) return;
        const config = getSkinConfig();
        const activeSkinId = equippedSkins.skin || 'default';

        if (config.bgStops) {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 3);
            config.bgStops.forEach(s => grad.addColorStop(s.stop, s.color));
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = config.bgDark;
        }
        ctx.fillRect(0, 0, W, H);

        const t = performance.now() / 1000;
        drawBackgroundDecorations(ctx, W, H, activeSkinId, t, bgAnimState);

        drawCircle();
        drawChords(config);
        drawNodes(config);
        drawPrediction();
        drawBallTrails();
        drawBalls();
        drawReadyBall();
        drawParticles();
        drawFeedback();
        if (isDragging && dragPos) drawAimIndicator();
    }

    function drawCircle() {
        ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, TAU);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 6; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 2; ctx.stroke();
        // 圆心
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.fill();
    }

    function drawChords(config) {
        chords.forEach(c => {
            if (!c.active) return;
            ctx.beginPath(); ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2);

            const grad = ctx.createLinearGradient(c.x1, c.y1, c.x2, c.y2);
            grad.addColorStop(0, config.beamGradientStart);
            grad.addColorStop(1, config.beamGradientEnd);

            ctx.strokeStyle = grad;
            ctx.shadowColor = config.beamGlow;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // 弦端点
            [{ x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 }].forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU);
                ctx.fillStyle = config.beamGradientStart; ctx.fill();
            });
        });
    }

    function drawNodes(config) {
        nodes.forEach(n => {
            if (!n.alive) return;
            const pulse = Math.sin(n.pulse) * 0.3 + 1;

            // 光晕
            ctx.beginPath(); ctx.arc(n.x, n.y, NODE_RADIUS * 1.5 * pulse, 0, TAU);
            ctx.fillStyle = config.nodeGlow;
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1;

            // 节点
            ctx.beginPath(); ctx.arc(n.x, n.y, NODE_RADIUS, 0, TAU);
            ctx.fillStyle = config.nodeOuter;
            ctx.shadowColor = config.nodeGlow;
            ctx.shadowBlur = 10;
            ctx.fill();

            // 高光 (内层)
            ctx.beginPath(); ctx.arc(n.x, n.y, NODE_RADIUS * 0.4, 0, TAU);
            ctx.fillStyle = config.nodeInner;
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    }

    function drawPrediction() {
        if (prediction.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(prediction[0].x, prediction[0].y);
        for (let i = 1; i < prediction.length; i++) {
            ctx.lineTo(prediction[i].x, prediction[i].y);
        }
        ctx.strokeStyle = 'rgba(96,165,250,0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawBallTrails() {
        const ballConf = getBallSkinConfig();
        balls.forEach(b => {
            if (b.trail.length < 2) return;

            if (ballConf.trailType === 'line') {
                ctx.beginPath();
                ctx.moveTo(b.trail[0].x, b.trail[0].y);
                for (let i = 1; i < b.trail.length; i++) {
                    ctx.lineTo(b.trail[i].x, b.trail[i].y);
                }

                // 给纯白线条加上透明度渐变，看起来更自然
                const grad = ctx.createLinearGradient(b.trail[0].x, b.trail[0].y, b.x, b.y);
                grad.addColorStop(0, 'rgba(255,255,255,0)');
                grad.addColorStop(1, ballConf.trailColor);

                ctx.strokeStyle = grad;
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.stroke();
            } else if (ballConf.trailType === 'particle') {
                // Fireball: 绘制散落的圆点
                for (let i = 0; i < b.trail.length; i += 2) {
                    const pt = b.trail[i];
                    const alpha = i / b.trail.length;
                    ctx.beginPath();
                    ctx.arc(pt.x + (Math.random() - 0.5) * 4, pt.y + (Math.random() - 0.5) * 4, 3 * alpha, 0, TAU);
                    ctx.fillStyle = `rgba(249,115,22,${alpha})`;
                    ctx.fill();
                }
            } else if (ballConf.trailType === 'diamond') {
                // Frost Core: 菱形
                for (let i = 0; i < b.trail.length; i += 3) {
                    const pt = b.trail[i];
                    const alpha = i / b.trail.length;
                    const size = 3 * alpha;
                    ctx.fillStyle = `rgba(186,230,253,${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(pt.x, pt.y - size);
                    ctx.lineTo(pt.x + size, pt.y);
                    ctx.lineTo(pt.x, pt.y + size);
                    ctx.lineTo(pt.x - size, pt.y);
                    ctx.fill();
                }
            } else if (ballConf.trailType === 'mist') {
                // Dark Matter: 粗大且模糊的迷雾，优化头部透明度，变短
                ctx.beginPath();
                ctx.moveTo(b.trail[0].x, b.trail[0].y);
                for (let i = 1; i < b.trail.length; i++) {
                    ctx.lineTo(b.trail[i].x, b.trail[i].y);
                }
                const grad = ctx.createLinearGradient(b.trail[0].x, b.trail[0].y, b.x, b.y);
                grad.addColorStop(0, 'rgba(139,92,246,0)'); // 尾端完全透明
                grad.addColorStop(1, ballConf.trailColor);   // 靠近球端

                ctx.strokeStyle = grad;
                ctx.lineWidth = 8;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.shadowColor = '#8b5cf6';
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (ballConf.trailType === 'zigzag') {
                // Lightning: 折线，变短变尖锐
                ctx.beginPath();
                ctx.moveTo(b.trail[0].x, b.trail[0].y);
                for (let i = 1; i < b.trail.length; i++) {
                    const pt = b.trail[i];
                    // 闪电抖动幅度，越靠近球抖动越大
                    const alpha = i / b.trail.length;
                    const offsetX = (Math.random() - 0.5) * 8 * alpha;
                    const offsetY = (Math.random() - 0.5) * 8 * alpha;
                    ctx.lineTo(pt.x + offsetX, pt.y + offsetY);
                }
                const grad = ctx.createLinearGradient(b.trail[0].x, b.trail[0].y, b.x, b.y);
                grad.addColorStop(0, 'rgba(250,204,21,0)');
                grad.addColorStop(1, ballConf.trailColor);

                ctx.strokeStyle = grad;
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }
        });
    }

    function drawBalls() {
        const ballConf = getBallSkinConfig();
        balls.forEach(b => {
            const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 15);
            grad.addColorStop(0, ballConf.trailColor);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.beginPath(); ctx.arc(b.x, b.y, 15, 0, TAU);
            ctx.fillStyle = grad; ctx.fill();

            ctx.beginPath();
            ctx.arc(b.x, b.y, 6, 0, TAU);
            ctx.fillStyle = ballConf.color;
            ctx.shadowColor = ballConf.glow;
            ctx.shadowBlur = 15;
            ctx.fill();

            if (equippedSkins.ball === 'darkMatter') {
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, 2, 0, TAU);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
            ctx.shadowBlur = 0;
        });
    }

    function drawReadyBall() {
        if (!nextBallReady || levelComplete) return;
        const ballConf = getBallSkinConfig();
        const px = cx;
        const py = cy - R - 28;

        const grad = ctx.createRadialGradient(px, py, 0, px, py, 16);
        grad.addColorStop(0, ballConf.trailColor);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(px, py, 16, 0, TAU);
        ctx.fillStyle = grad; ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 6, 0, TAU);
        ctx.fillStyle = ballConf.color;
        ctx.shadowColor = ballConf.glow;
        ctx.shadowBlur = 10;
        ctx.fill();

        if (equippedSkins.ball === 'darkMatter') {
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.beginPath(); ctx.arc(px - 2, py - 2, 2, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life; ctx.fill(); ctx.globalAlpha = 1;
        });
    }

    function drawFeedback() {
        if (feedbackTimer <= 0 || !feedbackText) return;
        const alpha = Math.min(1, feedbackTimer / 25);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = feedbackColor;
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(feedbackText, cx, 40);
        ctx.restore();
    }

    function drawAimIndicator() {
        const launch = getLaunchState(launchStartAngle, launchAngle);
        const sx = launch.startX;
        const sy = launch.startY;

        ctx.beginPath(); ctx.arc(sx, sy, 8, 0, TAU);
        ctx.fillStyle = '#22C55E'; ctx.fill();

        const arrowLen = 30;
        const ex = sx + launch.dirX * arrowLen;
        const ey = sy + launch.dirY * arrowLen;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
        ctx.strokeStyle = '#22C55E'; ctx.lineWidth = 3; ctx.stroke();

        // 箭头尖
        ctx.beginPath(); ctx.arc(ex, ey, 4, 0, TAU);
        ctx.fillStyle = '#22C55E'; ctx.fill();
    }

    return { show, hide };
})();
