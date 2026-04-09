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
        if (startBtn) startBtn.addEventListener('click', startGame);

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
        resizeCanvas();
        if (elStartOverlay) elStartOverlay.style.display = 'flex';
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        if (elFinalOverlay) elFinalOverlay.style.display = 'none';
        gameLoop();
    }

    function hide() {
        active = false;
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        if (elFinalOverlay) elFinalOverlay.style.display = 'none';
    }

    function startGame() {
        currentLevel = 0;
        levelStars = Array(levels.length).fill(0);
        loadLevel(0);
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
        GameAudio.playClick();
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        if (elFinalOverlay) elFinalOverlay.style.display = 'none';
        loadLevel(currentLevel);
    }

    function replayAll() {
        GameAudio.playClick();
        startGame();
    }

    function loadLevel(idx) {
        if (idx < 0) idx = 0;
        if (idx >= levels.length) idx = levels.length - 1;
        currentLevel = idx;
        const level = levels[idx];

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
        if (ball.trail.length > 50) ball.trail.shift();

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
        const stars = shots <= 2 ? 3 : shots === 3 ? 2 : 1;
        levelStars[currentLevel] = stars;
        if (elStars) elStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        if (currentLevel >= levels.length - 1) {
            showFinalResults();
        } else if (elWinOverlay) {
            elWinOverlay.style.display = 'flex';
        }
        GameAudio.playStarRating(stars);
        spawnParticles(cx, cy, '#F59E0B', 40);
        updateUI();
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
        for (let i = 0; i < count; i++) {
            const a = Math.random() * TAU;
            const s = 1 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: 1, decay: 0.01 + Math.random() * 0.02,
                size: 2 + Math.random() * 4, color
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
        ctx.fillStyle = '#050A18';
        ctx.fillRect(0, 0, W, H);

        drawCircle();
        drawChords();
        drawNodes();
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
        ctx.strokeStyle = 'rgba(37,99,235,0.15)'; ctx.lineWidth = 6; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
        ctx.strokeStyle = 'rgba(37,99,235,0.4)'; ctx.lineWidth = 2; ctx.stroke();
        // 圆心
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU);
        ctx.fillStyle = 'rgba(148,163,184,0.3)'; ctx.fill();
    }

    function drawChords() {
        chords.forEach(c => {
            if (!c.active) return;
            ctx.beginPath(); ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2);
            ctx.strokeStyle = 'rgba(96,165,250,0.5)'; ctx.lineWidth = 2; ctx.stroke();
            // 弦端点
            [{ x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 }].forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU);
                ctx.fillStyle = 'rgba(96,165,250,0.6)'; ctx.fill();
            });
        });
    }

    function drawNodes() {
        nodes.forEach(n => {
            if (!n.alive) return;
            const pulse = Math.sin(n.pulse) * 0.3 + 1;

            // 光晕
            ctx.beginPath(); ctx.arc(n.x, n.y, NODE_RADIUS * 1.5 * pulse, 0, TAU);
            ctx.fillStyle = 'rgba(245,158,11,0.15)'; ctx.fill();

            // 节点
            ctx.beginPath(); ctx.arc(n.x, n.y, NODE_RADIUS, 0, TAU);
            const grad = ctx.createRadialGradient(n.x - 2, n.y - 2, 0, n.x, n.y, NODE_RADIUS);
            grad.addColorStop(0, '#FCD34D');
            grad.addColorStop(1, '#F59E0B');
            ctx.fillStyle = grad; ctx.fill();

            // 高光
            ctx.beginPath(); ctx.arc(n.x - 3, n.y - 3, 3, 0, TAU);
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
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
        balls.forEach(ball => {
            const trail = ball.trail;
            if (trail.length < 2) return;
            for (let i = 1; i < trail.length; i++) {
                const alpha = i / trail.length * 0.6;
                const size = (i / trail.length) * 3;
                ctx.beginPath(); ctx.arc(trail[i].x, trail[i].y, size, 0, TAU);
                ctx.fillStyle = `rgba(34,197,94,${alpha})`; ctx.fill();
            }
        });
    }

    function drawBalls() {
        balls.forEach(ball => {
            const grad = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 15);
            grad.addColorStop(0, 'rgba(34,197,94,0.4)');
            grad.addColorStop(1, 'rgba(34,197,94,0)');
            ctx.beginPath(); ctx.arc(ball.x, ball.y, 15, 0, TAU);
            ctx.fillStyle = grad; ctx.fill();
            ctx.beginPath(); ctx.arc(ball.x, ball.y, 6, 0, TAU);
            ctx.fillStyle = '#22C55E'; ctx.fill();
            ctx.beginPath(); ctx.arc(ball.x - 2, ball.y - 2, 2, 0, TAU);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
        });
    }

    function drawReadyBall() {
        if (!nextBallReady || levelComplete) return;
        const px = cx;
        const py = cy - R - 28;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 16);
        grad.addColorStop(0, 'rgba(34,197,94,0.45)');
        grad.addColorStop(1, 'rgba(34,197,94,0)');
        ctx.beginPath(); ctx.arc(px, py, 16, 0, TAU);
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU);
        ctx.fillStyle = '#22C55E'; ctx.fill();
        ctx.beginPath(); ctx.arc(px - 2, py - 2, 2, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
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
