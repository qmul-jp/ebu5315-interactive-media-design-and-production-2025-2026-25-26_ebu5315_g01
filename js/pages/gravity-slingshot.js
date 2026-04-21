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
    const PREDICTION_DT = 0.016;

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

    // ===== DOM =====
    let elLevel, elShots, elBest;
    let elWinOverlay, elStars;
    let elKnowledgeTip, elKnowledgeText;
    let elCompleteOverlay, elCompleteTotalShots, elCompleteTotalStars, elCompleteBtn;

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
                { x: 0.5, y: 0.5, r: 0.12, mass: 3 }
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
                { x: 0.45, y: 0.45, r: 0.03, mass: 0.5 },
                { x: 0.45, y: 0.55, r: 0.03, mass: 0.5 },
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
                { x: 0.3, y: 0.25, r: 0.06, mass: 15 },
                { x: 0.5, y: 0.75, r: 0.06, mass: 15 },
                { x: 0.7, y: 0.25, r: 0.06, mass: 15 }
            ],
            par: 2,
            tip: 'slingshot.knowledge.arc'
        },
        // Level 10: 死亡黑洞 (Deadly Black Hole)
        {
            launcher: { x: 0.1, y: 0.5 },
            wormhole: { x: 0.9, y: 0.5 },
            planets: [
                { x: 0.5, y: 0.5, r: 0.03, mass: 4.5 } // 体积小，质量极大
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
                { x: 0.3, y: 0.3, r: 0.05, mass: 1.0 },
                { x: 0.7, y: 0.3, r: 0.08, mass: 1.5 },
                { x: 0.4, y: 0.7, r: 0.06, mass: 1.2 },
                { x: 0.8, y: 0.6, r: 0.04, mass: 0.8 }
            ],
            par: 4,
            tip: 'slingshot.knowledge.radius'
        }
    ];

    // ===== 初始化 =====
    function init() {
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

        const levelBtns = document.querySelectorAll('.slingshot-level-btn');
        levelBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(e.target.dataset.level, 10);
                GameAudio.playClick();
                document.getElementById('slingshotStartOverlay').style.display = 'none';
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
            color: ['#2563EB', '#7C3AED', '#EC4899', '#06B6D4', '#F59E0B'][Math.floor(Math.random() * 5)]
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
            showCompleteOverlay();
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
        prediction = [];
        updateUI();
        GameAudio.playLaunch();
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
        GameAudio.playHitWormhole();
        spawnParticles(wormhole.x, wormhole.y, '#A78BFA', 40);

        const level = levels[currentLevel];
        const stars = shots <= level.par ? 3 : shots <= level.par + 1 ? 2 : 1;
        const starsText = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

        totalShots += shots;
        totalStars += stars;

        if (elStars) elStars.textContent = starsText;
        if (elWinOverlay) elWinOverlay.style.display = 'flex';

        GameAudio.playStarRating(stars);

        const key = `slingshot_best_${currentLevel}`;
        const prev = bestShots[currentLevel];
        if (!prev || shots < prev) {
            bestShots[currentLevel] = shots;
            localStorage.setItem(key, shots.toString());
        }
        updateUI();
    }

    function onBallOutOfBounds() {
        ballActive = false;
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

            if (px < -50 || px > W + 50 || py < -50 || py > H + 50) break;

            if (i % 3 === 0) prediction.push({ x: px, y: py });
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
        if (!active) return;
        update();
        draw();
        animId = requestAnimationFrame(gameLoop);
    }

    function update() {
        if (ballActive) {
            // 使用固定时间步长，避免帧率影响
            const dt = 1 / 60;
            updateBall(dt);
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
            // 行星本体（径向渐变模拟球体）
            const grad = ctx.createRadialGradient(
                p.x - p.r * 0.3, p.y - p.r * 0.3, 0,
                p.x, p.y, p.r
            );
            grad.addColorStop(0, lightenColor(p.color, 30));
            grad.addColorStop(0.7, p.color);
            grad.addColorStop(1, darkenColor(p.color, 40));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.fillStyle = grad;
            ctx.fill();

            // 行星边缘光
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    function drawWormhole() {
        if (!wormhole) return;
        const { x, y, r, angle } = wormhole;

        // 旋转同心圆环
        for (let i = 0; i < 3; i++) {
            const ringR = r + 8 + i * 8;
            const startAngle = angle + i * 0.5;
            ctx.beginPath();
            ctx.arc(x, y, ringR, startAngle, startAngle + PI * 1.2);
            ctx.strokeStyle = `rgba(167, 139, 250, ${0.6 - i * 0.15})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 中心光晕
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
        for (let i = 1; i < ballTrail.length; i++) {
            const alpha = i / ballTrail.length * 0.6;
            const size = (i / ballTrail.length) * 3;
            ctx.beginPath();
            ctx.arc(ballTrail[i].x, ballTrail[i].y, size, 0, TAU);
            ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
            ctx.fill();
        }
    }

    function drawBall() {
        if (!ball) return;

        // 光晕
        const grad = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 15);
        grad.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
        grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 15, 0, TAU);
        ctx.fillStyle = grad;
        ctx.fill();

        // 能量球
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 6, 0, TAU);
        ctx.fillStyle = '#22C55E';
        ctx.fill();

        // 高光
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, 2, 0, TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
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

    return { show, hide };
})();
