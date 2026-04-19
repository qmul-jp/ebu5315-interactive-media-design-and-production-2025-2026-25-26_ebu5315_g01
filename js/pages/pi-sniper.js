/**
 * pi-sniper.js - 圆周狙击游戏（Pi Sniper）
 * 核心玩法：在单位圆上拖拽旋转瞄准线到目标角度，精准射击
 *
 * 功能模块：Boss战、道具系统、成就系统、练习报告、射击解析、公式卡片、皮肤系统
 */
const PiSniper = (() => {
    'use strict';

    // ===== 常量 =====
    const PI = Math.PI;
    const TAU = PI * 2;
    const DEG = 180 / PI;
    const GAME_DURATION = 60; // 秒
    const FRENZY_THRESHOLD = 5; // 连击5次进入Frenzy

    // ===== 状态 =====
    let canvas, ctx, W, H;
    let active = false;
    let running = false;
    let animId = null;

    // 游戏数据
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let timeLeft = GAME_DURATION;
    let timerInterval = null;
    let frenzy = false;

    // 瞄准
    let aimAngle = 0; // 当前瞄准角度（弧度，从正x轴逆时针）
    let isDragging = false;

    // 目标
    let targetAngle = 0;
    let targetPulse = 0;

    // 粒子
    let particles = [];

    // 反馈文字
    let feedbackText = '';
    let feedbackTimer = 0;
    let feedbackColor = '#22C55E';

    // 知识提示
    let knowledgeTips = [];
    let currentTipIndex = 0;
    let tipTimer = 0;

    // 难度
    let difficulty = 1; // 随时间递增

    // Boss 状态
    let boss = null; // null | { type: 'piGuardian'|'anglePhantom', hp: number, maxHp: number, timer: number, moveSpeed: number, angleStart: number, angleSpan: number, lastHitTime: number, hitCount: number, shieldHits: number }
    let bossWarningTimer = 0;
    let doubleScoreTimer = 0; // 双倍得分剩余帧数
    let shotCount = 0; // 本局射击次数（用于Boss触发）

    // 道具状态
    let droppedPowerups = []; // { type, x, y, life, pulse }
    let activePowerup = null; // null | { type, timer }

    // 成就状态
    let achievements = {}; // 从 localStorage 加载
    let achievementQueue = []; // 待显示的成就通知
    let achievementNotifyTimer = 0;
    let achievementNotifyText = '';

    // 本局统计
    let stats = {
        totalShots: 0, perfects: 0, excellents: 0,
        goods: 0, hits: 0, misses: 0,
        angleRangeHits: {}, // key: "0-30", value: {total, hit}
        bossDefeated: 0,
        frenzyCount: 0,
    };

    // 射击解析
    let shotAnalysis = null; // { diffDeg, aimDeg, targetDeg, cos, sin, radian, timer }

    // 公式卡片
    let formulaCard = null; // null | { open: true, type: 'arcLength'|'sectorArea'|'radian', timer: 0 }

    // 皮肤系统
    let skin = {
        crosshair: 'default', // 'default'|'circle'|'laser'|'bow'
        lineColor: 'green',   // 'green'|'gold'|'blue'|'purple'|'rainbow'
        circleStyle: 'standard', // 'standard'|'neon'|'minimal'|'retro'
        particle: 'standard', // 'standard'|'star'|'fire'|'electric'
        background: 'deepSpace', // 'deepSpace'|'ocean'|'forest'|'cyberpunk'
    };

    // 背景装饰动画状态
    let bgAnimState = {
        initialized: false,
        lastW: 0, lastH: 0,
        deepSpace: { stars: [] },
        ocean: { bubbles: [], fishes: [] },
        forest: { fireflies: [], trees: [], cabin: null },
        cyberpunk: { buildings: [], cars: [] }
    };

    // 成就相关辅助变量
    let consecutivePerfects = 0;
    let hadComboReset = false;
    let lastShotWasPerfect = false;
    let sessionUnlocked = {};

    // ===== 成就定义 =====
    const ACHIEVEMENT_DEFS = {
        firstPerfect: {
            name: 'sniper.achievement.firstPerfect',
            check: (s) => s.stats.perfects >= 1,
            type: 'once'
        },
        sniper: {
            name: 'sniper.achievement.sniper',
            check: (s) => s.stats.perfects >= 10,
            type: 'once'
        },
        godlike: {
            name: 'sniper.achievement.godlike',
            check: (s) => s.stats.perfects >= 20,
            type: 'once'
        },
        zeroError: {
            name: 'sniper.achievement.zeroError',
            check: (s) => s.consecutivePerfects > 0 && s.consecutivePerfects % 10 === 0,
            type: 'repeatable'
        },
        combo5: {
            name: 'sniper.achievement.combo5',
            check: (s) => s.combo >= 5,
            type: 'once'
        },
        combo15: {
            name: 'sniper.achievement.combo15',
            check: (s) => s.combo >= 15,
            type: 'once'
        },
        combo30: {
            name: 'sniper.achievement.combo30',
            check: (s) => s.combo >= 30,
            type: 'once'
        },
        bossHunter: {
            name: 'sniper.achievement.bossHunter',
            check: (s) => s.stats.bossDefeated >= 1,
            type: 'once'
        },
        bossHarvester: {
            name: 'sniper.achievement.bossHarvester',
            check: (s) => (s.lt ? (s.lt.totalBossDefeated || 0) : 0) + s.stats.bossDefeated >= 10,
            type: 'once'
        },
        timeMaster: {
            name: 'sniper.achievement.timeMaster',
            check: (s) => s.timeLeft === 1 && s.lastShotWasPerfect,
            type: 'once_per_game'
        },
        comeback: {
            name: 'sniper.achievement.comeback',
            check: (s) => s.combo >= 10 && s.hadComboReset,
            type: 'once'
        },
        frenzyRegular: {
            name: 'sniper.achievement.frenzyRegular',
            check: (s) => s.stats.frenzyCount >= 3,
            type: 'once'
        },
    };

    // ===== 皮肤解锁条件 =====
    const SKIN_UNLOCK_CONDITIONS = {
        crosshair: {
            default: { unlocked: true },
            circle: { unlocked: true },
            laser: { condition: 'singlePerfect20', desc: 'sniper.skin.laserDesc' },
            bow: { condition: 'totalPerfect50', desc: 'sniper.skin.bowDesc' },
        },
        lineColor: {
            green: { unlocked: true },
            gold: { unlocked: true },
            blue: { unlocked: true },
            purple: { condition: 'totalBoss5', desc: 'sniper.skin.purpleDesc' },
            rainbow: { condition: 'totalScore10000', desc: 'sniper.skin.rainbowDesc' },
        },
        circleStyle: {
            standard: { unlocked: true },
            neon: { condition: 'firstPerfect', desc: 'sniper.skin.neonDesc' },
            minimal: { unlocked: true },
            retro: { condition: 'totalGames10', desc: 'sniper.skin.retroDesc' },
        },
        particle: {
            standard: { unlocked: true },
            star: { condition: 'firstPerfect', desc: 'sniper.skin.starDesc' },
            fire: { condition: 'combo30', desc: 'sniper.skin.fireDesc' },
            electric: { condition: 'totalBoss3', desc: 'sniper.skin.electricDesc' },
        },
        background: {
            deepSpace: { unlocked: true },
            ocean: { unlocked: true },
            forest: { unlocked: true },
            cyberpunk: { condition: 'totalGames20', desc: 'sniper.skin.cyberpunkDesc' },
        },
    };

    // ===== DOM 引用 =====
    let elScore, elCombo, elTime;
    let elStartOverlay, elEndOverlay, elFinalScore, elRecordBadge;
    let elKnowledgeTip, elKnowledgeText;

    // ===== 初始化 =====
    function init() {
        canvas = document.getElementById('sniperCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        elScore = document.getElementById('sniperScore');
        elCombo = document.getElementById('sniperCombo');
        elTime = document.getElementById('sniperTime');
        elStartOverlay = document.getElementById('sniperStartOverlay');
        elEndOverlay = document.getElementById('sniperEndOverlay');
        elFinalScore = document.getElementById('sniperFinalScore');
        elRecordBadge = document.getElementById('sniperRecordBadge');
        elKnowledgeTip = document.getElementById('sniperKnowledgeTip');
        elKnowledgeText = document.getElementById('sniperKnowledgeText');

        // 初始化知识提示
        initKnowledgeTips();

        // 加载持久化数据
        loadAchievements();
        loadSkin();

        // 绑定事件
        bindEvents();

        // 设置Canvas尺寸
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function initKnowledgeTips() {
        knowledgeTips = [
            GameI18N.t('sniper.knowledge.unitCircle'),
            GameI18N.t('sniper.knowledge.centralAngle'),
            GameI18N.t('sniper.knowledge.radian'),
            GameI18N.t('sniper.knowledge.arcLength'),
            GameI18N.t('sniper.knowledge.sectorArea'),
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
        // 开始按钮
        const startBtn = document.getElementById('sniperStartBtn');
        if (startBtn) startBtn.addEventListener('click', startGame);

        // 重新开始
        const restartBtn = document.getElementById('sniperRestartBtn');
        if (restartBtn) restartBtn.addEventListener('click', () => {
            elEndOverlay.style.display = 'none';
            startGame();
        });

        // 绑定成就、皮肤、记录面板开关事件
        const btnAchievement = document.getElementById('sniperAchievementBtn');
        const btnSkin = document.getElementById('sniperSkinBtn');
        const btnRecord = document.getElementById('sniperRecordBtn');

        const overlayAchievement = document.getElementById('sniperAchievementOverlay');
        const overlaySkin = document.getElementById('sniperSkinOverlay');
        const overlayRecord = document.getElementById('sniperRecordOverlay');

        const closeAchievement = document.getElementById('sniperAchievementCloseBtn');
        const closeSkin = document.getElementById('sniperSkinCloseBtn');
        const closeRecord = document.getElementById('sniperRecordCloseBtn');

        if (btnAchievement) btnAchievement.addEventListener('click', () => {
            if (elStartOverlay) elStartOverlay.style.display = 'none';
            if (overlayAchievement) {
                overlayAchievement.style.display = 'flex';
                renderAchievements();
            }
        });
        if (btnSkin) btnSkin.addEventListener('click', () => {
            if (elStartOverlay) elStartOverlay.style.display = 'none';
            if (overlaySkin) {
                overlaySkin.style.display = 'flex';
                // 每次打开都重置为第一个 Tab (准星)
                const skinTabs = document.querySelectorAll('#sniperSkinTabs .skin-tab');
                if (skinTabs.length > 0) {
                    skinTabs.forEach(t => t.classList.remove('active'));
                    skinTabs[0].classList.add('active');
                    renderSkins(skinTabs[0].dataset.target);
                } else {
                    renderSkins('crosshair');
                }
            }
        });
        if (btnRecord) btnRecord.addEventListener('click', () => {
            if (elStartOverlay) elStartOverlay.style.display = 'none';
            if (overlayRecord) {
                overlayRecord.style.display = 'flex';
                renderRecords();
            }
        });

        if (closeAchievement) closeAchievement.addEventListener('click', () => {
            if (overlayAchievement) overlayAchievement.style.display = 'none';
            if (elStartOverlay) elStartOverlay.style.display = 'flex';
        });
        if (closeSkin) closeSkin.addEventListener('click', () => {
            if (overlaySkin) overlaySkin.style.display = 'none';
            if (elStartOverlay) elStartOverlay.style.display = 'flex';
        });
        if (closeRecord) closeRecord.addEventListener('click', () => {
            if (overlayRecord) overlayRecord.style.display = 'none';
            if (elStartOverlay) elStartOverlay.style.display = 'flex';
        });

        // 详情弹窗关闭事件
        const closeAchievementDetail = document.getElementById('sniperAchievementDetailCloseBtn');
        const closeSkinDetail = document.getElementById('sniperSkinDetailCloseBtn');
        if (closeAchievementDetail) closeAchievementDetail.addEventListener('click', () => {
            document.getElementById('sniperAchievementDetailOverlay').style.display = 'none';
        });
        if (closeSkinDetail) closeSkinDetail.addEventListener('click', () => {
            document.getElementById('sniperSkinDetailOverlay').style.display = 'none';
            if (skinPreviewAnimId) {
                cancelAnimationFrame(skinPreviewAnimId);
                skinPreviewAnimId = null;
            }
        });

        // 皮肤分类切换事件
        const skinTabs = document.querySelectorAll('#sniperSkinTabs .skin-tab');
        skinTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                skinTabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                renderSkins(e.target.dataset.target);
            });
        });

        // Canvas 交互（统一使用 pointer events）
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
        resizeCanvas();
        if (elStartOverlay) elStartOverlay.style.display = 'flex';
        if (elEndOverlay) elEndOverlay.style.display = 'none';
        // 绘制静态预览
        drawStaticPreview();
        // 播放背景音乐
        GameAudio.playBgm(skin.background);
    }

    function hide() {
        active = false;
        stopGame();
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        // 停止背景音乐
        GameAudio.stopBgm();
    }

    function startGame() {
        score = 0;
        combo = 0;
        maxCombo = 0;
        timeLeft = GAME_DURATION;
        frenzy = false;
        difficulty = 1;
        particles = [];
        feedbackText = '';
        currentTipIndex = 0;
        tipTimer = 0;

        // 重置Boss状态
        boss = null;
        bossWarningTimer = 0;
        doubleScoreTimer = 0;
        shotCount = 0;

        // 重置道具状态
        droppedPowerups = [];
        activePowerup = null;

        // 重置统计
        stats = {
            totalShots: 0, perfects: 0, excellents: 0,
            goods: 0, hits: 0, misses: 0,
            angleRangeHits: {},
            bossDefeated: 0,
            frenzyCount: 0,
        };

        // 重置射击解析
        shotAnalysis = null;

        // 重置公式卡片
        formulaCard = null;

        // 重置成就辅助变量
        consecutivePerfects = 0;
        hadComboReset = false;
        lastShotWasPerfect = false;
        sessionUnlocked = {};

        // 重置成就通知
        achievementQueue = [];
        achievementNotifyTimer = 0;
        achievementNotifyText = '';

        updateUI();
        spawnTarget();

        if (elStartOverlay) elStartOverlay.style.display = 'none';
        if (elEndOverlay) elEndOverlay.style.display = 'none';

        running = true;
        GameAudio.init();

        // 计时器
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!running) return;
            timeLeft--;
            difficulty = 1 + (GAME_DURATION - timeLeft) / 20; // 每20秒增加1级难度
            if (elTime) elTime.textContent = timeLeft;

            if (timeLeft <= 10 && timeLeft > 0) {
                GameAudio.playTick();
            }

            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);

        // 开始渲染循环
        if (animId) cancelAnimationFrame(animId);
        gameLoop();
    }

    function stopGame() {
        running = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function endGame() {
        stopGame();

        // 检查新纪录
        const bestScore = parseInt(localStorage.getItem('pi_sniper_best') || '0');
        const isRecord = score > bestScore;
        if (isRecord) {
            localStorage.setItem('pi_sniper_best', score.toString());
        }

        // 更新累计统计（用于皮肤解锁）
        updateLifetimeStats();

        if (elFinalScore) elFinalScore.textContent = score;
        if (elRecordBadge) elRecordBadge.style.display = isRecord ? 'inline-block' : 'none';
        if (elEndOverlay) elEndOverlay.style.display = 'flex';

        // 生成练习报告
        window.piSniperReport = {
            score,
            maxCombo,
            stats,
            hitRate: stats.totalShots > 0
                ? Math.round((stats.perfects + stats.excellents + stats.goods + stats.hits) / stats.totalShots * 100)
                : 0,
            weakRanges: getWeakRanges(),
        };

        GameAudio.playGameOver();
    }

    // ===== 目标生成 =====
    function spawnTarget() {
        // Boss模式下使用Boss目标生成
        if (boss) {
            spawnBossTarget();
            return;
        }

        const MIN_ANGLE_GAP_DEG = 10; // 最小间距（度）
        const MIN_ANGLE_GAP_RAD = MIN_ANGLE_GAP_DEG * PI / 180;
        const MAX_ATTEMPTS = 20;

        // 生成特殊角度（30°, 45°, 60°, 90° 等）或随机角度
        const specialAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

        let newAngle;
        let attempts = 0;

        do {
            const useSpecial = Math.random() < 0.6; // 60%概率出特殊角
            if (useSpecial) {
                newAngle = (specialAngles[Math.floor(Math.random() * specialAngles.length)] * PI / 180);
            } else {
                newAngle = Math.random() * TAU;
            }
            attempts++;
        } while (
            attempts < MAX_ATTEMPTS &&
            targetAngle !== 0 && // 首次生成不检查
            angleDistance(newAngle, targetAngle) < MIN_ANGLE_GAP_RAD
        );

        targetAngle = newAngle;
        targetPulse = 0;

        // 显示知识提示
        showKnowledgeTip();
    }

    /**
     * 计算两个角度之间的最短距离（考虑循环）
     */
    function angleDistance(a1, a2) {
        let diff = Math.abs(a1 - a2);
        if (diff > PI) diff = TAU - diff;
        return diff;
    }

    // ===== 交互 =====
    function onPointerDown(e) {
        if (!running) return;

        // 检查是否点击了道具
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        for (let i = droppedPowerups.length - 1; i >= 0; i--) {
            const pw = droppedPowerups[i];
            const dx = px - pw.x;
            const dy = py - pw.y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) {
                pickupPowerup(pw);
                droppedPowerups.splice(i, 1);
                return;
            }
        }

        // 检查是否点击了公式卡片按钮区域
        if (formulaCard && formulaCard.open) {
            // 点击卡片外部关闭
            const cx = getCx(), cy = getCy(), r = getUnitR();
            const cardX = cx - 90;
            const cardY = cy - r - 130;
            const cardW = 180;
            const cardH = 100;
            if (px >= cardX && px <= cardX + cardW && py >= cardY && py <= cardY + cardH) {
                cycleFormulaCard();
                return;
            }
            formulaCard = null;
            return;
        }

        // 检查公式卡片按钮（右上角）
        const btnX = W - 50;
        const btnY = 10;
        if (px >= btnX && px <= btnX + 40 && py >= btnY && py <= btnY + 30) {
            toggleFormulaCard();
            return;
        }

        isDragging = true;
        canvas.setPointerCapture(e.pointerId);
        updateAim(e);
    }

    function onPointerMove(e) {
        if (!isDragging || !running) return;
        updateAim(e);
    }

    function onPointerUp(e) {
        if (!isDragging || !running) return;
        isDragging = false;
        shoot();
    }

    function updateAim(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - W / 2;
        const y = -(e.clientY - rect.top - H / 2); // Y轴翻转（数学坐标系）
        aimAngle = Math.atan2(y, x);
        if (aimAngle < 0) aimAngle += TAU;
    }

    function shoot() {
        GameAudio.playShoot();
        shotCount++;
        stats.totalShots++;

        // 计算角度差
        let diff = Math.abs(aimAngle - targetAngle);
        if (diff > PI) diff = TAU - diff;
        const diffDeg = diff * DEG;

        // 判定精度（考虑shrink道具扩大Perfect范围）
        let perfectThreshold = 1;
        if (activePowerup && activePowerup.type === 'shrink') {
            perfectThreshold = 3;
        }

        let points = 0;
        let label = '';
        let isHit = false;

        if (diffDeg < perfectThreshold) {
            points = 100;
            label = GameI18N.t('sniper.perfect');
            feedbackColor = '#F59E0B';
            GameAudio.playPerfect();
            spawnParticles(W / 2 + Math.cos(targetAngle) * getUnitR(), H / 2 - Math.sin(targetAngle) * getUnitR(), '#F59E0B', 30);
            stats.perfects++;
            consecutivePerfects++;
            lastShotWasPerfect = true;
        } else if (diffDeg < 3) {
            points = 75;
            label = GameI18N.t('sniper.excellent');
            feedbackColor = '#22C55E';
            GameAudio.playExcellent();
            spawnParticles(W / 2 + Math.cos(targetAngle) * getUnitR(), H / 2 - Math.sin(targetAngle) * getUnitR(), '#22C55E', 20);
            stats.excellents++;
            consecutivePerfects = 0;
            lastShotWasPerfect = false;
        } else if (diffDeg < 5) {
            points = 50;
            label = GameI18N.t('sniper.good');
            feedbackColor = '#60A5FA';
            GameAudio.playGood();
            spawnParticles(W / 2 + Math.cos(targetAngle) * getUnitR(), H / 2 - Math.sin(targetAngle) * getUnitR(), '#60A5FA', 12);
            stats.goods++;
            consecutivePerfects = 0;
            lastShotWasPerfect = false;
        } else if (diffDeg < 10) {
            points = 25;
            label = GameI18N.t('sniper.hit');
            feedbackColor = '#94A3B8';
            stats.hits++;
            consecutivePerfects = 0;
            lastShotWasPerfect = false;
        } else {
            points = 0;
            label = GameI18N.t('sniper.miss');
            feedbackColor = '#EF4444';
            GameAudio.playMiss();
            stats.misses++;
            consecutivePerfects = 0;
            lastShotWasPerfect = false;

            // 连击保护道具检查
            if (activePowerup && activePowerup.type === 'shield') {
                activePowerup = null; // 消耗护盾
                feedbackText = GameI18N.t('sniper.shieldBlock') || 'Shield!';
                feedbackColor = '#A78BFA';
                feedbackTimer = 40;
                updateUI();
                spawnTarget();
                recordShot(diffDeg, false);
                checkAchievements();
                tryTriggerBoss();
                return;
            }

            combo = 0;
            frenzy = false;
            hadComboReset = true;
        }

        // 更新分数和连击
        if (points > 0) {
            isHit = true;
            combo++;
            if (combo > maxCombo) maxCombo = combo;

            // Frenzy 模式
            if (combo >= FRENZY_THRESHOLD && !frenzy) {
                frenzy = true;
                stats.frenzyCount++;
                GameAudio.playFrenzy();
                feedbackText = GameI18N.t('sniper.frenzy');
                feedbackColor = '#F59E0B';
                feedbackTimer = 60;
            }

            // Frenzy 加分
            if (frenzy) points = Math.floor(points * 1.5);

            // 双倍得分（Boss奖励或道具）
            if (doubleScoreTimer > 0 || (activePowerup && activePowerup.type === 'double')) {
                points *= 2;
            }

            // 连击加分
            const comboBonus = Math.min(combo, 10) * 5;
            points += comboBonus;

            score += points;
            GameAudio.playCombo(combo);

            // Boss模式下命中处理
            if (boss) {
                handleBossHit(diffDeg);
            }

            // 道具掉落检查
            tryDropPowerup();
        }

        // 记录射击数据
        recordShot(diffDeg, isHit);

        // 维护一些局内最大值用于进度显示
        stats.maxConsecutivePerfects = Math.max(stats.maxConsecutivePerfects || 0, consecutivePerfects);

        // 设置射击解析
        shotAnalysis = {
            diffDeg: diffDeg.toFixed(2),
            aimDeg: ((aimAngle * DEG) % 360).toFixed(1),
            targetDeg: ((targetAngle * DEG) % 360).toFixed(1),
            cos: Math.cos(aimAngle).toFixed(4),
            sin: Math.sin(aimAngle).toFixed(4),
            radian: (aimAngle / PI).toFixed(4),
            timer: 90,
        };

        // 显示反馈
        if (!frenzy || points === 0) {
            feedbackText = label;
            feedbackTimer = 40;
        }

        updateUI();

        // 检查Boss触发
        tryTriggerBoss();

        // 检查成就
        checkAchievements();

        // 生成下一个目标
        spawnTarget();
    }

    // ===== Boss 战系统 =====

    /**
     * 检查是否触发Boss
     */
    function tryTriggerBoss() {
        if (boss) return; // 已有Boss激活

        // Boss 1 "π 之守护者"：每10次射击后触发
        if (shotCount > 0 && shotCount % 10 === 0 && !boss) {
            triggerBoss('piGuardian');
            return;
        }

        // Boss 2 "角度幻影"：累计20连击后触发
        if (combo >= 20 && !boss) {
            triggerBoss('anglePhantom');
            return;
        }
    }

    /**
     * 触发Boss战
     */
    function triggerBoss(type) {
        bossWarningTimer = 120; // 2秒警告
        GameAudio.playBossWarning(); // 在顶部WARNING刚出来时立刻播放警报

        setTimeout(() => {
            if (!running) return;

            if (type === 'piGuardian') {
                boss = {
                    type: 'piGuardian',
                    hp: 3,
                    maxHp: 3,
                    timer: 600, // 10秒时限
                    moveSpeed: 0,
                    angleStart: Math.random() * TAU,
                    angleSpan: PI / 2, // 90°弧段
                    lastHitTime: 0,
                    hitCount: 0,
                    shieldHits: 2, // 前2次破盾
                };
            } else if (type === 'anglePhantom') {
                boss = {
                    type: 'anglePhantom',
                    hp: 4,
                    maxHp: 4,
                    timer: 720, // 12秒时限
                    moveSpeed: 0.005 * difficulty,
                    angleStart: Math.random() * TAU,
                    angleSpan: PI, // 180°弧段
                    lastHitTime: 0,
                    hitCount: 0,
                    shieldHits: 0,
                };
            }

            spawnBossTarget();
            feedbackText = type === 'piGuardian'
                ? GameI18N.t('sniper.boss.piGuardian') || 'π Guardian!'
                : GameI18N.t('sniper.boss.anglePhantom') || 'Angle Phantom!';
            feedbackColor = '#EF4444';
            feedbackTimer = 80;
        }, 2000);
    }

    /**
     * Boss模式下的目标生成
     */
    function spawnBossTarget() {
        if (!boss) return;

        if (boss.type === 'piGuardian') {
            // 在90°弧段内随机位置
            targetAngle = boss.angleStart + Math.random() * boss.angleSpan;
            if (targetAngle >= TAU) targetAngle -= TAU;
        } else if (boss.type === 'anglePhantom') {
            // 在180°弧段内随机位置
            targetAngle = boss.angleStart + Math.random() * boss.angleSpan;
            if (targetAngle >= TAU) targetAngle -= TAU;
        }
        targetPulse = 0;
    }

    /**
     * Boss命中处理
     */
    function handleBossHit(diffDeg) {
        if (!boss) return;

        const now = Date.now();
        if (now - boss.lastHitTime < 300) return; // 防止连续判定
        boss.lastHitTime = now;

        // 护盾检查
        if (boss.shieldHits > 0) {
            boss.shieldHits--;
            feedbackText = GameI18N.t('sniper.boss.shieldBreak') || 'Shield Break!';
            feedbackColor = '#A78BFA';
            feedbackTimer = 40;
            GameAudio.playBossShieldBreak();
            return;
        }

        boss.hp--;
        boss.hitCount++;

        if (boss.hp <= 0) {
            endBoss(true);
        } else {
            feedbackText = GameI18N.t('sniper.boss.hit') || 'Boss Hit!';
            feedbackColor = '#F59E0B';
            feedbackTimer = 40;
            spawnBossTarget();
        }
    }

    /**
     * Boss状态更新
     */
    function updateBoss() {
        if (!boss) return;

        boss.timer--;

        // 角度幻影Boss目标移动
        if (boss.type === 'anglePhantom' && boss.moveSpeed > 0) {
            // 冻结道具检查
            if (activePowerup && activePowerup.type === 'freeze') return;

            targetAngle += boss.moveSpeed;
            if (targetAngle >= boss.angleStart + boss.angleSpan) {
                targetAngle = boss.angleStart;
            }
            if (targetAngle >= TAU) targetAngle -= TAU;
        }

        // Boss超时
        if (boss.timer <= 0) {
            endBoss(false);
        }
    }

    /**
     * Boss结束处理
     */
    function endBoss(defeated) {
        if (!boss) return;

        if (defeated) {
            stats.bossDefeated++;
            const cx = getCx(), cy = getCy(), r = getUnitR();

            if (boss.type === 'piGuardian') {
                // 击败后进入10秒双倍得分
                doubleScoreTimer = 600;
                score += 300;
                feedbackText = GameI18N.t('sniper.boss.piGuardianDefeated') || 'π Guardian Defeated! +300 Double Score!';
                spawnParticles(cx, cy, '#F59E0B', 50);
                spawnParticles(cx, cy, '#EF4444', 30);
            } else if (boss.type === 'anglePhantom') {
                score += 500;
                feedbackText = GameI18N.t('sniper.boss.anglePhantomDefeated') || 'Angle Phantom Defeated! +500!';
                spawnParticles(cx, cy, '#A78BFA', 50);
                spawnParticles(cx, cy, '#60A5FA', 30);
            }

            GameAudio.playBossDefeated();
        } else {
            feedbackText = GameI18N.t('sniper.boss.escaped') || 'Boss Escaped!';
            feedbackColor = '#94A3B8';
        }

        feedbackTimer = 80;
        boss = null;
        updateUI();
    }

    /**
     * 绘制Boss特殊视觉效果
     */
    function drawBoss(cx, cy, r) {
        if (!boss) return;

        // Boss血条
        const barW = 120;
        const barH = 8;
        const barX = cx - barW / 2;
        const barY = cy - r - 80;

        // 血条背景
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.beginPath();
        ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4);
        ctx.fill();

        // 血条
        const hpRatio = boss.hp / boss.maxHp;
        const hpColor = hpRatio > 0.5 ? '#EF4444' : hpRatio > 0.25 ? '#F59E0B' : '#DC2626';
        ctx.fillStyle = hpColor;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * hpRatio, barH, 3);
        ctx.fill();

        // Boss名称
        const bossName = boss.type === 'piGuardian'
            ? (GameI18N.t('sniper.boss.piGuardian') || 'π Guardian')
            : (GameI18N.t('sniper.boss.anglePhantom') || 'Angle Phantom');
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bossName, cx, barY - 8);

        // 护盾指示
        if (boss.shieldHits > 0) {
            ctx.fillStyle = '#A78BFA';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText(`Shield x${boss.shieldHits}`, cx, barY + barH + 14);
        }

        // Boss弧段高亮
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6, -boss.angleStart - boss.angleSpan, -boss.angleStart);
        ctx.strokeStyle = boss.type === 'piGuardian'
            ? 'rgba(239, 68, 68, 0.4)'
            : 'rgba(167, 139, 250, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Boss目标特殊样式
        const tx = cx + Math.cos(targetAngle) * r;
        const ty = cy - Math.sin(targetAngle) * r;
        const pulse = Math.sin(targetPulse) * 0.3 + 1;

        // 外圈脉冲（Boss用更大更醒目的样式）
        ctx.beginPath();
        ctx.arc(tx, ty, 16 * pulse, 0, TAU);
        const bossColor = boss.type === 'piGuardian' ? '239, 68, 68' : '167, 139, 250';
        ctx.strokeStyle = `rgba(${bossColor}, ${0.4 * (2 - pulse)})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // 第二层脉冲
        ctx.beginPath();
        ctx.arc(tx, ty, 22 * pulse, 0, TAU);
        ctx.strokeStyle = `rgba(${bossColor}, ${0.15 * (2 - pulse)})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Boss目标点
        ctx.beginPath();
        ctx.arc(tx, ty, 9, 0, TAU);
        ctx.fillStyle = boss.type === 'piGuardian' ? '#EF4444' : '#A78BFA';
        ctx.fill();

        // 内部亮点
        ctx.beginPath();
        ctx.arc(tx - 2, ty - 2, 3, 0, TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        // Boss计时器
        const timeSec = Math.ceil(boss.timer / 60);
        ctx.fillStyle = boss.timer < 180 ? '#EF4444' : '#94A3B8';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${timeSec}s`, cx, barY + barH + (boss.shieldHits > 0 ? 28 : 14));
    }

    // ===== 道具系统 =====

    /**
     * 道具掉落检查
     */
    function tryDropPowerup() {
        if (Math.random() > (frenzy ? 0.16 : 0.08)) return; // Frenzy翻倍掉落率

        const types = ['freeze', 'double', 'shrink', 'shield', 'time'];
        const weights = [8, 5, 4, 7, 5];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let rand = Math.random() * totalWeight;
        let type = types[0];
        for (let i = 0; i < types.length; i++) {
            rand -= weights[i];
            if (rand <= 0) {
                type = types[i];
                break;
            }
        }

        const cx = getCx(), cy = getCy(), r = getUnitR();
        const randomAngle = Math.random() * TAU;
        const tx = cx + Math.cos(randomAngle) * r;
        const ty = cy - Math.sin(randomAngle) * r;
        droppedPowerups.push({ type, x: tx, y: ty, life: 300, pulse: 0 });
    }

    /**
     * 拾取道具
     */
    function pickupPowerup(powerup) {
        applyPowerupEffect(powerup.type);
        GameAudio.playPowerupPickup();

        // 拾取粒子效果
        const colors = {
            freeze: '#60A5FA',
            double: '#F59E0B',
            shrink: '#22C55E',
            shield: '#A78BFA',
            time: '#34D399',
        };
        spawnParticles(powerup.x, powerup.y, colors[powerup.type] || '#FFF', 15);

        // 显示拾取反馈
        const names = {
            freeze: GameI18N.t('sniper.powerup.freeze') || 'Freeze!',
            double: GameI18N.t('sniper.powerup.double') || 'Double Score!',
            shrink: GameI18N.t('sniper.powerup.shrink') || 'Shrink!',
            shield: GameI18N.t('sniper.powerup.shield') || 'Shield!',
            time: GameI18N.t('sniper.powerup.time') || '+5s!',
        };
        feedbackText = names[powerup.type] || 'Powerup!';
        feedbackColor = colors[powerup.type] || '#FFF';
        feedbackTimer = 40;
    }

    /**
     * 应用道具效果
     */
    function applyPowerupEffect(type) {
        switch (type) {
            case 'freeze':
                activePowerup = { type: 'freeze', timer: 300 }; // 5秒
                break;
            case 'double':
                activePowerup = { type: 'double', timer: 600 }; // 10秒
                break;
            case 'shrink':
                activePowerup = { type: 'shrink', timer: 480 }; // 8秒
                break;
            case 'shield':
                activePowerup = { type: 'shield', timer: 1 }; // 单次
                break;
            case 'time':
                timeLeft += 5;
                if (elTime) elTime.textContent = timeLeft;
                activePowerup = null; // 即时效果
                break;
        }
    }

    /**
     * 更新道具状态
     */
    function updatePowerups() {
        // 更新掉落中的道具
        for (let i = droppedPowerups.length - 1; i >= 0; i--) {
            const pw = droppedPowerups[i];
            pw.life--;
            pw.pulse += 0.08;
            if (pw.life <= 0) {
                droppedPowerups.splice(i, 1);
            }
        }

        // 更新激活中的道具
        if (activePowerup && activePowerup.type !== 'shield') {
            activePowerup.timer--;
            if (activePowerup.timer <= 0) {
                activePowerup = null;
            }
        }
    }

    /**
     * 获取道具图标字符
     */
    function getPowerupIcon(type) {
        const icons = {
            freeze: '\u2744', // 雪花
            double: '\u00D72', // x2
            shrink: '\u25CE', // 同心圆
            shield: '\u25C6', // 菱形
            time: '\u23F1', // 计时器
        };
        return icons[type] || '?';
    }

    /**
     * 绘制道具
     */
    function drawPowerups(cx, cy, r) {
        droppedPowerups.forEach(pw => {
            const pulse = Math.sin(pw.pulse) * 0.2 + 1;
            const alpha = pw.life < 60 ? pw.life / 60 : 1;

            // 道具颜色
            const colors = {
                freeze: '#60A5FA',
                double: '#F59E0B',
                shrink: '#22C55E',
                shield: '#A78BFA',
                time: '#34D399',
            };
            const color = colors[pw.type] || '#FFF';

            // 外圈光晕
            ctx.save();
            ctx.globalAlpha = alpha * 0.3;
            ctx.beginPath();
            ctx.arc(pw.x, pw.y, 16 * pulse, 0, TAU);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();

            // 道具背景
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(pw.x, pw.y, 10, 0, TAU);
            ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // 道具图标
            ctx.fillStyle = color;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(getPowerupIcon(pw.type), pw.x, pw.y);
            ctx.restore();
        });

        // 绘制激活中的道具指示器
        if (activePowerup) {
            const indicatorY = cy + r + 80;
            const colors = {
                freeze: '#60A5FA',
                double: '#F59E0B',
                shrink: '#22C55E',
                shield: '#A78BFA',
            };
            const names = {
                freeze: GameI18N.t('sniper.powerup.freeze') || 'Freeze',
                double: GameI18N.t('sniper.powerup.double') || 'x2',
                shrink: GameI18N.t('sniper.powerup.shrink') || 'Shrink',
                shield: GameI18N.t('sniper.powerup.shield') || 'Shield',
            };
            const color = colors[activePowerup.type] || '#FFF';
            const name = names[activePowerup.type] || '';

            ctx.fillStyle = color;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(name, cx, indicatorY);

            // 倒计时条
            if (activePowerup.type !== 'shield') {
                const barW = 60;
                const barH = 3;
                const maxTimers = { freeze: 300, double: 600, shrink: 480 };
                const maxT = maxTimers[activePowerup.type] || 300;
                const ratio = activePowerup.timer / maxT;

                ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
                ctx.fillRect(cx - barW / 2, indicatorY + 6, barW, barH);
                ctx.fillStyle = color;
                ctx.fillRect(cx - barW / 2, indicatorY + 6, barW * ratio, barH);
            }
        }
    }

    // ===== 成就系统 =====

    /**
     * 从 localStorage 加载成就
     */
    function loadAchievements() {
        try {
            const saved = localStorage.getItem('pi_sniper_achievements');
            if (saved) {
                achievements = JSON.parse(saved);
                // 兼容旧数据
                Object.keys(achievements).forEach(id => {
                    if (typeof achievements[id].count !== 'number') {
                        achievements[id].count = 1;
                    }
                });
            }
        } catch (e) {
            achievements = {};
        }
    }

    /**
     * 保存成就到 localStorage
     */
    function saveAchievements() {
        try {
            localStorage.setItem('pi_sniper_achievements', JSON.stringify(achievements));
        } catch (e) {
            // 忽略存储错误
        }
    }

    /**
     * 检查成就解锁
     */
    function checkAchievements() {
        let lt = {};
        try {
            lt = JSON.parse(localStorage.getItem('pi_sniper_lifetime') || '{}');
        } catch (e) { }

        const state = {
            stats,
            combo,
            maxCombo,
            timeLeft,
            consecutivePerfects,
            hadComboReset,
            lastShotWasPerfect,
            score,
            lt
        };

        Object.keys(ACHIEVEMENT_DEFS).forEach(id => {
            const def = ACHIEVEMENT_DEFS[id];
            let canTrigger = false;

            if (def.type === 'once') {
                canTrigger = !achievements[id];
            } else if (def.type === 'once_per_game') {
                canTrigger = !sessionUnlocked[id];
            } else if (def.type === 'repeatable') {
                canTrigger = true; // For repeatable, check function itself must ensure it doesn't spam (e.g. % 10 === 0)
                // Avoid triggering multiple times for the exact same state (e.g. multiple checks in the same shot)
                if (sessionUnlocked[id] === state.consecutivePerfects) {
                    canTrigger = false;
                }
            }

            if (canTrigger && def.check(state)) {
                if (def.type === 'once_per_game') sessionUnlocked[id] = true;
                if (def.type === 'repeatable') sessionUnlocked[id] = state.consecutivePerfects;
                unlockAchievement(id);
            }
        });
    }

    /**
     * 解锁成就
     */
    function unlockAchievement(id) {
        if (!achievements[id]) {
            achievements[id] = {
                unlocked: true,
                time: Date.now(),
                count: 0
            };
        }
        achievements[id].count++;
        achievements[id].time = Date.now();
        saveAchievements();

        // 加入通知队列
        achievementQueue.push(id);

        // 如果当前没有正在显示的通知，立即显示
        if (achievementNotifyTimer <= 0 && achievementQueue.length > 0) {
            showNextAchievementNotify();
        }

        GameAudio.playAchievement();
    }

    /**
     * 显示下一个成就通知
     */
    function showNextAchievementNotify() {
        if (achievementQueue.length === 0) return;
        const id = achievementQueue.shift();
        achievementNotifyText = GameI18N.t(ACHIEVEMENT_DEFS[id].name) || id;
        achievementNotifyTimer = 120; // 2秒显示
    }

    /**
     * 绘制成就通知
     */
    function drawAchievementNotify(cx, cy) {
        if (achievementNotifyTimer <= 0 || !achievementNotifyText) return;

        // 更新计时器
        if (achievementNotifyTimer > 0) {
            achievementNotifyTimer--;
            if (achievementNotifyTimer <= 0) {
                achievementNotifyText = '';
                // 检查队列中是否还有待显示的成就
                if (achievementQueue.length > 0) {
                    showNextAchievementNotify();
                }
                return;
            }
        }

        const alpha = achievementNotifyTimer > 100
            ? (120 - achievementNotifyTimer) / 20
            : achievementNotifyTimer < 20
                ? achievementNotifyTimer / 20
                : 1;

        const notifyW = 200;
        const notifyH = 40;
        const notifyX = cx - notifyW / 2;
        const notifyY = 60;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 通知背景
        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.beginPath();
        ctx.roundRect(notifyX, notifyY, notifyW, notifyH, 8);
        ctx.fill();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 奖杯图标
        ctx.fillStyle = '#F59E0B';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2605', notifyX + 10, notifyY + notifyH / 2);

        // 成就文本
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(achievementNotifyText, notifyX + 32, notifyY + notifyH / 2 - 1);

        // "Achievement Unlocked" 小标签
        ctx.fillStyle = '#94A3B8';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(GameI18N.t('sniper.achievement.unlocked') || 'Unlocked', notifyX + notifyW - 10, notifyY + notifyH / 2 - 1);

        ctx.restore();
    }

    /**
     * 计算成就进度
     */
    function getAchievementProgress(id, def, lt) {
        let current = 0;
        let max = 1;

        switch (id) {
            case 'firstPerfect': current = lt.totalPerfects || 0; max = 1; break;
            case 'sniper': current = lt.totalPerfects || 0; max = 10; break;
            case 'godlike': current = lt.totalPerfects || 0; max = 20; break;
            case 'zeroError': current = lt.maxConsecutivePerfects || 0; max = 10; break;
            case 'combo5': current = lt.maxCombo || 0; max = 5; break;
            case 'combo15': current = lt.maxCombo || 0; max = 15; break;
            case 'combo30': current = lt.maxCombo || 0; max = 30; break;
            case 'bossHunter': current = lt.totalBossDefeated || 0; max = 1; break;
            case 'bossHarvester': current = lt.totalBossDefeated || 0; max = 10; break;
            case 'timeMaster': current = achievements[id]?.unlocked ? 1 : 0; max = 1; break;
            case 'comeback': current = achievements[id]?.unlocked ? 1 : 0; max = 1; break;
            case 'frenzyRegular': current = lt.maxFrenzyPerGame || 0; max = 3; break;
        }

        current = Math.min(current, max);

        // 如果已解锁且是不可重复成就，进度拉满
        if (achievements[id]?.unlocked && def.type === 'once') {
            current = max;
        }

        return { current, max };
    }

    /**
     * 渲染成就面板内容
     */
    function renderAchievements() {
        const container = document.getElementById('sniperAchievementList');
        if (!container) return;

        const achievementIcons = {
            firstPerfect: '🎯', sniper: '🎯', godlike: '👑', zeroError: '✨',
            combo5: '🔥', combo15: '🔥', combo30: '🔥', bossHunter: '⚔️',
            bossHarvester: '⚔️', timeMaster: '⏱️', comeback: '📈', frenzyRegular: '⚡'
        };

        let lt = {};
        try { lt = JSON.parse(localStorage.getItem('pi_sniper_lifetime') || '{}'); } catch (e) { }

        container.innerHTML = Object.keys(ACHIEVEMENT_DEFS).map(id => {
            const def = ACHIEVEMENT_DEFS[id];
            const data = achievements[id];
            const isUnlocked = data && data.unlocked;
            const icon = achievementIcons[id] || '🏆';
            const name = GameI18N.t(def.name) || id;

            let badgeHtml = '';
            if (isUnlocked) {
                if (def.type === 'repeatable' || def.type === 'once_per_game') {
                    badgeHtml = `<span class="achievement-badge">x${data.count}</span>`;
                } else {
                    badgeHtml = `<span class="achievement-badge">已达成</span>`;
                }
            } else {
                badgeHtml = `<span class="achievement-badge locked-badge">🔒</span>`;
            }

            return `
                <div class="achievement-card ${isUnlocked ? '' : 'locked'}" onclick="PiSniper.showAchievementDetail('${id}')">
                    <div class="achievement-icon">${icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-name">${name}</div>
                        <div class="achievement-desc"></div>
                    </div>
                    ${badgeHtml}
                </div>
            `;
        }).join('');
    }

    /**
     * 显示成就详情
     */
    function showAchievementDetail(id) {
        const overlay = document.getElementById('sniperAchievementDetailOverlay');
        if (!overlay) return;

        const def = ACHIEVEMENT_DEFS[id];
        const data = achievements[id];
        const isUnlocked = data && data.unlocked;

        const achievementIcons = {
            firstPerfect: '🎯', sniper: '🎯', godlike: '👑', zeroError: '✨',
            combo5: '🔥', combo15: '🔥', combo30: '🔥', bossHunter: '⚔️',
            bossHarvester: '⚔️', timeMaster: '⏱️', comeback: '📈', frenzyRegular: '⚡'
        };

        let lt = {};
        try { lt = JSON.parse(localStorage.getItem('pi_sniper_lifetime') || '{}'); } catch (e) { }

        const progress = getAchievementProgress(id, def, lt);

        document.getElementById('sniperAchievementDetailIcon').textContent = achievementIcons[id] || '🏆';
        document.getElementById('sniperAchievementDetailName').textContent = GameI18N.t(def.name) || id;
        document.getElementById('sniperAchievementDetailDesc').textContent = GameI18N.t(`${def.name}.desc`) || '???';

        let progressText = `${progress.current}/${progress.max}`;
        if (isUnlocked && (def.type === 'repeatable' || def.type === 'once_per_game')) {
            progressText = `已完成 ${data.count} 次 (单次 ${progress.current}/${progress.max})`;
        }
        document.getElementById('sniperAchievementDetailProgressText').textContent = progressText;

        const ratio = (progress.current / progress.max) * 100;
        document.getElementById('sniperAchievementDetailProgressBar').style.width = `${ratio}%`;

        overlay.style.display = 'flex';
    }

    /**
     * 渲染皮肤面板内容
     */
    function renderSkins(category) {
        const container = document.getElementById('sniperSkinList');
        if (!container) return;

        const skins = SKIN_UNLOCK_CONDITIONS[category];
        if (!skins) return;

        // 获取累计数据用于解锁判定
        let lt = {};
        try {
            lt = JSON.parse(localStorage.getItem('pi_sniper_lifetime') || '{}');
        } catch (e) { }

        // 判断解锁状态
        const isUnlocked = (key, conf) => {
            if (conf.unlocked) return true;
            switch (conf.condition) {
                case 'singlePerfect20': return achievements['godlike']?.unlocked;
                case 'totalPerfect50': return (lt.totalPerfects || 0) >= 50;
                case 'totalBoss5': return (lt.totalBossDefeated || 0) >= 5;
                case 'totalScore10000': return (lt.totalScore || 0) >= 10000;
                case 'firstPerfect': return achievements['firstPerfect']?.unlocked;
                case 'totalGames10': return (lt.totalGames || 0) >= 10;
                case 'combo30': return achievements['combo30']?.unlocked;
                case 'totalBoss3': return (lt.totalBossDefeated || 0) >= 3;
                case 'totalGames20': return (lt.totalGames || 0) >= 20;
                default: return false;
            }
        };

        const previewRenderers = {
            crosshair: (k) => `<div style="color:#FFF;">${k === 'circle' ? '⭕' : k === 'laser' ? '⚡' : k === 'bow' ? '🏹' : '➕'}</div>`,
            lineColor: (k) => `<div style="width:20px;height:20px;border-radius:50%;background:${k === 'rainbow' ? 'linear-gradient(45deg,red,orange,yellow,green,blue,purple)' : 'var(--' + k + ', ' + k + ')'};"></div>`,
            circleStyle: (k) => `<div style="color:#FFF;">${k === 'neon' ? '✨' : k === 'minimal' ? '⚪' : k === 'retro' ? '🕹️' : '⭕'}</div>`,
            particle: (k) => `<div style="color:#FFF;">${k === 'star' ? '⭐' : k === 'fire' ? '🔥' : k === 'electric' ? '⚡' : '✨'}</div>`,
            background: (k) => `<div style="color:#FFF;">${k === 'ocean' ? '🌊' : k === 'forest' ? '🌲' : k === 'cyberpunk' ? '🌃' : '🌌'}</div>`
        };

        container.innerHTML = Object.keys(skins).map(key => {
            const conf = skins[key];
            const unlocked = isUnlocked(key, conf);
            const isEquipped = skin[category] === key;
            const name = GameI18N.t(`sniper.skin.${key}`) || key;
            const desc = conf.desc ? (GameI18N.t(conf.desc) || conf.desc) : '';

            let btnHtml = '';
            if (unlocked) {
                if (isEquipped) {
                    btnHtml = `<button class="btn skin-btn" disabled style="opacity:0.5;cursor:default;">已装备</button>`;
                } else {
                    btnHtml = `<button class="btn btn-primary skin-btn" onclick="PiSniper.equipSkin('${category}', '${key}')">穿戴</button>`;
                }
            }

            return `
                <div class="skin-card ${unlocked ? '' : 'locked'}" onclick="PiSniper.showSkinDetail('${category}', '${key}')">
                    <div class="skin-preview">
                        ${previewRenderers[category] ? previewRenderers[category](key) : ''}
                    </div>
                    <div class="skin-name">${name}</div>
                    ${btnHtml}
                    ${!unlocked ? `
                        <div class="skin-locked-overlay">
                            <div class="skin-locked-icon">🔒</div>
                            <div class="skin-locked-desc">${desc}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * 计算皮肤解锁进度
     */
    function getSkinProgress(conf, lt) {
        let current = 0;
        let max = 1;
        if (conf.unlocked) return { current: 1, max: 1 };

        switch (conf.condition) {
            case 'singlePerfect20': current = lt.maxPerfectsPerGame || 0; max = 20; break;
            case 'totalPerfect50': current = lt.totalPerfects || 0; max = 50; break;
            case 'totalBoss5': current = lt.totalBossDefeated || 0; max = 5; break;
            case 'totalScore10000': current = lt.totalScore || 0; max = 10000; break;
            case 'firstPerfect': current = lt.totalPerfects || 0; max = 1; break;
            case 'totalGames10': current = lt.totalGames || 0; max = 10; break;
            case 'combo30': current = lt.maxCombo || 0; max = 30; break;
            case 'totalBoss3': current = lt.totalBossDefeated || 0; max = 3; break;
            case 'totalGames20': current = lt.totalGames || 0; max = 20; break;
        }
        current = Math.min(current, max);
        return { current, max };
    }

    /**
     * 穿戴皮肤（暴露给全局以供 onclick 调用）
     */
    function equipSkin(category, key) {
        skin[category] = key;
        saveSkin();
        renderSkins(category); // 刷新当前 tab

        // 实时切换背景音乐
        if (category === 'background' && active) {
            GameAudio.playBgm(key);
        }
    }

    // 预览动画帧控制
    let skinPreviewAnimId = null;

    /**
     * 显示皮肤详情
     */
    function showSkinDetail(category, key) {
        const overlay = document.getElementById('sniperSkinDetailOverlay');
        if (!overlay) return;

        const conf = SKIN_UNLOCK_CONDITIONS[category][key];
        const name = GameI18N.t(`sniper.skin.${key}`) || key;
        const desc = conf.desc ? (GameI18N.t(conf.desc) || conf.desc) : '默认解锁';

        let lt = {};
        try { lt = JSON.parse(localStorage.getItem('pi_sniper_lifetime') || '{}'); } catch (e) { }

        // 判断解锁状态
        const isUnlockedFn = (k, c) => {
            if (c.unlocked) return true;
            switch (c.condition) {
                case 'singlePerfect20': return achievements['godlike']?.unlocked;
                case 'totalPerfect50': return (lt.totalPerfects || 0) >= 50;
                case 'totalBoss5': return (lt.totalBossDefeated || 0) >= 5;
                case 'totalScore10000': return (lt.totalScore || 0) >= 10000;
                case 'firstPerfect': return achievements['firstPerfect']?.unlocked;
                case 'totalGames10': return (lt.totalGames || 0) >= 10;
                case 'combo30': return achievements['combo30']?.unlocked;
                case 'totalBoss3': return (lt.totalBossDefeated || 0) >= 3;
                case 'totalGames20': return (lt.totalGames || 0) >= 20;
                default: return false;
            }
        };

        const unlocked = isUnlockedFn(key, conf);
        const isEquipped = skin[category] === key;
        const progress = getSkinProgress(conf, lt);

        document.getElementById('sniperSkinDetailName').textContent = name;
        document.getElementById('sniperSkinDetailDesc').textContent = desc;

        let progressText = `${progress.current}/${progress.max}`;
        if (unlocked) progressText = '已解锁';
        document.getElementById('sniperSkinDetailProgressText').textContent = progressText;

        const ratio = unlocked ? 100 : (progress.current / progress.max) * 100;
        document.getElementById('sniperSkinDetailProgressBar').style.width = `${ratio}%`;

        const equipBtn = document.getElementById('sniperSkinDetailEquipBtn');
        const equippedBtn = document.getElementById('sniperSkinDetailEquippedBtn');

        if (unlocked) {
            if (isEquipped) {
                equipBtn.style.display = 'none';
                equippedBtn.style.display = 'block';
            } else {
                equipBtn.style.display = 'block';
                equippedBtn.style.display = 'none';
                equipBtn.onclick = () => {
                    equipSkin(category, key);
                    showSkinDetail(category, key); // 刷新按钮状态
                };
            }
        } else {
            equipBtn.style.display = 'none';
            equippedBtn.style.display = 'none';
        }

        // 开始动画预览
        startSkinPreview(category, key);

        overlay.style.display = 'flex';
    }

    function startSkinPreview(category, key) {
        const previewCanvas = document.getElementById('sniperSkinPreviewCanvas');
        if (!previewCanvas) return;
        const pctx = previewCanvas.getContext('2d');
        const pw = previewCanvas.width;
        const ph = previewCanvas.height;
        const pcx = pw / 2;
        const pcy = ph / 2;
        const pr = 50;

        if (skinPreviewAnimId) cancelAnimationFrame(skinPreviewAnimId);

        // 模拟一个假的游戏状态用于预览渲染
        const previewState = {
            timer: 0,
            particles: [],
            lastTime: performance.now()
        };

        function loop(now) {
            const dt = (now - previewState.lastTime) / 1000;
            previewState.lastTime = now;
            previewState.timer += 0.05; // 旋转/脉冲速度

            pctx.clearRect(0, 0, pw, ph);

            // 绘制背景（如果分类是背景）
            if (category === 'background') {
                const stops = getBackgroundGradientForSkin(key, pcx, pcy, pr);
                if (stops.length > 1) {
                    const grad = pctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, pr * 2);
                    stops.forEach(s => grad.addColorStop(s.stop, s.color));
                    pctx.fillStyle = grad;
                } else {
                    pctx.fillStyle = stops[0].color;
                }
                pctx.fillRect(0, 0, pw, ph);
                drawBackgroundDecorations(pctx, pw, ph, key, previewState.timer * 2);
            }

            // 绘制单位圆（如果分类是单位圆或背景）
            if (category === 'circleStyle' || category === 'background') {
                drawUnitCircleForSkin(category === 'circleStyle' ? key : 'standard', pctx, pcx, pcy, pr, previewState.timer);
            } else {
                // 默认的辅助圆
                drawUnitCircleForSkin('standard', pctx, pcx, pcy, pr, 0);
            }

            // 绘制颜色线条（如果分类是 lineColor）
            if (category === 'lineColor') {
                const angle = previewState.timer;
                const { color, glow } = getLineColorForSkin(key);
                pctx.save();
                if (glow) {
                    pctx.shadowColor = glow;
                    pctx.shadowBlur = 10;
                }
                pctx.beginPath();
                pctx.moveTo(pcx, pcy);
                pctx.lineTo(pcx + Math.cos(angle) * pr, pcy - Math.sin(angle) * pr);
                pctx.strokeStyle = color;
                pctx.lineWidth = 2;
                pctx.stroke();
                pctx.restore();
            }

            // 绘制准星（如果分类是 crosshair）
            if (category === 'crosshair') {
                drawCrosshairForSkin(key, pctx, pcx + Math.cos(PI / 4) * pr, pcy - Math.sin(PI / 4) * pr, PI / 4);
            }

            // 绘制粒子（如果分类是 particle）
            if (category === 'particle') {
                // 每隔一段时间发射粒子
                if (Math.random() < 0.1) {
                    const angle = Math.random() * TAU;
                    const speed = 1 + Math.random() * 2;
                    previewState.particles.push({
                        x: pcx, y: pcy,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1,
                        color: '#FFF'
                    });
                }

                // 更新和绘制粒子
                for (let i = previewState.particles.length - 1; i >= 0; i--) {
                    const p = previewState.particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life -= 0.02;
                    if (p.life <= 0) {
                        previewState.particles.splice(i, 1);
                        continue;
                    }

                    pctx.save();
                    pctx.globalAlpha = p.life;
                    if (key === 'star') {
                        drawStarForSkin(pctx, p.x, p.y, 4, p.color);
                    } else if (key === 'fire') {
                        pctx.beginPath();
                        pctx.arc(p.x, p.y, 3 * p.life, 0, TAU);
                        pctx.fillStyle = '#F97316';
                        pctx.fill();
                    } else if (key === 'electric') {
                        pctx.beginPath();
                        pctx.moveTo(p.x, p.y);
                        pctx.lineTo(p.x - p.vx * 2 + (Math.random() - 0.5) * 4, p.y - p.vy * 2 + (Math.random() - 0.5) * 4);
                        pctx.strokeStyle = '#38BDF8';
                        pctx.lineWidth = 2;
                        pctx.stroke();
                    } else {
                        // standard
                        pctx.beginPath();
                        pctx.arc(p.x, p.y, 2 * p.life, 0, TAU);
                        pctx.fillStyle = p.color;
                        pctx.fill();
                    }
                    pctx.restore();
                }
            }

            skinPreviewAnimId = requestAnimationFrame(loop);
        }
        skinPreviewAnimId = requestAnimationFrame(loop);
    }

    // ===== 供预览使用的独立渲染辅助函数 =====
    function getBackgroundGradientForSkin(skinKey, cx, cy, r) {
        switch (skinKey) {
            case 'cyberpunk': return [{ stop: 0, color: '#2E0249' }, { stop: 1, color: '#0A0014' }];
            case 'ocean': return [{ stop: 0, color: '#0F2027' }, { stop: 1, color: '#0B131A' }];
            case 'forest': return [{ stop: 0, color: '#0D2916' }, { stop: 1, color: '#051009' }];
            case 'deepSpace': return [{ stop: 0, color: '#1A0B2E' }, { stop: 0.5, color: '#140523' }, { stop: 1, color: '#08020F' }];
            default: return [{ stop: 0, color: '#0F172A' }, { stop: 1, color: '#070C15' }];
        }
    }

    function drawUnitCircleForSkin(skinKey, pctx, cx, cy, r, timer) {
        pctx.save();
        switch (skinKey) {
            case 'neon':
                pctx.beginPath(); pctx.arc(cx, cy, r, 0, TAU);
                pctx.strokeStyle = '#E879F9'; pctx.lineWidth = 2;
                pctx.shadowColor = '#E879F9'; pctx.shadowBlur = 15;
                pctx.stroke();
                break;
            case 'minimal':
                pctx.beginPath(); pctx.arc(cx, cy, r, 0, TAU);
                pctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; pctx.lineWidth = 1;
                pctx.setLineDash([5, 5]); pctx.stroke(); pctx.setLineDash([]);
                break;
            case 'retro':
                pctx.beginPath(); pctx.arc(cx, cy, r, 0, TAU);
                pctx.strokeStyle = '#4ADE80'; pctx.lineWidth = 2;
                // pixelated look logic skipped for simplicity, just green line
                pctx.stroke();
                break;
            default:
                pctx.beginPath(); pctx.arc(cx, cy, r, 0, TAU);
                pctx.strokeStyle = 'rgba(148, 163, 184, 0.4)'; pctx.lineWidth = 2;
                pctx.stroke();
                break;
        }
        pctx.restore();
    }

    function getLineColorForSkin(skinKey) {
        switch (skinKey) {
            case 'gold': return { color: '#FBBF24', glow: '#F59E0B' };
            case 'blue': return { color: '#60A5FA', glow: '#3B82F6' };
            case 'purple': return { color: '#C084FC', glow: '#A855F7' };
            case 'rainbow': return { color: `hsl(${(Date.now() / 10) % 360}, 100%, 70%)`, glow: null };
            default: return { color: '#22C55E', glow: '#16A34A' };
        }
    }

    function drawCrosshairForSkin(skinKey, pctx, x, y, angle) {
        pctx.save();
        pctx.translate(x, y);
        pctx.rotate(-angle); // 数学坐标系转回canvas系
        pctx.strokeStyle = '#F8FAFC';
        pctx.lineWidth = 2;

        if (skinKey === 'circle') {
            pctx.beginPath(); pctx.arc(0, 0, 8, 0, TAU); pctx.stroke();
            pctx.beginPath(); pctx.arc(0, 0, 1, 0, TAU); pctx.fillStyle = '#FFF'; pctx.fill();
        } else if (skinKey === 'laser') {
            pctx.beginPath(); pctx.moveTo(-15, 0); pctx.lineTo(15, 0); pctx.strokeStyle = '#EF4444'; pctx.stroke();
            pctx.beginPath(); pctx.moveTo(0, -15); pctx.lineTo(0, 15); pctx.stroke();
        } else if (skinKey === 'bow') {
            pctx.beginPath(); pctx.arc(0, 0, 12, -PI / 3, PI / 3); pctx.stroke();
            pctx.beginPath(); pctx.moveTo(0, 0); pctx.lineTo(10, 0); pctx.stroke();
        } else {
            // default
            pctx.beginPath(); pctx.moveTo(-10, 0); pctx.lineTo(-4, 0);
            pctx.moveTo(4, 0); pctx.lineTo(10, 0);
            pctx.moveTo(0, -10); pctx.lineTo(0, -4);
            pctx.moveTo(0, 4); pctx.lineTo(0, 10);
            pctx.stroke();
        }
        pctx.restore();
    }

    function drawStarForSkin(pctx, x, y, size, color) {
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size * 0.4;
        pctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / (spikes * 2)) * TAU - PI / 2;
            pctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        }
        pctx.closePath();
        pctx.fillStyle = color;
        pctx.fill();
    }

    /**
     * 渲染记录面板内容
     */
    function renderRecords() {
        const container = document.getElementById('sniperRecordGrid');
        if (!container) return;

        let lt = {};
        try {
            lt = JSON.parse(localStorage.getItem('pi_sniper_lifetime') || '{}');
        } catch (e) { }

        const timeInSeconds = lt.totalPlayTime || 0;
        let timeStr = `${timeInSeconds}s`;
        if (timeInSeconds >= 3600) {
            timeStr = `${(timeInSeconds / 3600).toFixed(1)}h`;
        } else if (timeInSeconds >= 60) {
            timeStr = `${(timeInSeconds / 60).toFixed(1)}m`;
        }

        const data = [
            { label: '总游玩局数', value: lt.totalGames || 0, icon: '🎮' },
            { label: '总游玩时间', value: timeStr, icon: '⏱️' },
            { label: '总击中目标', value: lt.totalHits || 0, icon: '🎯' },
            { label: '完美射击', value: lt.totalPerfects || 0, icon: '⭐' },
            { label: '脱靶次数', value: lt.totalMisses || 0, icon: '❌' },
            { label: '历史最大连击', value: lt.maxCombo || 0, icon: '🔥' },
            { label: '击败 Boss', value: lt.totalBossDefeated || 0, icon: '⚔️' },
            { label: '触发 Frenzy', value: lt.totalFrenzyCount || 0, icon: '⚡' },
        ];

        container.innerHTML = data.map(item => `
            <div class="record-card">
                <div class="record-icon">${item.icon}</div>
                <div class="record-value">${item.value}</div>
                <div class="record-label">${item.label}</div>
            </div>
        `).join('');
    }

    /**
     * 获取已解锁成就数量
     */
    function getUnlockedCount() {
        return Object.keys(achievements).filter(k => achievements[k] && achievements[k].unlocked).length;
    }

    /**
     * 获取成就总数
     */
    function getTotalCount() {
        return Object.keys(ACHIEVEMENT_DEFS).length;
    }

    // ===== 练习报告 =====

    /**
     * 记录射击数据
     */
    function recordShot(diffDeg, isHit) {
        // 角度区间统计（按30°一档）
        const aimDeg = parseFloat(((aimAngle * DEG) % 360).toFixed(1));
        const rangeKey = Math.floor(aimDeg / 30) * 30;
        const key = `${rangeKey}-${rangeKey + 30}`;

        if (!stats.angleRangeHits[key]) {
            stats.angleRangeHits[key] = { total: 0, hit: 0 };
        }
        stats.angleRangeHits[key].total++;
        if (isHit) stats.angleRangeHits[key].hit++;
    }

    /**
     * 获取薄弱角度区间（命中率<60%）
     */
    function getWeakRanges() {
        const weak = [];
        Object.keys(stats.angleRangeHits).forEach(key => {
            const data = stats.angleRangeHits[key];
            if (data.total >= 2) { // 至少2次射击才统计
                const rate = data.hit / data.total;
                if (rate < 0.6) {
                    weak.push({
                        range: key,
                        total: data.total,
                        hit: data.hit,
                        rate: Math.round(rate * 100),
                    });
                }
            }
        });
        return weak;
    }

    /**
     * 生成报告数据
     */
    function generateReport() {
        return {
            score,
            maxCombo,
            stats,
            hitRate: stats.totalShots > 0
                ? Math.round((stats.perfects + stats.excellents + stats.goods + stats.hits) / stats.totalShots * 100)
                : 0,
            weakRanges: getWeakRanges(),
        };
    }

    // ===== 射击解析 =====

    /**
     * 绘制射击解析信息
     */
    function drawShotAnalysis(cx, cy, r) {
        if (!shotAnalysis || shotAnalysis.timer <= 0) return;

        shotAnalysis.timer--;
        if (shotAnalysis.timer <= 0) {
            shotAnalysis = null;
            return;
        }

        const alpha = Math.min(1, shotAnalysis.timer / 30);

        ctx.save();
        ctx.globalAlpha = alpha;

        // 解析面板背景 - 智能定位算法
        const panelW = 120;
        const panelH = 68;
        const margin = 12;

        // 目标位置：圆的右下角（0°线水平位置）
        let panelX = cx + r * 1.15;
        // Y: 在角度卡片下方（角度卡片高度40 + 间距8）
        let panelY = cy + r * 0.55 + 48;

        // 边界检测：确保不超出canvas边界
        if (panelX + panelW + margin > W) {
            panelX = W - panelW - margin;
        }
        if (panelY + panelH + margin > H) {
            panelY = H - panelH - margin;
        }
        // 确保不超出左/上边界
        if (panelX < margin) panelX = margin;
        if (panelY < margin) panelY = margin;

        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 解析标题
        ctx.fillStyle = '#94A3B8';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(GameI18N.t('sniper.analysis.title') || 'Analysis', panelX + 8, panelY + 14);

        // 偏差角度
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`\u0394 = ${shotAnalysis.diffDeg}\u00B0`, panelX + 8, panelY + 30);

        // 弧度值
        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px monospace';
        ctx.fillText(`${shotAnalysis.radian}\u03C0 rad`, panelX + 8, panelY + 44);

        // 命中点坐标
        ctx.fillStyle = '#60A5FA';
        ctx.font = '10px monospace';
        ctx.fillText(`(${shotAnalysis.cos}, ${shotAnalysis.sin})`, panelX + 8, panelY + 58);

        ctx.restore();
    }

    // ===== 公式卡片 =====

    /**
     * 切换公式卡片
     */
    function toggleFormulaCard() {
        if (formulaCard && formulaCard.open) {
            formulaCard = null;
        } else {
            formulaCard = {
                open: true,
                type: 'arcLength',
                timer: 0,
            };
        }
    }

    /**
     * 切换到下一个公式
     */
    function cycleFormulaCard() {
        if (!formulaCard) return;
        const types = ['arcLength', 'sectorArea', 'radian'];
        const idx = types.indexOf(formulaCard.type);
        formulaCard.type = types[(idx + 1) % types.length];
        formulaCard.timer = 0;
    }

    /**
     * 绘制公式卡片
     */
    function drawFormulaCard(cx, cy, r) {
        if (!formulaCard || !formulaCard.open) return;

        formulaCard.timer++;

        const cardW = 180;
        const cardH = 100;
        const cardX = cx - cardW / 2;
        const cardY = cy - r - 130;

        // 卡片背景
        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 公式标题
        const titles = {
            arcLength: GameI18N.t('sniper.formula.arcLength') || 'Arc Length',
            sectorArea: GameI18N.t('sniper.formula.sectorArea') || 'Sector Area',
            radian: GameI18N.t('sniper.formula.radian') || 'Radian',
        };
        const formulas = {
            arcLength: 'l = \u03B8 \u00D7 r',
            sectorArea: 'S = \u00BD \u00D7 \u03B8 \u00D7 r\u00B2',
            radian: '\u03B8(rad) = \u03B1(\u00B0) \u00D7 \u03C0/180',
        };
        const descriptions = {
            arcLength: GameI18N.t('sniper.formula.arcLengthDesc') || 'l = \u03B8r, \u03B8 in radians',
            sectorArea: GameI18N.t('sniper.formula.sectorAreaDesc') || 'S = \u00BD\u03B8r\u00B2',
            radian: GameI18N.t('sniper.formula.radianDesc') || '180\u00B0 = \u03C0 rad',
        };

        ctx.fillStyle = '#60A5FA';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(titles[formulaCard.type], cx, cardY + 22);

        // 公式
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(formulas[formulaCard.type], cx, cardY + 50);

        // 说明
        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(descriptions[formulaCard.type], cx, cardY + 72);

        // 翻页提示
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText(GameI18N.t('sniper.formula.tapToCycle') || 'Tap to cycle', cx, cardY + 90);
    }

    // ===== 皮肤系统 =====

    /**
     * 从 localStorage 加载皮肤
     */
    function loadSkin() {
        try {
            const saved = localStorage.getItem('pi_sniper_skins');
            if (saved) {
                const parsed = JSON.parse(saved);
                // 合并默认值
                Object.keys(parsed).forEach(key => {
                    if (skin.hasOwnProperty(key)) {
                        skin[key] = parsed[key];
                    }
                });
            }
        } catch (e) {
            // 使用默认皮肤
        }
    }

    /**
     * 保存皮肤到 localStorage
     */
    function saveSkin() {
        try {
            localStorage.setItem('pi_sniper_skins', JSON.stringify(skin));
        } catch (e) {
            // 忽略存储错误
        }
    }

    /**
     * 根据皮肤获取瞄准线颜色
     */
    function getLineColor() {
        if (frenzy) return { main: '#F59E0B', glow: 'rgba(245, 158, 11, 0.2)', cross: 'rgba(245, 158, 11, 0.6)' };

        switch (skin.lineColor) {
            case 'gold': return { main: '#F59E0B', glow: 'rgba(245, 158, 11, 0.2)', cross: 'rgba(245, 158, 11, 0.6)' };
            case 'blue': return { main: '#60A5FA', glow: 'rgba(96, 165, 250, 0.2)', cross: 'rgba(96, 165, 250, 0.6)' };
            case 'purple': return { main: '#A78BFA', glow: 'rgba(167, 139, 250, 0.2)', cross: 'rgba(167, 139, 250, 0.6)' };
            case 'rainbow': {
                const hue = (Date.now() / 10) % 360;
                return {
                    main: `hsl(${hue}, 80%, 60%)`,
                    glow: `hsla(${hue}, 80%, 60%, 0.2)`,
                    cross: `hsla(${hue}, 80%, 60%, 0.6)`,
                };
            }
            default: return { main: '#22C55E', glow: 'rgba(34, 197, 94, 0.2)', cross: 'rgba(34, 197, 94, 0.6)' };
        }
    }

    /**
     * 根据皮肤获取圆的样式颜色
     */
    function getCircleColors() {
        const baseColor = frenzy ? [245, 158, 11] : [37, 99, 235];

        switch (skin.circleStyle) {
            case 'neon':
                return {
                    outerGlow: frenzy ? 'rgba(245, 158, 11, 0.4)' : 'rgba(96, 165, 250, 0.4)',
                    main: frenzy ? 'rgba(245, 158, 11, 0.8)' : 'rgba(96, 165, 250, 0.8)',
                    outerWidth: 8,
                    mainWidth: 3,
                    tickColor: 'rgba(148, 163, 184, 0.4)',
                };
            case 'minimal':
                return {
                    outerGlow: 'transparent',
                    main: frenzy ? 'rgba(245, 158, 11, 0.3)' : 'rgba(148, 163, 184, 0.3)',
                    outerWidth: 0,
                    mainWidth: 1,
                    tickColor: 'rgba(148, 163, 184, 0.15)',
                };
            case 'retro':
                return {
                    outerGlow: frenzy ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)',
                    main: frenzy ? 'rgba(245, 158, 11, 0.6)' : 'rgba(34, 197, 94, 0.6)',
                    outerWidth: 4,
                    mainWidth: 2,
                    tickColor: 'rgba(34, 197, 94, 0.3)',
                };
            default:
                return {
                    outerGlow: `rgba(${baseColor.join(', ')}, 0.2)`,
                    main: `rgba(${baseColor.join(', ')}, 0.4)`,
                    outerWidth: 6,
                    mainWidth: 2,
                    tickColor: 'rgba(148, 163, 184, 0.3)',
                };
        }
    }

    /**
     * 根据皮肤获取粒子样式
     */
    function getParticleStyle() {
        switch (skin.particle) {
            case 'star': return 'star';
            case 'fire': return 'fire';
            case 'electric': return 'electric';
            default: return 'standard';
        }
    }

    /**
     * 根据皮肤获取背景渐变
     */
    function getBackgroundGradient(cx, cy, r) {
        switch (skin.background) {
            case 'ocean':
                return [
                    { stop: 0, color: 'rgba(6, 78, 112, 1)' },
                    { stop: 0.5, color: 'rgba(10, 48, 82, 1)' },
                    { stop: 1, color: 'rgba(5, 20, 40, 1)' },
                ];
            case 'forest':
                return [
                    { stop: 0, color: 'rgba(20, 50, 20, 1)' },
                    { stop: 0.5, color: 'rgba(10, 35, 15, 1)' },
                    { stop: 1, color: 'rgba(5, 15, 8, 1)' },
                ];
            case 'cyberpunk':
                return [
                    { stop: 0, color: 'rgba(40, 10, 50, 1)' },
                    { stop: 0.5, color: 'rgba(20, 5, 35, 1)' },
                    { stop: 1, color: 'rgba(8, 2, 15, 1)' },
                ];
            default:
                return [
                    { stop: 0, color: '#0F172A' },
                    { stop: 0.5, color: '#0B1120' },
                    { stop: 1, color: '#070C15' },
                ];
        }
    }

    /**
     * 更新累计统计（用于皮肤解锁判断）
     */
    function updateLifetimeStats() {
        try {
            const lt = JSON.parse(localStorage.getItem('pi_sniper_lifetime') || '{}');
            lt.totalGames = (lt.totalGames || 0) + 1;
            lt.totalPlayTime = (lt.totalPlayTime || 0) + GAME_DURATION; // 记录总游玩时间（秒）
            lt.totalHits = (lt.totalHits || 0) + stats.hits + stats.goods + stats.excellents + stats.perfects;
            lt.totalPerfects = (lt.totalPerfects || 0) + stats.perfects;
            lt.totalMisses = (lt.totalMisses || 0) + stats.misses;
            lt.maxCombo = Math.max(lt.maxCombo || 0, maxCombo);
            lt.totalBossDefeated = (lt.totalBossDefeated || 0) + stats.bossDefeated;
            lt.totalFrenzyCount = (lt.totalFrenzyCount || 0) + stats.frenzyCount;
            lt.totalScore = (lt.totalScore || 0) + score;
            // 额外记录一些极值用于成就和皮肤的进度显示
            lt.maxPerfectsPerGame = Math.max(lt.maxPerfectsPerGame || 0, stats.perfects);
            lt.maxConsecutivePerfects = Math.max(lt.maxConsecutivePerfects || 0, stats.maxConsecutivePerfects || 0);
            lt.maxFrenzyPerGame = Math.max(lt.maxFrenzyPerGame || 0, stats.frenzyCount);

            localStorage.setItem('pi_sniper_lifetime', JSON.stringify(lt));
        } catch (e) {
            // 忽略
        }
    }

    // ===== 粒子系统 =====
    function spawnParticles(x, y, color, count) {
        const style = getParticleStyle();
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * TAU;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.01 + Math.random() * 0.02,
                size: 2 + Math.random() * 4,
                color,
                style,
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // 重力
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    // ===== 知识提示（Canvas内绘制） =====
    let knowledgeTipState = { visible: false, text: '', alpha: 0, timer: 0 };

    function showKnowledgeTip() {
        const tip = knowledgeTips[currentTipIndex % knowledgeTips.length];
        knowledgeTipState.text = tip;
        knowledgeTipState.visible = true;
        knowledgeTipState.alpha = 0;
        knowledgeTipState.timer = 240; // 4秒 @60fps
        currentTipIndex++;

        // 同时更新DOM（备用）
        if (elKnowledgeTip && elKnowledgeText) {
            elKnowledgeText.textContent = tip;
            elKnowledgeTip.classList.add('visible');
            clearTimeout(tipTimer);
            tipTimer = setTimeout(() => {
                if (elKnowledgeTip) elKnowledgeTip.classList.remove('visible');
            }, 4000);
        }
    }

    function updateKnowledgeTip() {
        if (!knowledgeTipState.visible) return;
        if (knowledgeTipState.timer > 0) {
            knowledgeTipState.timer--;
            // 淡入
            if (knowledgeTipState.timer > 210 && knowledgeTipState.alpha < 1) {
                knowledgeTipState.alpha = Math.min(1, knowledgeTipState.alpha + 0.05);
            }
            // 淡出
            if (knowledgeTipState.timer <= 30) {
                knowledgeTipState.alpha = Math.max(0, knowledgeTipState.alpha - 0.05);
            }
        } else {
            knowledgeTipState.visible = false;
        }
    }

    function drawKnowledgeTip(cx, cy, r) {
        if (!knowledgeTipState.visible || knowledgeTipState.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = knowledgeTipState.alpha;

        const tipW = Math.min(280, W * 0.7);
        const margin = 16;

        // 计算多行文字高度
        ctx.font = '12px Inter, sans-serif';
        const maxTextW = tipW - 48;
        const words = knowledgeTipState.text.split('');
        let lines = [];
        let currentLine = '';
        for (const char of words) {
            const testLine = currentLine + char;
            if (ctx.measureText(testLine).width > maxTextW && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = 18;
        const lineCount = lines.length;
        const paddingV = 14;
        const tipH = lineCount * lineHeight + paddingV * 2;

        // 位置：圆左下角外侧（确保不进入圆）
        // let tipX = cx - r - tipW / 2 - r * 0.05;
        let tipX = cx - 2.15 * r;
        let tipY = cy + r * 0.7; // 更远离圆心

        // 边界检测：确保在canvas内且不进入圆
        if (tipX < margin) tipX = margin;
        if (tipY + tipH + margin > H) tipY = H - tipH - margin;

        // 背景
        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.beginPath();
        ctx.roundRect(tipX, tipY, tipW, tipH, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 图标
        ctx.fillStyle = '#FBBF24';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('💡', tipX + 12, tipY + paddingV);

        // 多行文字
        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px Inter, sans-serif';
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], tipX + 34, tipY + paddingV + i * lineHeight);
        }

        ctx.restore();
    }

    // ===== 背景装饰渲染逻辑 =====
    function initBgAnimState(w, h) {
        const cx = w / 2;
        const r = Math.min(w, h) * 0.35;

        // Deep Space: Stars and Planets
        bgAnimState.deepSpace.stars = Array.from({ length: 50 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.5 + 0.5,
            vy: Math.random() * 0.3 + 0.1
        }));
        bgAnimState.deepSpace.planets = [
            { x: w * 0.85, y: h * 0.2, r: Math.min(w, h) * 0.15, type: 'large', color1: '#E2C892', color2: '#9C7238' },
            { x: w * 0.15, y: h * 0.7, r: Math.min(w, h) * 0.06, type: 'small', color1: '#F472B6', color2: '#831843' },
            { x: w * 0.4, y: h * 0.1, r: Math.min(w, h) * 0.03, type: 'small', color1: '#34D399', color2: '#064E3B' }
        ];

        // Ocean: Bubbles, Fishes and Kelps
        bgAnimState.ocean.bubbles = Array.from({ length: 25 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: Math.random() * 3 + 1,
            vy: -(Math.random() * 0.8 + 0.2)
        }));
        bgAnimState.ocean.fishes = Array.from({ length: 8 }, () => ({
            x: Math.random() * w,
            y: h * 0.2 + Math.random() * (h * 0.6),
            speed: (Math.random() * 1.5 + 0.5) * (Math.random() > 0.5 ? 1 : -1),
            size: Math.random() * 8 + 8
        }));
        bgAnimState.ocean.kelps = [];
        for (let i = -10; i <= w + 10; i += Math.max(30, w * 0.05)) {
            bgAnimState.ocean.kelps.push({ x: i, hRatio: 0.6 + Math.random() * 0.4 });
        }

        // Forest: Fireflies, Trees and Cabin
        bgAnimState.forest.fireflies = Array.from({ length: 30 }, () => ({
            x: Math.random() * w,
            y: h * 0.4 + Math.random() * (h * 0.5),
            offset: Math.random() * 100,
            speed: Math.random() * 0.02 + 0.01
        }));
        const trees = [];
        for (let i = -30; i <= w + 30; i += 40) {
            trees.push({ x: i, th: h * 0.2 + Math.random() * h * 0.1, layer: 'far' });
        }
        for (let i = -20; i <= w + 20; i += 60) {
            let th = h * 0.3 + Math.random() * h * 0.15;
            if (i < cx - r - 20 || i > cx + r + 20) {
                th = h * 0.5 + Math.random() * h * 0.3; // 高树分布在两边
            }
            trees.push({ x: i, th: th, layer: 'near' });
        }
        bgAnimState.forest.trees = trees;

        let cabinX = cx + r + 40;
        if (cabinX + 120 > w) cabinX = cx - r - 160;
        if (cabinX < 0) cabinX = w * 0.8;
        const cy = h / 2;
        const maxCabinH = Math.max(100, h - (cy + r) - 30);
        const cabinW = 120;
        const cabinH = Math.min(140, maxCabinH);
        bgAnimState.forest.cabin = { x: cabinX, y: h - cabinH, w: cabinW, h: cabinH };

        // Cyberpunk: Buildings and Cars
        const bWidth = Math.max(40, w / 15);
        const buildings = [];
        for (let x = -20; x < w + 20; x += bWidth * (0.8 + Math.random() * 0.4)) {
            const isOutside = (x + bWidth < cx - r) || (x > cx + r);
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
        bgAnimState.cyberpunk.buildings = buildings;
        bgAnimState.cyberpunk.cars = Array.from({ length: 10 }, () => ({
            x: Math.random() * w,
            y: h * 0.1 + Math.random() * (h * 0.6),
            speed: (Math.random() * 4 + 2) * (Math.random() > 0.5 ? 1 : -1),
            color: ['#F472B6', '#38BDF8', '#34D399', '#FEF08A'][Math.floor(Math.random() * 4)]
        }));

        bgAnimState.lastW = w;
        bgAnimState.lastH = h;
        bgAnimState.initialized = true;
    }

    function drawBackgroundDecorations(ctx, w, h, skinKey, time) {
        if (!bgAnimState.initialized || bgAnimState.lastW !== w || bgAnimState.lastH !== h) {
            initBgAnimState(w, h);
        }

        ctx.save();
        switch (skinKey) {
            case 'deepSpace':
                // Planets
                bgAnimState.deepSpace.planets.forEach(p => {
                    // 星环后半部分（在星球下面）
                    if (p.type === 'large') {
                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate(-Math.PI / 6);

                        // 使用clip限制只画上半部分（后半部分）
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(-p.r * 3, -p.r * 3, p.r * 6, p.r * 3); // 矩形覆盖上半部分
                        ctx.clip();

                        // 绘制内环
                        ctx.beginPath();
                        ctx.ellipse(0, 0, p.r * 1.8, p.r * 0.4, 0, 0, Math.PI * 2);
                        ctx.lineWidth = p.r * 0.15;
                        ctx.strokeStyle = 'rgba(230, 210, 180, 0.4)';
                        ctx.stroke();

                        // 绘制外环
                        ctx.beginPath();
                        ctx.ellipse(0, 0, p.r * 2.2, p.r * 0.5, 0, 0, Math.PI * 2);
                        ctx.lineWidth = p.r * 0.08;
                        ctx.strokeStyle = 'rgba(210, 190, 160, 0.2)';
                        ctx.stroke();

                        ctx.restore(); // 结束后半部分clip
                        ctx.restore(); // 结束整体变换
                    }

                    // 星球本体
                    const grad = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r);
                    grad.addColorStop(0, p.color1);
                    grad.addColorStop(0.7, p.color2);
                    grad.addColorStop(1, '#000000'); // 边缘增加阴影感

                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    if (p.type === 'large') {
                        ctx.shadowColor = p.color1; ctx.shadowBlur = 30;
                    }
                    ctx.fill(); ctx.shadowBlur = 0;

                    // 星球大气层/光晕
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
                    ctx.stroke();

                    // Planet texture (craters/clouds)
                    ctx.save();
                    ctx.clip();
                    if (p.type === 'large') {
                        // 气态行星纹理 (土星/木星风格条纹)
                        for (let i = -0.8; i < 0.8; i += 0.3) {
                            ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.05})`;
                            ctx.beginPath();
                            ctx.ellipse(p.x, p.y + p.r * i, p.r * 1.5, p.r * (0.1 + Math.random() * 0.1), 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else {
                        // 岩石行星纹理 (陨石坑)
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y + p.r * 0.3, p.r * 0.3, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(p.x + p.r * 0.4, p.y - p.r * 0.1, p.r * 0.2, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(p.x - p.r * 0.1, p.y - p.r * 0.4, p.r * 0.15, 0, Math.PI * 2); ctx.fill();
                        // 陨石坑高光
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        ctx.beginPath(); ctx.arc(p.x - p.r * 0.35, p.y + p.r * 0.25, p.r * 0.25, 0, Math.PI * 2); ctx.fill();
                    }

                    // 星球本身的体积阴影(使其更有立体感)
                    const shadowGrad = ctx.createLinearGradient(p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r);
                    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    shadowGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
                    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
                    ctx.fillStyle = shadowGrad;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();

                    // 星环前半部分（在星球上面）
                    if (p.type === 'large') {
                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate(-Math.PI / 6);

                        // 使用clip限制只画下半部分（前半部分）
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(-p.r * 3, 0, p.r * 6, p.r * 3); // 矩形覆盖下半部分
                        ctx.clip();

                        // 绘制内环
                        ctx.beginPath();
                        ctx.ellipse(0, 0, p.r * 1.8, p.r * 0.4, 0, 0, Math.PI * 2);
                        ctx.lineWidth = p.r * 0.15;
                        ctx.strokeStyle = 'rgba(230, 210, 180, 0.7)';
                        ctx.stroke();

                        // 绘制外环
                        ctx.beginPath();
                        ctx.ellipse(0, 0, p.r * 2.2, p.r * 0.5, 0, 0, Math.PI * 2);
                        ctx.lineWidth = p.r * 0.08;
                        ctx.strokeStyle = 'rgba(210, 190, 160, 0.4)';
                        ctx.stroke();

                        ctx.restore(); // 结束前半部分clip

                        // 星环在星球表面的投影
                        ctx.beginPath();
                        ctx.ellipse(0, p.r * 0.1, p.r * 1.8, p.r * 0.4, 0, Math.PI, Math.PI * 2);
                        ctx.lineWidth = p.r * 0.1;
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                        ctx.globalCompositeOperation = 'source-atop'; // 只在星球范围内显示投影(由于星球已画好，这步其实需要独立处理，这里简单用降低透明度的曲线模拟)
                        ctx.stroke();
                        ctx.globalCompositeOperation = 'source-over';

                        ctx.restore(); // 结束整体变换
                    }
                });

                // Stars
                ctx.fillStyle = '#FFF';
                bgAnimState.deepSpace.stars.forEach(s => {
                    s.y += s.vy; if (s.y > h) s.y = 0;
                    ctx.globalAlpha = 0.5 + Math.sin(time * 2 + s.x) * 0.5;
                    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
                });
                break;

            case 'ocean':
                // Bubbles
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                bgAnimState.ocean.bubbles.forEach(b => {
                    b.y += b.vy; if (b.y < 0) b.y = h;
                    b.x += Math.sin(time + b.y * 0.05) * 0.5;
                    ctx.beginPath(); ctx.arc(b.x, b.y, b.s, 0, Math.PI * 2); ctx.fill();
                });

                // Fishes
                bgAnimState.ocean.fishes.forEach(f => {
                    f.x += f.speed;
                    if (f.speed > 0 && f.x > w + 50) f.x = -50;
                    if (f.speed < 0 && f.x < -50) f.x = w + 50;
                    ctx.fillStyle = 'rgba(15, 32, 39, 0.4)';
                    ctx.beginPath();
                    const dir = f.speed > 0 ? 1 : -1;
                    ctx.ellipse(f.x, f.y, f.size, f.size * 0.4, 0, 0, Math.PI * 2);
                    ctx.moveTo(f.x - dir * f.size * 0.8, f.y);
                    ctx.lineTo(f.x - dir * f.size * 1.5, f.y - f.size * 0.5);
                    ctx.lineTo(f.x - dir * f.size * 1.5, f.y + f.size * 0.5);
                    ctx.fill();
                });

                // Seaweed (More realistic and limited height)
                const cy = h / 2;
                const r = Math.min(w, h) * 0.35;
                const bottomY = cy + r + 20; // 避免进入单位圆
                const maxKelpHeight = h - bottomY;

                ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
                ctx.lineCap = 'round';
                bgAnimState.ocean.kelps.forEach((kelp, index) => {
                    const kHeight = Math.max(50, maxKelpHeight * kelp.hRatio);
                    ctx.lineWidth = Math.max(3, w * 0.008);
                    ctx.beginPath();
                    ctx.moveTo(kelp.x, h);

                    let curX = kelp.x;
                    let curY = h;
                    const segments = 4;
                    const segH = kHeight / segments;
                    for (let j = 1; j <= segments; j++) {
                        const sway = Math.sin(time * 2 + kelp.x + j) * 15 * (j / segments);
                        const nextX = kelp.x + sway;
                        const nextY = h - segH * j;
                        const cpX = curX + (nextX - curX) / 2 + (Math.cos(time * 3 + kelp.x) * 10);
                        const cpY = curY - segH / 2;
                        ctx.quadraticCurveTo(cpX, cpY, nextX, nextY);
                        curX = nextX;
                        curY = nextY;
                    }
                    ctx.stroke();
                });
                break;

            case 'forest':
                // Trees
                bgAnimState.forest.trees.forEach(t => {
                    ctx.fillStyle = t.layer === 'far' ? '#022C22' : '#064E3B';
                    ctx.beginPath();
                    ctx.moveTo(t.x, h);
                    ctx.lineTo(t.x + 15, h - t.th * 0.4);
                    ctx.lineTo(t.x + 5, h - t.th * 0.4);
                    ctx.lineTo(t.x + 20, h - t.th * 0.7);
                    ctx.lineTo(t.x + 10, h - t.th * 0.7);
                    ctx.lineTo(t.x + 25, h - t.th);
                    ctx.lineTo(t.x + 40, h - t.th * 0.7);
                    ctx.lineTo(t.x + 30, h - t.th * 0.7);
                    ctx.lineTo(t.x + 45, h - t.th * 0.4);
                    ctx.lineTo(t.x + 35, h - t.th * 0.4);
                    ctx.lineTo(t.x + 50, h);
                    ctx.fill();
                });

                // Cabin
                const cb = bgAnimState.forest.cabin;
                ctx.fillStyle = '#451A03';
                ctx.fillRect(cb.x, cb.y, cb.w, cb.h);
                ctx.fillStyle = '#270e01';
                ctx.fillRect(cb.x + cb.w * 0.2, cb.y + cb.h * 0.5, cb.w * 0.25, cb.h * 0.5);
                ctx.fillStyle = '#1e0a00';
                ctx.beginPath(); ctx.moveTo(cb.x - 10, cb.y); ctx.lineTo(cb.x + cb.w / 2, cb.y - 40); ctx.lineTo(cb.x + cb.w + 10, cb.y); ctx.fill();
                ctx.fillStyle = '#FEF08A'; ctx.shadowColor = '#FEF08A'; ctx.shadowBlur = 20;
                ctx.fillRect(cb.x + cb.w * 0.6, cb.y + cb.h * 0.4, cb.w * 0.25, cb.h * 0.25); ctx.shadowBlur = 0;
                ctx.fillStyle = '#451A03';
                ctx.fillRect(cb.x + cb.w * 0.6 + cb.w * 0.11, cb.y + cb.h * 0.4, cb.w * 0.03, cb.h * 0.25);
                ctx.fillRect(cb.x + cb.w * 0.6, cb.y + cb.h * 0.4 + cb.h * 0.11, cb.w * 0.25, cb.h * 0.03);

                // Fireflies
                ctx.fillStyle = '#FEF08A';
                bgAnimState.forest.fireflies.forEach(f => {
                    f.y += Math.sin(time + f.offset) * 0.5;
                    f.x += Math.cos(time * 0.8 + f.offset) * 0.5;
                    ctx.globalAlpha = Math.abs(Math.sin(time * 2 + f.offset));
                    ctx.beginPath(); ctx.arc(f.x, f.y, 2, 0, Math.PI * 2); ctx.fill();
                });
                break;

            case 'cyberpunk':
                // Buildings
                bgAnimState.cyberpunk.buildings.forEach(b => {
                    ctx.fillStyle = '#0F172A';
                    ctx.fillRect(b.x, h - b.h, b.w, b.h);

                    if (b.isOutside) {
                        ctx.fillStyle = '#1E293B';
                        ctx.fillRect(b.x + b.w * 0.3, h - b.h - 30, b.w * 0.4, 30);
                        ctx.fillRect(b.x + b.w * 0.45, h - b.h - 60, b.w * 0.1, 30);
                        ctx.strokeStyle = b.windows[0].color;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(b.x, h - b.h, b.w, b.h);
                    }

                    ctx.globalAlpha = 0.8;
                    b.windows.forEach(win => {
                        ctx.fillStyle = win.color;
                        if (b.isOutside && Math.random() > 0.5) {
                            ctx.shadowColor = win.color; ctx.shadowBlur = 5;
                            ctx.fillRect(b.x + win.wx * (b.w - 12) + 6, h - b.h + win.wy * (b.h - 20) + 10, 6, 12);
                            ctx.shadowBlur = 0;
                        } else {
                            ctx.fillRect(b.x + win.wx * (b.w - 8) + 4, h - b.h + win.wy * (b.h - 8) + 4, 3, 6);
                        }
                    });
                    ctx.globalAlpha = 1;
                });

                // Flying Cars (Light streaks)
                bgAnimState.cyberpunk.cars.forEach(c => {
                    c.x += c.speed;
                    if (c.speed > 0 && c.x > w + 50) c.x = -50;
                    if (c.speed < 0 && c.x < -50) c.x = w + 50;
                    ctx.strokeStyle = c.color;
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + 40 * (c.speed > 0 ? -1 : 1), c.y);
                    ctx.shadowColor = c.color; ctx.shadowBlur = 10;
                    ctx.stroke(); ctx.shadowBlur = 0;
                });
                break;
        }
        ctx.restore();
    }

    // ===== UI 更新 =====
    function updateUI() {
        if (elScore) elScore.textContent = score;
        if (elCombo) elCombo.textContent = combo;
        if (elTime) elTime.textContent = timeLeft;
    }

    // ===== 渲染 =====
    function getUnitR() {
        return Math.min(W, H) * 0.35;
    }

    function getCx() { return W / 2; }
    function getCy() { return H / 2; }

    function gameLoop() {
        if (!active) return;
        update();
        draw();
        animId = requestAnimationFrame(gameLoop);
    }

    function update() {
        // 冻结道具：目标停止脉冲
        if (activePowerup && activePowerup.type === 'freeze') {
            // 不更新 targetPulse
        } else {
            targetPulse += 0.05;
        }

        updateParticles();
        updatePowerups();

        if (feedbackTimer > 0) feedbackTimer--;

        // Boss更新
        updateBoss();

        // 双倍得分计时
        if (doubleScoreTimer > 0) doubleScoreTimer--;

        // Boss警告计时
        if (bossWarningTimer > 0) bossWarningTimer--;

        // 知识提示更新
        updateKnowledgeTip();
    }

    function draw() {
        if (!ctx) return;
        const cx = getCx(), cy = getCy(), r = getUnitR();

        // 清屏（使用皮肤背景）
        const bgStops = getBackgroundGradient(cx, cy, r);
        if (bgStops.length > 1) {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
            bgStops.forEach(s => grad.addColorStop(s.stop, s.color));
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = bgStops[0].color;
        }
        ctx.fillRect(0, 0, W, H);

        // 背景装饰动画
        drawBackgroundDecorations(ctx, W, H, skin.background, Date.now() / 1000);

        // Frenzy 背景效果
        if (frenzy) {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
            grad.addColorStop(0, 'rgba(245, 158, 11, 0.05)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        }

        // 绘制单位圆
        drawUnitCircle(cx, cy, r);

        // 绘制目标
        drawTarget(cx, cy, r);

        // 绘制Boss效果（在目标之上）
        if (boss) drawBoss(cx, cy, r);

        // 绘制瞄准线
        if (running) drawAimLine(cx, cy, r);

        // 绘制粒子
        drawParticles();

        // 绘制道具
        if (running) drawPowerups(cx, cy, r);

        // 绘制反馈文字
        drawFeedback(cx, cy, r);

        // 绘制角度信息
        drawAngleInfo(cx, cy, r);

        // 绘制射击解析
        if (running) drawShotAnalysis(cx, cy, r);

        // 绘制公式卡片
        drawFormulaCard(cx, cy, r);

        // 绘制成就通知
        drawAchievementNotify(cx, cy);

        // 绘制公式卡片按钮
        if (running) drawFormulaCardButton();

        // 绘制Boss警告
        if (bossWarningTimer > 0) drawBossWarning(cx, cy, r);

        // 绘制双倍得分指示
        if (doubleScoreTimer > 0) drawDoubleScoreIndicator(cx, cy, r);

        // 绘制知识提示（Canvas内绘制）
        drawKnowledgeTip(cx, cy, r);
    }

    function drawUnitCircle(cx, cy, r) {
        const colors = getCircleColors();

        // 外圈光晕
        if (colors.outerWidth > 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, r + 3, 0, TAU);
            ctx.strokeStyle = colors.outerGlow;
            ctx.lineWidth = colors.outerWidth;
            ctx.stroke();
        }

        // 主圆
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.strokeStyle = colors.main;
        ctx.lineWidth = colors.mainWidth;
        ctx.stroke();

        // 刻度线（每30度）
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            const inner = r - 8;
            const outer = r + 8;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * inner, cy - Math.sin(a) * inner);
            ctx.lineTo(cx + Math.cos(a) * outer, cy - Math.sin(a) * outer);
            ctx.strokeStyle = colors.tickColor;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 小刻度（每15度）
        for (let i = 0; i < 24; i++) {
            if (i % 2 === 0) continue;
            const a = (i / 24) * TAU;
            const inner = r - 4;
            const outer = r + 4;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * inner, cy - Math.sin(a) * inner);
            ctx.lineTo(cx + Math.cos(a) * outer, cy - Math.sin(a) * outer);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 角度标签（0°, 90°, 180°, 270°）
        const labels = [
            { angle: 0, text: '0\u00B0' },
            { angle: PI / 2, text: '90\u00B0' },
            { angle: PI, text: '180\u00B0' },
            { angle: PI * 1.5, text: '270\u00B0' }
        ];
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        labels.forEach(l => {
            const lx = cx + Math.cos(l.angle) * (r + 22);
            const ly = cy - Math.sin(l.angle) * (r + 22);
            ctx.fillText(l.text, lx, ly);
        });

        // 坐标轴
        ctx.beginPath();
        ctx.moveTo(cx - r - 15, cy);
        ctx.lineTo(cx + r + 15, cy);
        ctx.moveTo(cx, cy - r - 15);
        ctx.lineTo(cx, cy + r + 15);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 圆心点
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, TAU);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.fill();
    }

    function drawTarget(cx, cy, r) {
        // Boss模式下目标由drawBoss绘制
        if (boss) return;

        const tx = cx + Math.cos(targetAngle) * r;
        const ty = cy - Math.sin(targetAngle) * r;
        const pulse = Math.sin(targetPulse) * 0.3 + 1;

        // 外圈脉冲
        ctx.beginPath();
        ctx.arc(tx, ty, 12 * pulse, 0, TAU);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 * (2 - pulse)})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 目标点
        ctx.beginPath();
        ctx.arc(tx, ty, 7, 0, TAU);
        ctx.fillStyle = '#EF4444';
        ctx.fill();

        // 内部亮点
        ctx.beginPath();
        ctx.arc(tx - 2, ty - 2, 2, 0, TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();

        // 目标角度标注
        const targetDeg = ((targetAngle * DEG) % 360).toFixed(0);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        const labelR = r + 38;
        ctx.fillText(`${targetDeg}\u00B0`, cx + Math.cos(targetAngle) * labelR, cy - Math.sin(targetAngle) * labelR);
    }

    function drawAimLine(cx, cy, r) {
        const endX = cx + Math.cos(aimAngle) * r;
        const endY = cy - Math.sin(aimAngle) * r;
        const lineColors = getLineColor();

        // 瞄准线光晕
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = lineColors.glow;
        ctx.lineWidth = 6;
        ctx.stroke();

        // 瞄准线
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = lineColors.main;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 瞄准点
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, TAU);
        ctx.fillStyle = lineColors.main;
        ctx.fill();

        // 准星样式
        drawCrosshair(endX, endY, lineColors);
    }

    /**
     * 绘制准星（根据皮肤）
     */
    function drawCrosshair(x, y, lineColors) {
        switch (skin.crosshair) {
            case 'circle': {
                // 圆形准星
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, TAU);
                ctx.strokeStyle = lineColors.cross;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, TAU);
                ctx.fillStyle = lineColors.main;
                ctx.fill();
                break;
            }
            case 'laser': {
                // 激光准星：四个短线段
                const gap = 4;
                const len = 12;
                ctx.strokeStyle = lineColors.main;
                ctx.lineWidth = 1.5;
                // 上
                ctx.beginPath();
                ctx.moveTo(x, y - gap);
                ctx.lineTo(x, y - gap - len);
                ctx.stroke();
                // 下
                ctx.beginPath();
                ctx.moveTo(x, y + gap);
                ctx.lineTo(x, y + gap + len);
                ctx.stroke();
                // 左
                ctx.beginPath();
                ctx.moveTo(x - gap, y);
                ctx.lineTo(x - gap - len, y);
                ctx.stroke();
                // 右
                ctx.beginPath();
                ctx.moveTo(x + gap, y);
                ctx.lineTo(x + gap + len, y);
                ctx.stroke();
                // 中心点
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, TAU);
                ctx.fillStyle = lineColors.main;
                ctx.fill();
                break;
            }
            case 'bow': {
                // 弓形准星
                ctx.beginPath();
                ctx.arc(x, y, 12, -PI * 0.3, PI * 0.3);
                ctx.strokeStyle = lineColors.main;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, 12, PI * 0.7, PI * 1.3);
                ctx.strokeStyle = lineColors.main;
                ctx.lineWidth = 2;
                ctx.stroke();
                // 中心
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, TAU);
                ctx.fillStyle = lineColors.main;
                ctx.fill();
                break;
            }
            default: {
                // 默认十字准星
                const crossSize = 8;
                ctx.beginPath();
                ctx.moveTo(x - crossSize, y);
                ctx.lineTo(x + crossSize, y);
                ctx.moveTo(x, y - crossSize);
                ctx.lineTo(x, y + crossSize);
                ctx.strokeStyle = lineColors.cross;
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
            }
        }
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;

            switch (p.style) {
                case 'star': {
                    // 星形粒子
                    drawStar(p.x, p.y, p.size * p.life, p.color);
                    break;
                }
                case 'fire': {
                    // 火焰粒子（向上飘动）
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * p.life * 1.2, 0, TAU);
                    const fireGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * p.life * 1.2);
                    fireGrad.addColorStop(0, '#FFF');
                    fireGrad.addColorStop(0.3, p.color);
                    fireGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = fireGrad;
                    ctx.fill();
                    break;
                }
                case 'electric': {
                    // 电弧粒子
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                    // 电弧线
                    if (Math.random() > 0.5) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        const ex = p.x + (Math.random() - 0.5) * 10;
                        const ey = p.y + (Math.random() - 0.5) * 10;
                        ctx.lineTo(ex, ey);
                        ctx.strokeStyle = p.color;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                    break;
                }
                default: {
                    // 标准圆形粒子
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                    break;
                }
            }

            ctx.restore();
        });
    }

    /**
     * 绘制星形
     */
    function drawStar(x, y, size, color) {
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size * 0.4;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / (spikes * 2)) * TAU - PI / 2;
            const sx = x + Math.cos(angle) * radius;
            const sy = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawFeedback(cx, cy, r) {
        if (feedbackTimer <= 0 || !feedbackText) return;

        const alpha = Math.min(1, feedbackTimer / 20);
        const offsetY = (40 - feedbackTimer) * 0.5;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = feedbackColor;
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(feedbackText, cx, cy - r - 50 - offsetY);
        ctx.restore();
    }

    function drawAngleInfo(cx, cy, r) {
        if (!running) return;

        const aimDeg = ((aimAngle * DEG) % 360).toFixed(1);
        const aimRad = (aimAngle / PI).toFixed(3);

        // 角度显示框 - 圆右下角
        const boxW = 120;
        const boxH = 40;
        const margin = 12;

        // X: 与解析卡片左边缘完全对齐
        let boxX = cx + r * 1.15;
        // Y: 圆右下角位置
        let boxY = cy + r * 0.55;

        // 边界检测
        if (boxX + boxW + margin > W) boxX = W - boxW - margin;
        if (boxX < margin) boxX = margin;
        if (boxY < margin) boxY = margin;

        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 文字：基于boxX绘制，与解析卡片对齐
        const textCenterX = boxX + boxW / 2;
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${aimDeg}\u00B0`, textCenterX, boxY + 14);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px monospace';
        ctx.fillText(`${aimRad}\u03C0 rad`, textCenterX, boxY + 30);
    }

    /**
     * 绘制公式卡片按钮
     */
    function drawFormulaCardButton() {
        const btnX = W - 50;
        const btnY = 10;
        const btnW = 40;
        const btnH = 30;

        ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 6);
        ctx.fill();
        ctx.strokeStyle = formulaCard && formulaCard.open ? 'rgba(96, 165, 250, 0.6)' : 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = formulaCard && formulaCard.open ? '#60A5FA' : '#94A3B8';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('fx', btnX + btnW / 2, btnY + btnH / 2);
    }

    /**
     * 绘制Boss警告效果
     */
    function drawBossWarning(cx, cy, r) {
        const alpha = Math.abs(Math.sin(bossWarningTimer * 0.1)) * 0.5;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 红色边框闪烁
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, W - 4, H - 4);

        // 警告文字
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(GameI18N.t('sniper.boss.warning') || 'WARNING', cx, cy - r - 60);

        ctx.restore();
    }

    /**
     * 绘制双倍得分指示
     */
    function drawDoubleScoreIndicator(cx, cy, r) {
        const sec = Math.ceil(doubleScoreTimer / 60);

        ctx.save();
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const indicatorY = cy - r - 95;
        ctx.fillText(`x2 ${sec}s`, cx, indicatorY);

        // 闪烁效果
        if (doubleScoreTimer < 180) {
            ctx.globalAlpha = Math.abs(Math.sin(doubleScoreTimer * 0.15));
        }

        ctx.restore();
    }

    function drawStaticPreview() {
        if (!ctx) return;
        const cx = getCx(), cy = getCy(), r = getUnitR();

        // 使用皮肤背景
        const bgStops = getBackgroundGradient(cx, cy, r);
        if (bgStops.length > 1) {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
            bgStops.forEach(s => grad.addColorStop(s.stop, s.color));
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = bgStops[0].color;
        }
        ctx.fillRect(0, 0, W, H);

        drawUnitCircle(cx, cy, r);
    }

    return { show, hide, equipSkin, showAchievementDetail, showSkinDetail };
})();

// 显式挂载到全局作用域供 onclick 事件调用
window.PiSniper = PiSniper;
