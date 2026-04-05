/**
 * pi-sniper.js - 圆周狙击游戏（Pi Sniper）
 * 核心玩法：在单位圆上拖拽旋转瞄准线到目标角度，精准射击
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

        if (elFinalScore) elFinalScore.textContent = score;
        if (elRecordBadge) elRecordBadge.style.display = isRecord ? 'inline-block' : 'none';
        if (elEndOverlay) elEndOverlay.style.display = 'flex';

        GameAudio.playGameOver();
    }

    // ===== 目标生成 =====
    function spawnTarget() {
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

        // 计算角度差
        let diff = Math.abs(aimAngle - targetAngle);
        if (diff > PI) diff = TAU - diff;
        const diffDeg = diff * DEG;

        // 判定精度
        let points = 0;
        let label = '';

        if (diffDeg < 1) {
            points = 100;
            label = GameI18N.t('sniper.perfect');
            feedbackColor = '#F59E0B';
            GameAudio.playPerfect();
            spawnParticles(W / 2 + Math.cos(targetAngle) * getUnitR(), H / 2 - Math.sin(targetAngle) * getUnitR(), '#F59E0B', 30);
        } else if (diffDeg < 3) {
            points = 75;
            label = GameI18N.t('sniper.excellent');
            feedbackColor = '#22C55E';
            GameAudio.playExcellent();
            spawnParticles(W / 2 + Math.cos(targetAngle) * getUnitR(), H / 2 - Math.sin(targetAngle) * getUnitR(), '#22C55E', 20);
        } else if (diffDeg < 5) {
            points = 50;
            label = GameI18N.t('sniper.good');
            feedbackColor = '#60A5FA';
            GameAudio.playGood();
            spawnParticles(W / 2 + Math.cos(targetAngle) * getUnitR(), H / 2 - Math.sin(targetAngle) * getUnitR(), '#60A5FA', 12);
        } else if (diffDeg < 10) {
            points = 25;
            label = GameI18N.t('sniper.hit');
            feedbackColor = '#94A3B8';
        } else {
            points = 0;
            label = GameI18N.t('sniper.miss');
            feedbackColor = '#EF4444';
            GameAudio.playMiss();
            combo = 0;
            frenzy = false;
        }

        // 更新分数和连击
        if (points > 0) {
            combo++;
            if (combo > maxCombo) maxCombo = combo;

            // Frenzy 模式
            if (combo >= FRENZY_THRESHOLD && !frenzy) {
                frenzy = true;
                GameAudio.playFrenzy();
                feedbackText = GameI18N.t('sniper.frenzy');
                feedbackColor = '#F59E0B';
                feedbackTimer = 60;
            }

            // Frenzy 加分
            if (frenzy) points = Math.floor(points * 1.5);

            // 连击加分
            const comboBonus = Math.min(combo, 10) * 5;
            points += comboBonus;

            score += points;
            GameAudio.playCombo(combo);
        }

        // 显示反馈
        if (!frenzy || points === 0) {
            feedbackText = label;
            feedbackTimer = 40;
        }

        updateUI();
        spawnTarget();
    }

    // ===== 粒子系统 =====
    function spawnParticles(x, y, color, count) {
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
                color
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
        targetPulse += 0.05;
        updateParticles();

        if (feedbackTimer > 0) feedbackTimer--;
    }

    function draw() {
        if (!ctx) return;
        const cx = getCx(), cy = getCy(), r = getUnitR();

        // 清屏
        ctx.fillStyle = '#0F172A';
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

        // 绘制瞄准线
        if (running) drawAimLine(cx, cy, r);

        // 绘制粒子
        drawParticles();

        // 绘制反馈文字
        drawFeedback(cx, cy, r);

        // 绘制角度信息
        drawAngleInfo(cx, cy, r);
    }

    function drawUnitCircle(cx, cy, r) {
        // 外圈光晕
        ctx.beginPath();
        ctx.arc(cx, cy, r + 3, 0, TAU);
        ctx.strokeStyle = frenzy ? 'rgba(245, 158, 11, 0.2)' : 'rgba(37, 99, 235, 0.15)';
        ctx.lineWidth = 6;
        ctx.stroke();

        // 主圆
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.strokeStyle = frenzy ? 'rgba(245, 158, 11, 0.5)' : 'rgba(37, 99, 235, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 刻度线（每30度）
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            const inner = r - 8;
            const outer = r + 8;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * inner, cy - Math.sin(a) * inner);
            ctx.lineTo(cx + Math.cos(a) * outer, cy - Math.sin(a) * outer);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
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
            { angle: 0, text: '0°' },
            { angle: PI / 2, text: '90°' },
            { angle: PI, text: '180°' },
            { angle: PI * 1.5, text: '270°' }
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
        ctx.fillText(`${targetDeg}°`, cx + Math.cos(targetAngle) * labelR, cy - Math.sin(targetAngle) * labelR);
    }

    function drawAimLine(cx, cy, r) {
        const endX = cx + Math.cos(aimAngle) * r;
        const endY = cy - Math.sin(aimAngle) * r;

        // 瞄准线光晕
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = frenzy ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)';
        ctx.lineWidth = 6;
        ctx.stroke();

        // 瞄准线
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = frenzy ? '#F59E0B' : '#22C55E';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 瞄准点
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, TAU);
        ctx.fillStyle = frenzy ? '#F59E0B' : '#22C55E';
        ctx.fill();

        // 十字准星
        const crossSize = 8;
        ctx.beginPath();
        ctx.moveTo(endX - crossSize, endY);
        ctx.lineTo(endX + crossSize, endY);
        ctx.moveTo(endX, endY - crossSize);
        ctx.lineTo(endX, endY + crossSize);
        ctx.strokeStyle = frenzy ? 'rgba(245, 158, 11, 0.6)' : 'rgba(34, 197, 94, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
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
        ctx.fillText(`${aimDeg}°`, cx, boxY + 14);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px monospace';
        ctx.fillText(`${aimRad}π rad`, cx, boxY + 30);
    }

    function drawStaticPreview() {
        if (!ctx) return;
        const cx = getCx(), cy = getCy(), r = getUnitR();
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);
        drawUnitCircle(cx, cy, r);
    }

    return { show, hide };
})();
