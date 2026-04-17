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

    // 成就相关辅助变量
    let consecutivePerfects = 0;
    let hadComboReset = false;
    let lastShotWasPerfect = false;

    // ===== 成就定义 =====
    const ACHIEVEMENT_DEFS = {
        firstPerfect: {
            name: 'sniper.achievement.firstPerfect',
            check: (s) => s.stats.perfects >= 1,
        },
        sniper: {
            name: 'sniper.achievement.sniper',
            check: (s) => s.stats.perfects >= 10,
        },
        godlike: {
            name: 'sniper.achievement.godlike',
            check: (s) => s.stats.perfects >= 20,
        },
        zeroError: {
            name: 'sniper.achievement.zeroError',
            check: (s) => s.consecutivePerfects >= 5,
        },
        combo5: {
            name: 'sniper.achievement.combo5',
            check: (s) => s.combo >= 5,
        },
        combo15: {
            name: 'sniper.achievement.combo15',
            check: (s) => s.combo >= 15,
        },
        combo30: {
            name: 'sniper.achievement.combo30',
            check: (s) => s.combo >= 30,
        },
        bossHunter: {
            name: 'sniper.achievement.bossHunter',
            check: (s) => s.stats.bossDefeated >= 1,
        },
        bossHarvester: {
            name: 'sniper.achievement.bossHarvester',
            check: (s) => s.stats.bossDefeated >= 2,
        },
        timeMaster: {
            name: 'sniper.achievement.timeMaster',
            check: (s) => s.timeLeft === 1 && s.lastShotWasPerfect,
        },
        comeback: {
            name: 'sniper.achievement.comeback',
            check: (s) => s.combo >= 10 && s.hadComboReset,
        },
        frenzyRegular: {
            name: 'sniper.achievement.frenzyRegular',
            check: (s) => s.stats.frenzyCount >= 3,
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
        const size = Math.min(rect.width - 20, rect.height - 20, 600);
        canvas.width = size * window.devicePixelRatio;
        canvas.height = size * window.devicePixelRatio;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        W = size;
        H = size;
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
    }

    function hide() {
        active = false;
        stopGame();
        if (animId) cancelAnimationFrame(animId);
        animId = null;
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

        // 生成特殊角度（30°, 45°, 60°, 90° 等）或随机角度
        const specialAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
        const useSpecial = Math.random() < 0.6; // 60%概率出特殊角
        if (useSpecial) {
            targetAngle = (specialAngles[Math.floor(Math.random() * specialAngles.length)] * PI / 180);
        } else {
            targetAngle = Math.random() * TAU;
        }
        targetPulse = 0;

        // 显示知识提示
        showKnowledgeTip();
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
            GameAudio.playBossWarning();
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
        const state = {
            stats,
            combo,
            maxCombo,
            timeLeft,
            consecutivePerfects,
            hadComboReset,
            lastShotWasPerfect,
            score,
        };

        Object.keys(ACHIEVEMENT_DEFS).forEach(id => {
            if (!achievements[id] && ACHIEVEMENT_DEFS[id].check(state)) {
                unlockAchievement(id);
            }
        });
    }

    /**
     * 解锁成就
     */
    function unlockAchievement(id) {
        achievements[id] = {
            unlocked: true,
            time: Date.now(),
        };
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
        const offsetY = (90 - shotAnalysis.timer) * 0.3;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 解析面板背景
        const panelW = 140;
        const panelH = 68;
        const panelX = cx + r * 0.5 + 10;
        const panelY = cy - panelH / 2 + offsetY;

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
            lt.totalPerfects = (lt.totalPerfects || 0) + stats.perfects;
            lt.totalBossDefeated = (lt.totalBossDefeated || 0) + stats.bossDefeated;
            lt.totalScore = (lt.totalScore || 0) + score;
            lt.maxCombo = Math.max(lt.maxCombo || 0, maxCombo);
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

    // ===== 知识提示 =====
    function showKnowledgeTip() {
        if (!elKnowledgeTip || !elKnowledgeText) return;
        const tip = knowledgeTips[currentTipIndex % knowledgeTips.length];
        elKnowledgeText.textContent = tip;
        elKnowledgeTip.classList.add('visible');
        currentTipIndex++;

        clearTimeout(tipTimer);
        tipTimer = setTimeout(() => {
            if (elKnowledgeTip) elKnowledgeTip.classList.remove('visible');
        }, 4000);
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

        // 角度显示框
        const boxX = cx - 60;
        const boxY = cy + r + 45;
        const boxW = 120;
        const boxH = 40;

        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${aimDeg}\u00B0`, cx, boxY + 14);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px monospace';
        ctx.fillText(`${aimRad}\u03C0 rad`, cx, boxY + 30);
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

    return { show, hide };
})();
