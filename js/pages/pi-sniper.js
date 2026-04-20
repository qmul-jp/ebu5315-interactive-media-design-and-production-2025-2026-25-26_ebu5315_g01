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
    // ======= 海洋皮肤辅助绘制函数 =======
    function getOceanSeabedY(x, w, h) {
        return h * 0.88 + Math.sin(x * 0.005) * (h * 0.04) + Math.cos(x * 0.01) * (h * 0.02);
    }

    function drawOceanCrab(ctx, crab, time, w, h) {
        ctx.save();
        ctx.translate(crab.x, getOceanSeabedY(crab.x, w, h) - crab.size * 0.3);

        // 身体
        ctx.fillStyle = '#E11D48'; // 亮红色
        ctx.beginPath();
        ctx.ellipse(0, 0, crab.size, crab.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(0,0,0,0.5)'; // 身体阴影

        // 眼睛 (螃蟹是横着走的，眼睛朝向正上方)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-crab.size * 0.2, -crab.size * 0.6, crab.size * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(crab.size * 0.2, -crab.size * 0.6, crab.size * 0.1, 0, Math.PI * 2); ctx.fill();

        // 钳子动画 (一只高举，一只低垂，横着走时不变)
        const clawAngle = Math.sin(time * 5 + crab.phase) * 0.1; // 轻微晃动

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
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.4, 0, Math.PI); ctx.fill();
            // 绘制钳子上半部分 (张开)
            ctx.fillStyle = '#E11D48';
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.35, Math.PI + 0.1, Math.PI * 2 - 0.3); ctx.fill();
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
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.4, 0, Math.PI); ctx.fill();
            // 绘制钳子上半部分 (张开)
            ctx.fillStyle = '#E11D48';
            ctx.beginPath(); ctx.arc(0, 0, crab.size * 0.35, Math.PI + 0.1, Math.PI * 2 - 0.3); ctx.fill();
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

        // 计算倾斜游动的插值进度
        let progress = 0;
        if (fish.speed > 0) {
            progress = (fish.x + fish.size * 2) / (w + fish.size * 4);
        } else {
            progress = (w + fish.size * 2 - fish.x) / (w + fish.size * 4);
        }
        progress = Math.max(0, Math.min(1, progress));
        const currentY = fish.y + (fish.targetY - fish.y) * progress;

        // 计算游动角度
        const dx = w + fish.size * 4;
        const dy = fish.targetY - fish.y;
        let angle = Math.atan2(dy, dx);
        if (fish.speed < 0) angle *= -1; // 适配翻转

        ctx.translate(fish.x, currentY + Math.sin(time * 2 + fish.yOffset) * fish.size * 0.1);

        const isRight = fish.speed > 0;
        if (!isRight) ctx.scale(-1, 1);
        ctx.rotate(angle);

        const tailAngle = Math.sin(time * 8 + fish.yOffset) * 0.3;

        if (fish.type === 'A') {
            // 优雅型深海蓝
            const grad = ctx.createLinearGradient(-fish.size, 0, fish.size, 0);
            grad.addColorStop(0, 'rgba(14, 116, 144, 0.7)');
            grad.addColorStop(1, 'rgba(6, 182, 212, 0.7)');
            ctx.fillStyle = grad;

            // 身体
            ctx.beginPath(); ctx.ellipse(0, 0, fish.size, fish.size * 0.3, 0, 0, Math.PI * 2); ctx.fill();

            // 尾巴 (更精致的分叉尾鳍)
            ctx.save();
            ctx.translate(-fish.size * 0.8, 0);
            ctx.rotate(tailAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-fish.size * 0.5, -fish.size * 0.2, -fish.size * 0.8, -fish.size * 0.6);
            ctx.quadraticCurveTo(-fish.size * 0.5, 0, -fish.size * 0.4, 0);
            ctx.quadraticCurveTo(-fish.size * 0.5, 0, -fish.size * 0.8, fish.size * 0.6);
            ctx.quadraticCurveTo(-fish.size * 0.5, fish.size * 0.2, 0, 0);
            ctx.fill();
            ctx.restore();

            // 侧鳍
            ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
            ctx.beginPath(); ctx.ellipse(-fish.size * 0.2, fish.size * 0.15, fish.size * 0.3, fish.size * 0.1, Math.PI / 6, 0, Math.PI * 2); ctx.fill();
            // 背鳍
            ctx.beginPath(); ctx.ellipse(-fish.size * 0.1, -fish.size * 0.25, fish.size * 0.4, fish.size * 0.15, -Math.PI / 12, Math.PI, Math.PI * 2); ctx.fill();

            // 眼睛
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(fish.size * 0.6, -fish.size * 0.05, fish.size * 0.05, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(fish.size * 0.62, -fish.size * 0.07, fish.size * 0.02, 0, Math.PI * 2); ctx.fill();

            // 侧面花纹
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = fish.size * 0.05;
            ctx.beginPath(); ctx.moveTo(-fish.size * 0.3, 0); ctx.quadraticCurveTo(0, fish.size * 0.1, fish.size * 0.4, 0); ctx.stroke();

        } else {
            // 宽胖型橙黄色
            const grad = ctx.createLinearGradient(-fish.size, 0, fish.size, 0);
            grad.addColorStop(0, 'rgba(234, 88, 12, 0.6)');
            grad.addColorStop(1, 'rgba(251, 146, 60, 0.6)');
            ctx.fillStyle = grad;

            // 身体
            ctx.beginPath(); ctx.ellipse(0, 0, fish.size, fish.size * 0.5, 0, 0, Math.PI * 2); ctx.fill();

            // 白色条纹 (花纹)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = fish.size * 0.15;
            ctx.beginPath(); ctx.moveTo(0, -fish.size * 0.45); ctx.lineTo(0, fish.size * 0.45); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fish.size * 0.4, -fish.size * 0.35); ctx.lineTo(fish.size * 0.4, fish.size * 0.35); ctx.stroke();

            // 尾巴 (宽大扇形)
            ctx.save();
            ctx.translate(-fish.size * 0.8, 0);
            ctx.rotate(tailAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-fish.size * 0.4, -fish.size * 0.8, -fish.size * 0.6, -fish.size * 0.7);
            ctx.quadraticCurveTo(-fish.size * 0.4, 0, -fish.size * 0.6, fish.size * 0.7);
            ctx.quadraticCurveTo(-fish.size * 0.4, fish.size * 0.8, 0, 0);
            ctx.fill();
            ctx.restore();

            // 侧鳍
            ctx.fillStyle = 'rgba(251, 146, 60, 0.6)';
            ctx.beginPath(); ctx.ellipse(-fish.size * 0.1, fish.size * 0.2, fish.size * 0.25, fish.size * 0.15, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
            // 背鳍
            ctx.beginPath(); ctx.ellipse(-fish.size * 0.2, -fish.size * 0.4, fish.size * 0.3, fish.size * 0.2, -Math.PI / 6, Math.PI, Math.PI * 2); ctx.fill();

            // 眼睛 (可爱黑点)
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(fish.size * 0.7, -fish.size * 0.1, fish.size * 0.12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(fish.size * 0.73, -fish.size * 0.1, fish.size * 0.06, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(fish.size * 0.75, -fish.size * 0.12, fish.size * 0.02, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    function drawOceanJellyfish(ctx, jelly, time) {
        ctx.save();
        const scale = 1 + Math.sin(time * 3 + jelly.phase) * 0.05;
        // 总路程约为单位圆的八分之一，即 r/4 的上下浮动 (振幅约为 r/8)
        // jelly.size 约为 r * 0.15，所以振幅用 jelly.size * 0.8 差不多
        const yOffset = Math.sin(time * 0.5 + jelly.phase) * jelly.size * 0.8;

        // 倾斜10度
        ctx.translate(jelly.x, jelly.y + yOffset);
        ctx.rotate(10 * Math.PI / 180);
        ctx.scale(scale, scale);

        // 粉色伞盖
        ctx.fillStyle = 'rgba(244, 114, 182, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, jelly.size, Math.PI, Math.PI * 2);
        ctx.quadraticCurveTo(jelly.size, jelly.size * 0.2, 0, jelly.size * 0.2);
        ctx.quadraticCurveTo(-jelly.size, jelly.size * 0.2, -jelly.size, 0);
        ctx.fill();

        // 紫色斑点
        ctx.fillStyle = 'rgba(147, 51, 234, 0.5)';
        ctx.beginPath(); ctx.arc(-jelly.size * 0.4, -jelly.size * 0.4, jelly.size * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(jelly.size * 0.3, -jelly.size * 0.6, jelly.size * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(jelly.size * 0.5, -jelly.size * 0.3, jelly.size * 0.12, 0, Math.PI * 2); ctx.fill();

        // 触须
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
        ctx.lineWidth = jelly.size * 0.08;
        ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
            const startX = i * jelly.size * 0.3;
            ctx.beginPath(); ctx.moveTo(startX, jelly.size * 0.2);
            let curX = startX, curY = jelly.size * 0.2;
            const segments = 4, segH = jelly.size * 0.4;
            for (let j = 1; j <= segments; j++) {
                const sway = Math.sin(time * 4 + jelly.phase + j) * jelly.size * 0.15;
                const nextX = startX + sway;
                const nextY = curY + segH;
                const cpX = curX + (nextX - curX) / 2 + Math.cos(time * 5 + jelly.phase) * jelly.size * 0.1;
                const cpY = curY + segH / 2;
                ctx.quadraticCurveTo(cpX, cpY, nextX, nextY);
                curX = nextX; curY = nextY;
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
            // 极简的手指珊瑚（几根带波浪摆动的粗线条）
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = coral.size * 0.3;

            const numFingers = 3;
            for (let i = 0; i < numFingers; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);

                // 角度散开
                const angleOffset = (i - (numFingers - 1) / 2) * 0.4;
                const length = coral.size * (0.8 + Math.sin(coral.x + i) * 0.2);
                const endX = Math.sin(angleOffset) * length;
                const endY = -Math.cos(angleOffset) * length;

                // 随波浪轻微摆动
                const sway = Math.sin(time * 2 + coral.x + i) * length * 0.1;

                ctx.quadraticCurveTo(endX * 0.5 + sway, endY * 0.5, endX, endY);
                ctx.stroke();
            }
        } else {
            // 极简的脑状/半球珊瑚（半圆+内圈纹理）
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(0, 0, coral.size * 0.8, Math.PI, Math.PI * 2);
            ctx.fill();

            // 添加简单的同心半圆作为纹理
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = coral.size * 0.08;
            ctx.beginPath(); ctx.arc(0, 0, coral.size * 0.5, Math.PI, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, coral.size * 0.25, Math.PI, Math.PI * 2); ctx.stroke();
        }

        ctx.restore();
    }

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
            { x: w * 0.15, y: h * 0.7, r: Math.min(w, h) * 0.06, type: 'moon', color1: '#67E8F9', color2: '#0284C7', hasSatellite: true },
            { x: w * 0.4, y: h * 0.1, r: Math.min(w, h) * 0.03, type: 'gas', color1: '#E879F9', color2: '#86198F' }
        ];

        // Ocean: Bubbles, Large Fishes, Crabs, Jellyfishes, Kelps, Corals
        bgAnimState.ocean.bubbles = Array.from({ length: 25 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: Math.random() * 3 + 1,
            vy: -(Math.random() * 0.8 + 0.2)
        }));

        // 2 大鱼
        const fishArea = Math.PI * r * r * 0.25;
        const fishLen = Math.sqrt(fishArea / 0.4);
        bgAnimState.ocean.largeFishes = [
            { type: 'A', x: -fishLen * 2, y: h * 0.35, targetY: h * 0.65, speed: 1.5, size: fishLen * 0.8, yOffset: Math.random() * Math.PI * 2 },
            { type: 'B', x: w + fishLen * 2, y: h * 0.7, targetY: h * 0.4, speed: -1.0, size: fishLen * 0.9, yOffset: Math.random() * Math.PI * 2 }
        ];

        // 2 螃蟹
        bgAnimState.ocean.crabs = [
            { cx: w * 0.2, range: w * 0.1, x: w * 0.2, speed: 0.5, size: r * 0.15, phase: Math.random() * Math.PI * 2 },
            { cx: w * 0.8, range: w * 0.15, x: w * 0.8, speed: -0.4, size: r * 0.12, phase: Math.random() * Math.PI * 2 }
        ];

        // 水母群
        const jellyBaseX = w * 0.85;
        const jellyBaseY = h * 0.35;
        bgAnimState.ocean.jellyfishes = Array.from({ length: 4 }, () => ({
            x: jellyBaseX + (Math.random() - 0.5) * r * 0.6,
            y: jellyBaseY + (Math.random() - 0.5) * r * 0.6,
            size: r * 0.15 + Math.random() * r * 0.05,
            phase: Math.random() * Math.PI * 2
        }));

        // 错落的海草
        bgAnimState.ocean.kelps = [];
        const kelpClusters = [w * 0.15, w * 0.25, w * 0.75, w * 0.85];
        kelpClusters.forEach(kx => {
            for (let i = 0; i < 5; i++) {
                bgAnimState.ocean.kelps.push({
                    x: kx + (Math.random() - 0.5) * w * 0.1,
                    hRatio: 0.3 + Math.random() * 0.3
                });
            }
        });

        // 珊瑚礁 (远离中心)
        bgAnimState.ocean.corals = [];
        // 还原：左下角
        const coralX = w * 0.1;

        // 背景层（后层）珊瑚：更高大，颜色偏暗/偏紫/偏蓝，营造层次感
        for (let i = 0; i < 4; i++) {
            const bgType = Math.random() > 0.5 ? 'brain' : 'finger';
            // 如果是深蓝色的直立珊瑚（finger），将它的 x 坐标往左偏移（减去一点点距离），避免与前方珊瑚重叠
            // 假设小珊瑚群大约在 coralX ± w*0.04 之间，我们将大直立珊瑚放在 coralX - w*0.1 左右
            const baseBgX = bgType === 'finger' ? (coralX - w * 0.06) : coralX;
            bgAnimState.ocean.corals.push({
                x: baseBgX + (Math.random() - 0.5) * w * 0.05,
                type: bgType,
                size: r * 0.2 + Math.random() * r * 0.15, // 尺寸更大
                color: bgType === 'brain' ? '#7E22CE' : '#4338CA', // 脑状(半圆)固定紫色，直立(手指)固定深蓝色
                layer: 'bg' // 标记为背景层
            });
        }

        // 前景层（现有的低矮珊瑚）
        for (let i = 0; i < 6; i++) {
            bgAnimState.ocean.corals.push({
                x: coralX + (Math.random() - 0.5) * w * 0.08,
                type: Math.random() > 0.5 ? 'brain' : 'finger', // 恢复为简单的随机类型
                size: r * 0.1 + Math.random() * r * 0.1, // 尺寸适中
                color: Math.random() > 0.5 ? '#E11D48' : '#EA580C', // 红色和橙色
                layer: 'fg' // 标记为前景层
            });
        }

        // Forest: Fireflies, Trees and Cabin
        bgAnimState.forest.fireflies = Array.from({ length: 30 }, () => ({
            x: Math.random() * w,
            y: h * 0.4 + Math.random() * (h * 0.5),
            offset: Math.random() * 100,
            speed: Math.random() * 0.02 + 0.01
        }));
        const trees = [];
        // 远景树木：增大基础间距，并引入随机间距
        let farX = -30;
        while (farX <= w + 30) {
            trees.push({ x: farX, th: h * 0.2 + Math.random() * h * 0.1, layer: 'far' });
            // 基础间距 80，外加 0 到 40 的随机增量
            farX += 80 + Math.random() * 40;
        }

        // 近景树木：增大基础间距，并引入随机间距
        let nearX = -20;
        while (nearX <= w + 20) {
            let th = h * 0.3 + Math.random() * h * 0.15;
            if (nearX < cx - r - 20 || nearX > cx + r + 20) {
                th = h * 0.5 + Math.random() * h * 0.3; // 高树分布在两边
            }
            trees.push({ x: nearX, th: th, layer: 'near' });
            // 基础间距 120，外加 0 到 60 的随机增量
            nearX += 120 + Math.random() * 60;
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

        // 小鹿状态机
        bgAnimState.forest.deer = {
            state: 'running_in', // running_in, looking_around, running_out, waiting
            x: -200, // 初始位置在屏幕左侧外
            y: h - 8, // 更靠近底部
            targetX: w * 0.3 + Math.random() * (w * 0.1), // 跑入目标位置
            speed: w * 0.001, // 速度减半，走得慢一点
            timer: 0,
            headAngle: 0,
            jumpOffset: 0 // 跳跃偏移量
        };

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
        bgAnimState.cyberpunk.cars = Array.from({ length: 12 }, () => ({
            x: Math.random() * w,
            y: h * 0.1 + Math.random() * (h * 0.6),
            speed: (Math.random() * 4 + 2) * (Math.random() > 0.5 ? 1 : -1),
            color: ['#F472B6', '#38BDF8', '#34D399', '#FEF08A', '#A78BFA'][Math.floor(Math.random() * 5)],
            type: ['sport', 'cargo', 'police'][Math.floor(Math.random() * 3)], // 添加不同的车型
            size: Math.random() * 0.5 + 0.8 // 大小缩放比例
        }));

        bgAnimState.lastW = w;
        bgAnimState.lastH = h;
        bgAnimState.initialized = true;
    }

    function drawSatellite(ctx, x, y, r, angle) {
        ctx.save();
        ctx.translate(x, y);
        // 让卫星的朝向与公转角度相关，产生自转或朝向星球的效果
        ctx.rotate(angle + Math.PI / 4);

        // 太阳能翼板参数
        const panelWidth = r * 5.5;  // 帆板总跨度
        const panelHeight = r * 1.2; // 帆板宽度
        const coreR = r * 0.9; // 核心舱略小于原半径，凸显帆板

        // 1. 绘制太阳能翼板
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06B6D4'; // 亮青色外发光
        ctx.fillStyle = '#082F49';   // 深邃冰蓝底色
        ctx.strokeStyle = '#22D3EE'; // 亮青色边框
        ctx.lineWidth = Math.max(1, r * 0.15); // 保证线宽至少为1

        // 左侧翼板
        ctx.beginPath();
        ctx.rect(-panelWidth / 2 - coreR * 0.2, -panelHeight / 2, panelWidth / 2 - coreR * 0.5, panelHeight);
        ctx.fill();
        ctx.stroke();

        // 右侧翼板
        ctx.beginPath();
        ctx.rect(coreR * 0.7, -panelHeight / 2, panelWidth / 2 - coreR * 0.5, panelHeight);
        ctx.fill();
        ctx.stroke();

        // 太阳能板上的网格线（装饰细节）
        ctx.shadowBlur = 0; // 关闭阴影画细节，避免糊掉
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
        ctx.lineWidth = Math.max(0.5, r * 0.1);
        const lineCount = 3;
        const segmentW = (panelWidth / 2 - coreR * 0.5) / (lineCount + 1);

        for (let i = 1; i <= lineCount; i++) {
            // 左板线
            let lx = -panelWidth / 2 - coreR * 0.2 + segmentW * i;
            ctx.beginPath(); ctx.moveTo(lx, -panelHeight / 2); ctx.lineTo(lx, panelHeight / 2); ctx.stroke();
            // 右板线
            let rx = coreR * 0.7 + segmentW * i;
            ctx.beginPath(); ctx.moveTo(rx, -panelHeight / 2); ctx.lineTo(rx, panelHeight / 2); ctx.stroke();
        }

        // 2. 绘制核心舱 (带金属渐变)
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
        coreGrad.addColorStop(0, '#FFFFFF'); // 银白中心
        coreGrad.addColorStop(0.4, '#94A3B8'); // 浅灰过渡
        coreGrad.addColorStop(0.8, '#334155'); // 深灰边缘
        coreGrad.addColorStop(1, '#0F172A'); // 暗黑轮廓

        ctx.shadowBlur = 15; // 核心舱发光
        ctx.shadowColor = '#22D3EE';

        ctx.beginPath();
        ctx.arc(0, 0, coreR, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // 3. 核心舱中心能量点
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#E0F2FE'; // 极亮冰蓝
        ctx.fill();

        ctx.restore();
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
                    ctx.shadowColor = p.color1;
                    ctx.shadowBlur = p.type === 'large' ? 30 : 15;
                    ctx.fill();
                    ctx.shadowBlur = 0;

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
                    } else if (p.type === 'moon') {
                        // 岩石行星纹理 (陨石坑，参考图1)
                        ctx.fillStyle = 'rgba(0,0,0,0.15)';
                        // 画几个陨石坑的暗部
                        ctx.beginPath(); ctx.arc(p.x - p.r * 0.2, p.y - p.r * 0.2, p.r * 0.15, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(p.x + p.r * 0.3, p.y + p.r * 0.1, p.r * 0.2, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(p.x + p.r * 0.1, p.y + p.r * 0.4, p.r * 0.1, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(p.x - p.r * 0.4, p.y + p.r * 0.1, p.r * 0.12, 0, Math.PI * 2); ctx.fill();

                        // 陨石坑边缘受光面高光
                        ctx.fillStyle = 'rgba(255,255,255,0.2)';
                        ctx.beginPath(); ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.12, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(p.x + p.r * 0.25, p.y + p.r * 0.05, p.r * 0.15, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(p.x + p.r * 0.05, p.y + p.r * 0.35, p.r * 0.08, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(p.x - p.r * 0.45, p.y + p.r * 0.05, p.r * 0.1, 0, Math.PI * 2); ctx.fill();
                    } else if (p.type === 'gas') {
                        // 气态条纹纹理 (参考图2)
                        for (let i = -0.8; i < 0.8; i += 0.2) {
                            ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.1})`;
                            ctx.beginPath();
                            ctx.ellipse(p.x, p.y + p.r * i, p.r * 1.5, p.r * (0.05 + Math.random() * 0.1), 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        for (let i = -0.6; i < 0.8; i += 0.3) {
                            ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.1})`;
                            ctx.beginPath();
                            ctx.ellipse(p.x, p.y + p.r * i, p.r * 1.5, p.r * (0.04 + Math.random() * 0.08), 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        // 气态星球上的小风暴气旋
                        ctx.fillStyle = 'rgba(0,0,0,0.1)';
                        ctx.beginPath(); ctx.ellipse(p.x + p.r * 0.3, p.y - p.r * 0.1, p.r * 0.15, p.r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
                    }

                    // 星球本身的体积阴影(使其更有立体感)
                    if (p.type === 'moon' || p.type === 'gas') {
                        // 强烈的光影分割（强烈明暗交界线，右下大面积阴影）
                        const shadowGrad = ctx.createLinearGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, p.x + p.r * 0.7, p.y + p.r * 0.7);
                        shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
                        shadowGrad.addColorStop(0.35, 'rgba(0,0,0,0.05)');
                        shadowGrad.addColorStop(0.65, 'rgba(0,0,0,0.85)');
                        shadowGrad.addColorStop(1, 'rgba(0,0,0,0.98)');
                        ctx.fillStyle = shadowGrad;
                        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                    } else {
                        const shadowGrad = ctx.createLinearGradient(p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r);
                        shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
                        shadowGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
                        shadowGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
                        ctx.fillStyle = shadowGrad;
                        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();

                    // 绘制环绕的小卫星
                    if (p.hasSatellite) {
                        ctx.save();
                        // 轨道平面有一定倾角
                        ctx.translate(p.x, p.y);
                        ctx.rotate(-Math.PI / 8);

                        // 卫星轨道参数
                        const orbitA = p.r * 1.5; // 半长轴
                        const orbitB = p.r * 0.2; // 半短轴
                        const satSpeed = 0.5; // 旋转速度
                        const satAngle = time * satSpeed;

                        // 计算卫星在椭圆轨道上的位置
                        const satX = Math.cos(satAngle) * orbitA;
                        const satY = Math.sin(satAngle) * orbitB;
                        const satR = p.r * 0.12; // 卫星半径

                        // 判断卫星是否在行星背后 (sin(satAngle) < 0 表示在后半圈)
                        const isBehind = Math.sin(satAngle) < 0;

                        if (!isBehind) {
                            // 前半圈，直接画在行星上面
                            drawSatellite(ctx, satX, satY, satR, satAngle);
                        } else {
                            // 后半圈，卫星可能会被行星遮挡
                            // 利用 ctx.clip() 实现真实的物理遮挡，而不是改变透明度或绘制顺序
                            // 只有当卫星没有被行星圆面完全遮挡时，才绘制未被遮挡的部分

                            // 因为我们在 ctx.translate(p.x, p.y) 的局部坐标系中，行星中心就是 (0, 0)
                            ctx.save();

                            // 创建一个反向遮罩：只允许在行星（半径为 p.r）的外部区域进行绘制
                            ctx.beginPath();
                            // 绘制一个覆盖整个画布的超大矩形（顺时针）
                            ctx.rect(-p.r * 5, -p.r * 5, p.r * 10, p.r * 10);
                            // 绘制行星圆面（逆时针，利用奇偶环绕规则挖空中间区域）
                            ctx.arc(0, 0, p.r, 0, Math.PI * 2, true);
                            ctx.clip(); // 应用反向遮罩，现在只有行星外部可以画出东西

                            // 绘制卫星，被行星挡住的部分会被 clip 掉，完美解决消失空隙的问题
                            drawSatellite(ctx, satX, satY, satR, satAngle);

                            ctx.restore();
                        }
                        ctx.restore();
                    }

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
                // 1. 底层：气泡
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                bgAnimState.ocean.bubbles.forEach(b => {
                    b.y += b.vy; if (b.y < 0) b.y = h;
                    b.x += Math.sin(time + b.y * 0.05) * 0.5;
                    ctx.beginPath(); ctx.arc(b.x, b.y, b.s, 0, Math.PI * 2); ctx.fill();
                });

                // 2. 中下层：穿梭的大鱼 和 水母群
                bgAnimState.ocean.largeFishes.forEach(f => {
                    f.x += f.speed;
                    if (f.speed > 0 && f.x > w + f.size * 2) f.x = -f.size * 2;
                    if (f.speed < 0 && f.x < -f.size * 2) f.x = w + f.size * 2;
                    drawOceanFish(ctx, f, time, w);
                });

                bgAnimState.ocean.jellyfishes.forEach(j => {
                    drawOceanJellyfish(ctx, j, time);
                });

                // 3. 中层：起伏的沙滩地形
                const sandGrad = ctx.createLinearGradient(0, h * 0.8, 0, h);
                sandGrad.addColorStop(0, '#D4A373'); // 浅沙黄
                sandGrad.addColorStop(1, '#8B5A2B'); // 深褐

                ctx.fillStyle = sandGrad;
                ctx.beginPath();
                ctx.moveTo(0, h);
                for (let x = 0; x <= w; x += 20) {
                    ctx.lineTo(x, getOceanSeabedY(x, w, h));
                }
                ctx.lineTo(w, getOceanSeabedY(w, w, h));
                ctx.lineTo(w, h);
                ctx.fill();

                // 4. 沙滩上的珊瑚 (按图层顺序绘制，先画背景层，再画前景层)
                // 背景层
                bgAnimState.ocean.corals.filter(c => c.layer === 'bg').forEach(c => {
                    drawOceanCoral(ctx, c, time, getOceanSeabedY(c.x, w, h));
                });

                // 前景层
                bgAnimState.ocean.corals.filter(c => c.layer !== 'bg').forEach(c => {
                    drawOceanCoral(ctx, c, time, getOceanSeabedY(c.x, w, h));
                });

                // 5. 沙滩上的海草 (贴合沙滩高度)
                const maxKelpHeight = h * 0.4;
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
                ctx.lineCap = 'round';
                bgAnimState.ocean.kelps.forEach((kelp) => {
                    const seabedY = getOceanSeabedY(kelp.x, w, h);
                    const kHeight = Math.max(50, maxKelpHeight * kelp.hRatio);
                    ctx.lineWidth = Math.max(3, w * 0.008);
                    ctx.beginPath();
                    ctx.moveTo(kelp.x, seabedY);

                    let curX = kelp.x;
                    let curY = seabedY;
                    const segments = 4;
                    const segH = kHeight / segments;
                    for (let j = 1; j <= segments; j++) {
                        const sway = Math.sin(time * 2 + kelp.x + j) * 15 * (j / segments);
                        const nextX = kelp.x + sway;
                        const nextY = seabedY - segH * j;
                        const cpX = curX + (nextX - curX) / 2 + (Math.cos(time * 3 + kelp.x) * 10);
                        const cpY = curY - segH / 2;
                        ctx.quadraticCurveTo(cpX, cpY, nextX, nextY);
                        curX = nextX;
                        curY = nextY;
                    }
                    ctx.stroke();
                });

                // 6. 前景：爬行的螃蟹
                bgAnimState.ocean.crabs.forEach(crab => {
                    crab.x += crab.speed;
                    if (crab.x > crab.cx + crab.range) {
                        crab.x = crab.cx + crab.range;
                        crab.speed *= -1;
                    }
                    if (crab.x < crab.cx - crab.range) {
                        crab.x = crab.cx - crab.range;
                        crab.speed *= -1;
                    }
                    drawOceanCrab(ctx, crab, time, w, h);
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
                ctx.globalAlpha = 1.0;

                // 小鹿逻辑与绘制
                const deer = bgAnimState.forest.deer;
                if (!deer) break; // 防御性检查

                // 状态机更新
                switch (deer.state) {
                    case 'running_in':
                        deer.x += deer.speed;
                        if (deer.x >= deer.targetX) {
                            deer.state = 'looking_around';
                            deer.timer = 0;
                        }
                        break;
                    case 'looking_around':
                        deer.timer++;
                        // 使用正弦函数模拟左右张望
                        deer.headAngle = Math.sin(deer.timer * 0.03) * 0.4;

                        // 停留时间增加到 300 帧（约 5 秒）
                        // 期间跳跃两下 (例如在第 100 帧和第 200 帧左右)
                        if (deer.timer > 80 && deer.timer <= 110) {
                            // 简单的正弦波跳跃 (第一跳)
                            const jumpProgress = (deer.timer - 80) / 30; // 0 到 1
                            // Math.sin 在 0 到 PI 之间总是正数，乘以负数意味着向上偏移（Y轴向上为负）
                            deer.jumpOffset = -Math.sin(jumpProgress * Math.PI) * 40;
                        } else if (deer.timer > 180 && deer.timer <= 210) {
                            // 第二跳
                            const jumpProgress = (deer.timer - 180) / 30; // 0 到 1
                            deer.jumpOffset = -Math.sin(jumpProgress * Math.PI) * 40;
                        } else {
                            // 不在跳跃区间时，偏移必须严格为 0
                            deer.jumpOffset = 0;
                        }

                        // 停留一段时间后离开
                        if (deer.timer > 300) {
                            deer.state = 'running_out';
                        }
                        break;
                    case 'running_out':
                        deer.x -= deer.speed; // 往左跑出
                        if (deer.x < -200) {
                            deer.state = 'waiting';
                            deer.timer = 0;
                            deer.targetX = w * 0.3 + Math.random() * (w * 0.1); // 保持和第一次一致的跑入目标范围
                            deer.speed = w * 0.0015; // 保持和第一次一致的慢速
                        }
                        break;
                    case 'waiting':
                        deer.timer++;
                        // 等待一段时间后再次跑入
                        if (deer.timer > 200) { // 缩短等待时间到约3秒
                            deer.state = 'running_in';
                            deer.x = -200; // 确保从左侧外重新开始
                        }
                        break;
                }

                // 绘制小鹿 (极简剪影风格)
                if (deer.state !== 'waiting') {
                    ctx.save();
                    // 彻底修复悬空问题：直接使用 deer.y，并且去掉了硬编码的常数。
                    // 这样，外部初始化/修改的 deer.y (如 h - 10 或 h + 100) 会真实生效。
                    // 加上 jumpOffset 实现跳跃效果。
                    ctx.translate(deer.x, deer.y + (deer.jumpOffset || 0));

                    // 根据移动方向翻转 (默认朝右)
                    if (deer.state === 'running_out') {
                        ctx.scale(-1, 1);
                    }

                    const deerSize = 20; // 基础尺寸
                    ctx.fillStyle = '#A0522D'; // 更亮一点的褐色 (Sienna)
                    ctx.strokeStyle = '#A0522D';

                    // 身体 (使用贝塞尔曲线绘制流线型的躯干和脖子相连)
                    ctx.beginPath();
                    // 身体起始点（臀部后方）
                    ctx.moveTo(-deerSize * 1.5, -deerSize * 0.8);
                    // 臀部到背部的曲线
                    ctx.quadraticCurveTo(-deerSize * 1.2, -deerSize * 1.6, 0, -deerSize * 1.3);
                    // 背部到脖子的曲线 (降低脖子高度)
                    ctx.quadraticCurveTo(deerSize * 1.0, -deerSize * 1.0, deerSize * 1.2, -deerSize * 1.8);
                    // 脖子前部到底部胸膛的曲线
                    ctx.quadraticCurveTo(deerSize * 0.8, -deerSize * 0.8, deerSize * 0.5, -deerSize * 0.5);
                    // 胸膛到腹部的曲线
                    ctx.quadraticCurveTo(0, -deerSize * 0.3, -deerSize * 0.5, -deerSize * 0.6);
                    // 腹部收回臀部下方
                    ctx.quadraticCurveTo(-deerSize * 1.2, -deerSize * 0.5, -deerSize * 1.5, -deerSize * 0.8);
                    ctx.fill();

                    // 尾巴 (小小的翘起)
                    ctx.beginPath();
                    ctx.moveTo(-deerSize * 1.4, -deerSize * 1.2);
                    ctx.quadraticCurveTo(-deerSize * 1.8, -deerSize * 1.4, -deerSize * 1.6, -deerSize * 0.8);
                    ctx.fill();

                    // 白色斑点 (分布在背部，收敛坐标确保在身体轮廓内)
                    ctx.fillStyle = '#FFFFFF';
                    ctx.globalAlpha = 0.8;
                    // 臀部上方
                    ctx.beginPath(); ctx.arc(-deerSize * 0.9, -deerSize * 1.1, deerSize * 0.15, 0, Math.PI * 2); ctx.fill();
                    // 背部中段
                    ctx.beginPath(); ctx.arc(-deerSize * 0.4, -deerSize * 1.15, deerSize * 0.12, 0, Math.PI * 2); ctx.fill();
                    // 靠近脖子根部
                    ctx.beginPath(); ctx.arc(0.1, -deerSize * 1.05, deerSize * 0.1, 0, Math.PI * 2); ctx.fill();
                    // 侧腹偏下
                    ctx.beginPath(); ctx.arc(-deerSize * 0.6, -deerSize * 0.85, deerSize * 0.08, 0, Math.PI * 2); ctx.fill();
                    // 侧后方
                    ctx.beginPath(); ctx.arc(-deerSize * 1.1, -deerSize * 0.9, deerSize * 0.1, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1.0;

                    // 恢复身体颜色用于画腿
                    ctx.fillStyle = '#A0522D';

                    // 腿部 (带有大腿肌肉关节的折线腿)
                    // 引入两个变量控制前后腿和大小腿的摆动
                    let swingAngle = 0;
                    let jumpBend = 0;
                    if (deer.state === 'running_in' || deer.state === 'running_out') {
                        swingAngle = time * 10;
                    } else if (deer.jumpOffset < -5) {
                        jumpBend = deerSize * 0.4;
                    }

                    ctx.lineWidth = deerSize * 0.2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // 用于绘制带有关节的腿部的辅助函数
                    // baseY: 腿部连接身体的起点高度
                    // phase: 控制迈步频率的相位差
                    // isFront: 是否是前腿 (前腿膝盖向前弯，后腿飞节向后弯)
                    function drawLeg(baseX, baseY, phase, isFront) {
                        const currentAngle = swingAngle + phase;

                        // 大腿的摆动角度 (相对垂直方向)
                        // 前后摆动的幅度为 ±0.4 弧度
                        const thighAngle = Math.sin(currentAngle) * 0.4;

                        // 小腿的摆动角度 (相对大腿)
                        // 在迈出时伸直，在收回时弯曲。利用余弦函数模拟这种弯曲。
                        let calfAngle = 0;
                        if (isFront) {
                            calfAngle = Math.max(0, Math.cos(currentAngle)) * 0.6;
                        } else {
                            calfAngle = Math.max(0, -Math.cos(currentAngle)) * 0.6;
                        }

                        const thighLength = deerSize * 0.5 - jumpBend * 0.5;
                        const calfLength = deerSize * 0.5 - jumpBend * 0.5;

                        // 计算膝盖/飞节的坐标
                        const jointX = baseX + Math.sin(thighAngle) * thighLength;
                        const jointY = baseY + Math.cos(thighAngle) * thighLength;

                        // 计算蹄子的坐标
                        // 前腿膝盖向前，小腿向后折；后腿飞节向后，小腿向前折
                        const finalCalfAngle = isFront ? (thighAngle - calfAngle) : (thighAngle + calfAngle);
                        const hoofX = jointX + Math.sin(finalCalfAngle) * calfLength;
                        const hoofY = jointY + Math.cos(finalCalfAngle) * calfLength;

                        ctx.beginPath();
                        ctx.moveTo(baseX, baseY);
                        ctx.lineTo(jointX, jointY);
                        ctx.lineTo(hoofX, hoofY);
                        ctx.stroke();
                    }

                    // 前腿基准点
                    const frontBaseX = deerSize * 0.5;
                    const frontBaseY = -deerSize * 0.6;

                    // 前腿 1 和 前腿 2 (相位差 PI)
                    drawLeg(frontBaseX, frontBaseY, 0, true);
                    drawLeg(frontBaseX - deerSize * 0.2, frontBaseY, Math.PI, true);

                    // 后腿基准点
                    const backBaseX = -deerSize * 1.0;
                    const backBaseY = -deerSize * 0.7;

                    // 后腿 1 和 后腿 2 (相位差 PI)
                    drawLeg(backBaseX, backBaseY, Math.PI, false);
                    drawLeg(backBaseX + deerSize * 0.3, backBaseY, 0, false);

                    // 头部 (旋转中心在脖子根部上方)
                    ctx.save();
                    // 下调头部的连接位置，匹配变短的脖子
                    ctx.translate(deerSize * 1.2, -deerSize * 1.8);
                    if (deer.state === 'looking_around') {
                        ctx.rotate(deer.headAngle);
                    }

                    // 头颅 (水滴形)
                    ctx.beginPath();
                    ctx.moveTo(-deerSize * 0.3, 0); // 枕部
                    ctx.quadraticCurveTo(deerSize * 0.5, -deerSize * 0.4, deerSize * 1.0, 0); // 额头到鼻尖
                    ctx.quadraticCurveTo(deerSize * 0.5, deerSize * 0.3, -deerSize * 0.3, deerSize * 0.4); // 下巴
                    ctx.fill();

                    // 鼻子 (黑色端点)
                    ctx.fillStyle = '#000000';
                    ctx.beginPath(); ctx.arc(deerSize * 0.95, 0, deerSize * 0.1, 0, Math.PI * 2); ctx.fill();

                    // 耳朵
                    ctx.fillStyle = '#A0522D';
                    ctx.beginPath();
                    ctx.moveTo(-deerSize * 0.2, -deerSize * 0.1);
                    ctx.quadraticCurveTo(-deerSize * 0.8, -deerSize * 0.5, -deerSize * 0.6, -deerSize * 0.8);
                    ctx.quadraticCurveTo(-deerSize * 0.1, -deerSize * 0.5, -deerSize * 0.1, -deerSize * 0.1);
                    ctx.fill();

                    // 眼睛 (白色眼白 + 黑色瞳孔)
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath(); ctx.arc(deerSize * 0.3, -deerSize * 0.05, deerSize * 0.12, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#000000';
                    ctx.beginPath(); ctx.arc(deerSize * 0.35, -deerSize * 0.05, deerSize * 0.06, 0, Math.PI * 2); ctx.fill();

                    // 鹿角 (颜色更深的褐色，更复杂的分叉)
                    ctx.strokeStyle = '#5C4033';
                    ctx.lineWidth = deerSize * 0.12;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // 左角主干
                    ctx.beginPath();
                    ctx.moveTo(-deerSize * 0.1, -deerSize * 0.3);
                    ctx.quadraticCurveTo(-deerSize * 0.4, -deerSize * 1.0, -deerSize * 0.2, -deerSize * 1.8);
                    ctx.stroke();
                    // 左角分叉
                    ctx.beginPath(); ctx.moveTo(-deerSize * 0.25, -deerSize * 1.0); ctx.lineTo(-deerSize * 0.7, -deerSize * 1.3); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-deerSize * 0.2, -deerSize * 1.4); ctx.lineTo(0, -deerSize * 1.7); ctx.stroke();

                    // 右角主干 (带有透视位移)
                    ctx.beginPath();
                    ctx.moveTo(0.1, -deerSize * 0.3);
                    ctx.quadraticCurveTo(deerSize * 0.3, -deerSize * 1.0, deerSize * 0.4, -deerSize * 1.6);
                    ctx.stroke();
                    // 右角分叉
                    ctx.beginPath(); ctx.moveTo(deerSize * 0.2, -deerSize * 1.0); ctx.lineTo(deerSize * 0.6, -deerSize * 1.2); ctx.stroke();

                    ctx.restore();
                    ctx.restore();
                }

                break;

            case 'cyberpunk':
                // Buildings
                bgAnimState.cyberpunk.buildings.forEach((b, index) => {
                    ctx.fillStyle = '#0F172A';
                    ctx.fillRect(b.x, h - b.h, b.w, b.h);

                    if (b.isOutside) {
                        ctx.fillStyle = '#1E293B';

                        // 绘制直射天际的探照灯/霓虹灯光束
                        const beamColor = b.windows[0].color; // 使用楼栋窗户的主色调作为光束颜色
                        ctx.save();

                        // 混合模式：叠加发光效果
                        ctx.globalCompositeOperation = 'screen';

                        // 创建线性渐变光束（从大楼顶部发出）
                        const beamStartX = b.x + b.w * 0.5;
                        const beamStartY = h - b.h;
                        const beamLength = h * 0.8; // 光束长度

                        // 引入时间变量使光束有轻微的呼吸闪烁效果
                        const beamAlpha = 0.3 + Math.sin(time * 5 + index) * 0.15;

                        // 左右摇摆的角度 (利用正弦波控制摇摆)
                        // index 的参与可以让不同大楼的探照灯摇摆节奏错开
                        const swingAngle = Math.sin(time * 1.5 + index * 0.8) * (Math.PI / 6); // 最大摇摆角度约为 ±30度

                        // 将坐标系平移到光束发射点，方便应用旋转
                        ctx.translate(beamStartX, beamStartY);
                        ctx.rotate(swingAngle);

                        // 注意：平移旋转后，原点 (0,0) 就是光束的发射点 (beamStartX, beamStartY)
                        // 因此绘制和渐变的坐标都需要相对于 (0,0) 来计算
                        const gradient = ctx.createLinearGradient(0, 0, 0, -beamLength);
                        gradient.addColorStop(0, beamColor);
                        gradient.addColorStop(1, 'transparent');

                        ctx.fillStyle = gradient;
                        ctx.globalAlpha = beamAlpha;

                        // 绘制梯形光束（向上散射）
                        ctx.beginPath();
                        ctx.moveTo(-b.w * 0.1, 0); // 底部稍微宽一点，或者用原来的 0.05 也行
                        ctx.lineTo(b.w * 0.1, 0);
                        ctx.lineTo(b.w * 0.8, -beamLength);
                        ctx.lineTo(-b.w * 0.8, -beamLength);
                        ctx.fill();

                        ctx.restore();

                        // 楼体外发光边缘线
                        ctx.strokeStyle = beamColor;
                        ctx.lineWidth = 2;
                        ctx.shadowColor = beamColor;
                        ctx.shadowBlur = 10;
                        ctx.strokeRect(b.x, h - b.h, b.w, b.h);
                        ctx.shadowBlur = 0; // 重置阴影
                    } else {
                        // 内部大楼也增加边缘发光线条
                        const edgeColor = b.windows[0].color;
                        ctx.strokeStyle = edgeColor;
                        ctx.lineWidth = 1;

                        // 内部大楼发光稍微暗一点
                        ctx.globalAlpha = 0.6;
                        ctx.shadowColor = edgeColor;
                        ctx.shadowBlur = 5;
                        ctx.strokeRect(b.x, h - b.h, b.w, b.h);

                        ctx.shadowBlur = 0;
                        ctx.globalAlpha = 1.0;
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

                // Flying Cars (Cool Cyberpunk Vehicles)
                bgAnimState.cyberpunk.cars.forEach(c => {
                    c.x += c.speed;
                    if (c.speed > 0 && c.x > w + 100) c.x = -100;
                    if (c.speed < 0 && c.x < -100) c.x = w + 100;

                    ctx.save();
                    ctx.translate(c.x, c.y);

                    // 根据行驶方向翻转
                    const isRight = c.speed > 0;
                    if (!isRight) {
                        ctx.scale(-1, 1);
                    }

                    // 应用车辆缩放比例
                    ctx.scale(c.size, c.size);

                    // 车身通用发光效果
                    ctx.shadowColor = c.color;
                    ctx.shadowBlur = 10;

                    switch (c.type) {
                        case 'sport':
                            // 流线型跑车
                            ctx.fillStyle = '#1E293B'; // 暗色车身
                            ctx.beginPath();
                            ctx.moveTo(-20, 5);
                            ctx.lineTo(15, 5);
                            ctx.quadraticCurveTo(25, 5, 20, -5); // 车头
                            ctx.lineTo(5, -10); // 挡风玻璃
                            ctx.lineTo(-10, -10); // 车顶
                            ctx.lineTo(-20, -5); // 车尾
                            ctx.closePath();
                            ctx.fill();

                            // 跑车霓虹腰线
                            ctx.strokeStyle = c.color;
                            ctx.lineWidth = 2;
                            ctx.beginPath(); ctx.moveTo(-15, 2); ctx.lineTo(15, 2); ctx.stroke();

                            // 尾焰喷射 (长而亮)
                            ctx.fillStyle = c.color;
                            ctx.globalAlpha = 0.6 + Math.sin(time * 15) * 0.4;
                            ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-40, 2); ctx.lineTo(-20, 4); ctx.fill();
                            ctx.globalAlpha = 1;
                            break;

                        case 'cargo':
                            // 笨重的大型货船
                            ctx.fillStyle = '#0F172A';
                            ctx.fillRect(-30, -15, 50, 25);
                            ctx.fillStyle = '#334155';
                            ctx.fillRect(-25, -10, 40, 15); // 货舱

                            // 货船的警示灯和推进器
                            ctx.fillStyle = '#EF4444'; // 红灯
                            if (Math.floor(time * 5) % 2 === 0) {
                                ctx.fillRect(15, -15, 5, 5); // 车头灯闪烁
                            }

                            // 底部的垂直悬浮喷口
                            ctx.strokeStyle = c.color;
                            ctx.lineWidth = 3;
                            ctx.beginPath(); ctx.moveTo(-20, 10); ctx.lineTo(-20, 18); ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(10, 18); ctx.stroke();

                            // 后部缓慢的尾焰
                            ctx.fillStyle = c.color;
                            ctx.globalAlpha = 0.5 + Math.sin(time * 5) * 0.2;
                            ctx.beginPath(); ctx.arc(-30, 0, 8, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
                            ctx.globalAlpha = 1;
                            break;

                        case 'police':
                            // 警用巡逻车
                            ctx.fillStyle = '#1E293B';
                            ctx.beginPath();
                            ctx.moveTo(-15, 5); ctx.lineTo(15, 5); ctx.lineTo(10, -5); ctx.lineTo(-10, -5);
                            ctx.closePath(); ctx.fill();

                            // 红蓝警灯交替闪烁
                            ctx.shadowBlur = 15;
                            if (Math.floor(time * 10) % 2 === 0) {
                                ctx.shadowColor = '#EF4444';
                                ctx.fillStyle = '#EF4444';
                            } else {
                                ctx.shadowColor = '#3B82F6';
                                ctx.fillStyle = '#3B82F6';
                            }
                            ctx.fillRect(0, -8, 6, 4); // 车顶警灯

                            // 巡逻探照灯 (向下打光)
                            ctx.shadowBlur = 0;
                            ctx.globalCompositeOperation = 'screen';
                            const pGrad = ctx.createLinearGradient(0, 5, 10, 40);
                            pGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
                            pGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                            ctx.fillStyle = pGrad;
                            ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(-10, 40); ctx.lineTo(30, 40); ctx.fill();

                            // 尾焰
                            ctx.globalCompositeOperation = 'source-over';
                            ctx.fillStyle = c.color;
                            ctx.shadowBlur = 10;
                            ctx.shadowColor = c.color;
                            ctx.beginPath(); ctx.arc(-15, 0, 4, 0, Math.PI * 2); ctx.fill();
                            break;
                    }

                    ctx.restore();
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
