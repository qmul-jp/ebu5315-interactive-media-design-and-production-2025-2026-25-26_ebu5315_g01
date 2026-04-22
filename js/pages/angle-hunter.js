/**
 * angle-hunter.js - 角度猎人游戏（Angle Hunter）
 * 核心玩法：拖动圆上的顶点，推导未知角度
 */
const AngleHunter = (() => {
    'use strict';

    const PI = Math.PI;
    const TAU = PI * 2;
    const DEG = 180 / PI;

    let canvas, ctx, W, H;
    let active = false;
    let animId = null;

    // 关卡
    let currentLevel = 0;
    let hints = 3;
    let solvedCount = 0;
    let totalUnknowns = 0;
    let levelComplete = false;

    // 圆和顶点
    let cx, cy, R;
    let vertices = [];   // { angle, label, draggable }
    let edges = [];      // { from, to }
    let angles = [];     // { vertexIdx, p1Idx, p2Idx, value, known, solved, color }

    // 交互
    let dragging = null;
    let selectedAngle = null;
    let inputMode = false;
    let inputValue = '';

    // 粒子
    let particles = [];

    // 反馈
    let feedbackText = '';
    let feedbackTimer = 0;
    let feedbackColor = '#22C55E';

    // 知识提示
    let knowledgeTips = [];
    let tipTimer = 0;

    // DOM
    let elLevel, elSolved, elHints;
    let elStartOverlay, elWinOverlay, elStars;
    let elKnowledgeTip, elKnowledgeText;

    // ===== 关卡数据 =====
    // vertices: 角度（弧度），edges: 顶点索引对
    // unknowns: { vertex, p1, p2, answer } — 需要玩家求解的角度
    const levels = [
        // Level 1: Thales定理 — 半圆上的角=90°
        {
            vertices: [PI, 0, PI / 2],  // A(左), B(右), C(上) — BC是直径
            labels: ['A', 'B', 'C'],
            edges: [[0, 1], [1, 2], [2, 0]],
            knownAngles: [
                { vertex: 0, p1: 2, p2: 1, value: 90 }
            ],
            unknowns: [
                { vertex: 1, p1: 0, p2: 2, answer: 90 },
                { vertex: 2, p1: 1, p2: 0, answer: 90 }
            ],
            tip: 'hunter.knowledge.thales',
            par: 0
        },
        // Level 2: 圆周角定理 — 圆心角=2×圆周角
        {
            vertices: [PI * 1.5, PI * 0.5, PI * 0.85],
            labels: ['A', 'B', 'C'],
            edges: [[0, 1], [1, 2], [2, 0]],
            knownAngles: [
                { vertex: 0, p1: 2, p2: 1, value: 120 }
            ],
            unknowns: [
                { vertex: 1, p1: 0, p2: 2, answer: 60 },
                { vertex: 2, p1: 1, p2: 0, answer: 30 }
            ],
            tip: 'hunter.knowledge.inscribedAngle',
            par: 1
        },
        // Level 3: 同弧上的圆周角相等
        {
            vertices: [PI * 1.25, PI * 0.75, PI * 0.3, PI * 1.7],
            labels: ['A', 'B', 'C', 'D'],
            edges: [[0, 1], [1, 2], [2, 0], [0, 1], [1, 3], [3, 0]],
            knownAngles: [
                { vertex: 2, p1: 0, p2: 1, value: 40 }
            ],
            unknowns: [
                { vertex: 3, p1: 0, p2: 1, answer: 40 }
            ],
            tip: 'hunter.knowledge.sameArc',
            par: 0
        },
        // Level 4: 三角形内角和
        {
            vertices: [PI * 1.4, PI * 0.4, PI * 0.9],
            labels: ['A', 'B', 'C'],
            edges: [[0, 1], [1, 2], [2, 0]],
            knownAngles: [
                { vertex: 0, p1: 2, p2: 1, value: 70 },
                { vertex: 1, p1: 0, p2: 2, value: 55 }
            ],
            unknowns: [
                { vertex: 2, p1: 1, p2: 0, answer: 55 }
            ],
            tip: 'hunter.knowledge.triangleSum',
            par: 0
        },
        // Level 5: Thales + 内角和
        {
            vertices: [PI, 0, PI / 2],
            labels: ['A', 'B', 'C'],
            edges: [[0, 1], [1, 2], [2, 0]],
            knownAngles: [],
            unknowns: [
                { vertex: 0, p1: 2, p2: 1, answer: 90 },
                { vertex: 1, p1: 0, p2: 2, answer: 90 },
                { vertex: 2, p1: 1, p2: 0, answer: 90 }
            ],
            tip: 'hunter.knowledge.thales',
            par: 1
        },
        // Level 6: 圆内接四边形 — 对角互补
        {
            vertices: [PI * 1.3, PI * 0.7, PI * 0.2, PI * 1.8],
            labels: ['A', 'B', 'C', 'D'],
            edges: [[0, 1], [1, 2], [2, 3], [3, 0]],
            knownAngles: [
                { vertex: 0, p1: 3, p2: 1, value: 75 },
                { vertex: 2, p1: 1, p2: 3, value: 105 }
            ],
            unknowns: [
                { vertex: 1, p1: 0, p2: 2, answer: 105 },
                { vertex: 3, p1: 2, p2: 0, answer: 75 }
            ],
            tip: 'hunter.knowledge.cyclicQuad',
            par: 1
        },
        // Level 7: 综合题 — 圆周角+内角和
        {
            vertices: [PI * 1.5, PI * 0.5, PI * 0.8, PI * 1.2],
            labels: ['A', 'B', 'C', 'D'],
            edges: [[0, 1], [1, 2], [2, 0], [0, 1], [1, 3], [3, 0]],
            knownAngles: [
                { vertex: 0, p1: 2, p2: 1, value: 100 }
            ],
            unknowns: [
                { vertex: 1, p1: 0, p2: 2, answer: 50 },
                { vertex: 2, p1: 1, p2: 0, answer: 30 },
                { vertex: 3, p1: 0, p2: 1, answer: 50 }
            ],
            tip: 'hunter.knowledge.inscribedAngle',
            par: 2
        },
        // Level 8: 高级 — 内接四边形+同弧
        {
            vertices: [PI * 1.4, PI * 0.6, PI * 0.15, PI * 1.85],
            labels: ['A', 'B', 'C', 'D'],
            edges: [[0, 1], [1, 2], [2, 3], [3, 0]],
            knownAngles: [
                { vertex: 0, p1: 3, p2: 1, value: 80 },
                { vertex: 1, p1: 0, p2: 2, value: 100 }
            ],
            unknowns: [
                { vertex: 2, p1: 1, p2: 3, answer: 80 },
                { vertex: 3, p1: 2, p2: 0, answer: 100 }
            ],
            tip: 'hunter.knowledge.cyclicQuad',
            par: 0
        }
    ];

    // ===== 初始化 =====
    function init() {
        canvas = document.getElementById('hunterCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        elLevel = document.getElementById('hunterLevel');
        elSolved = document.getElementById('hunterSolved');
        elHints = document.getElementById('hunterHints');
        elStartOverlay = document.getElementById('hunterStartOverlay');
        elWinOverlay = document.getElementById('hunterWinOverlay');
        elStars = document.getElementById('hunterStars');
        elKnowledgeTip = document.getElementById('hunterKnowledgeTip');
        elKnowledgeText = document.getElementById('hunterKnowledgeText');

        initKnowledgeTips();
        bindEvents();
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function initKnowledgeTips() {
        knowledgeTips = [
            GameI18N.t('hunter.knowledge.thales'),
            GameI18N.t('hunter.knowledge.inscribedAngle'),
            GameI18N.t('hunter.knowledge.sameArc'),
            GameI18N.t('hunter.knowledge.cyclicQuad'),
            GameI18N.t('hunter.knowledge.triangleSum'),
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
        W = size; H = size;
        cx = W / 2; cy = H / 2;
        R = Math.min(W, H) * 0.35;
    }

    function bindEvents() {
        const startBtn = document.getElementById('hunterStartBtn');
        if (startBtn) startBtn.addEventListener('click', () => {
            if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
            startGame();
        });

        const nextBtn = document.getElementById('hunterNextBtn');
        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
            nextLevel();
        });

        if (canvas) {
            canvas.addEventListener('pointerdown', onPointerDown);
            canvas.addEventListener('pointermove', onPointerMove);
            canvas.addEventListener('pointerup', onPointerUp);
            canvas.addEventListener('pointercancel', onPointerUp);
        }

        // 键盘输入
        document.addEventListener('keydown', onKeyDown);
    }

    // ===== 游戏流程 =====
    function show() {
        active = true;
        init();
        resizeCanvas();
        if (elStartOverlay) elStartOverlay.style.display = 'flex';
        if (elWinOverlay) elWinOverlay.style.display = 'none';

        // 初始化音频上下文并播放背景音乐（复用森林背景音效，可根据需要调整）
        if (window.GameAudio) {
            if (typeof window.GameAudio.init === 'function') window.GameAudio.init();
            if (typeof window.GameAudio.playBgm === 'function') window.GameAudio.playBgm('forest');
        }

        drawStatic();
    }

    function hide() {
        active = false;
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        inputMode = false;

        if (window.GameAudio && typeof window.GameAudio.stopBgm === 'function') {
            window.GameAudio.stopBgm();
        }
    }

    function startGame() {
        currentLevel = 0;
        hints = 3;
        loadLevel(0);
        if (elStartOverlay) elStartOverlay.style.display = 'none';
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        gameLoop();
    }

    function nextLevel() {
        GameAudio.playClick();
        if (elWinOverlay) elWinOverlay.style.display = 'none';
        loadLevel(currentLevel + 1);
    }

    function loadLevel(idx) {
        if (idx >= levels.length) idx = 0;
        currentLevel = idx;
        const level = levels[idx];

        vertices = level.vertices.map((a, i) => ({
            angle: a,
            label: level.labels[i] || String.fromCharCode(65 + i),
            draggable: true
        }));

        edges = level.edges.map(e => ({ from: e[0], to: e[1] }));

        // 已知角度
        angles = level.knownAngles.map(a => ({
            vertexIdx: a.vertex,
            p1Idx: a.p1,
            p2Idx: a.p2,
            value: a.value,
            known: true,
            solved: true,
            color: '#22C55E'
        }));

        // 未知角度
        totalUnknowns = level.unknowns.length;
        solvedCount = 0;
        level.unknowns.forEach(u => {
            angles.push({
                vertexIdx: u.vertex,
                p1Idx: u.p1,
                p2Idx: u.p2,
                value: u.answer,
                known: false,
                solved: false,
                color: '#F59E0B'
            });
        });

        levelComplete = false;
        particles = [];
        feedbackText = '';
        feedbackTimer = 0;
        selectedAngle = null;
        inputMode = false;
        inputValue = '';

        updateUI();
        showKnowledgeTip(level.tip);
    }

    // ===== 角度计算 =====
    function getVertexPos(idx) {
        const v = vertices[idx];
        return {
            x: cx + Math.cos(v.angle) * R,
            y: cy + Math.sin(v.angle) * R
        };
    }

    function calcAngleAtVertex(angleObj) {
        const v = getVertexPos(angleObj.vertexIdx);
        const p1 = getVertexPos(angleObj.p1Idx);
        const p2 = getVertexPos(angleObj.p2Idx);

        const v1x = p1.x - v.x, v1y = p1.y - v.y;
        const v2x = p2.x - v.x, v2y = p2.y - v.y;

        const dot = v1x * v2x + v1y * v2y;
        const cross = v1x * v2y - v1y * v2x;
        let angle = Math.atan2(Math.abs(cross), dot) * DEG;
        return Math.round(angle);
    }

    // ===== 交互 =====
    function onPointerDown(e) {
        if (levelComplete || inputMode) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 检查是否点击了顶点
        for (let i = 0; i < vertices.length; i++) {
            if (!vertices[i].draggable) continue;
            const p = getVertexPos(i);
            if (Math.hypot(mx - p.x, my - p.y) < 20) {
                dragging = i;
                canvas.setPointerCapture(e.pointerId);
                return;
            }
        }

        // 检查是否点击了未知角度
        for (let i = 0; i < angles.length; i++) {
            if (angles[i].known || angles[i].solved) continue;
            const v = getVertexPos(angles[i].vertexIdx);
            const dist = Math.hypot(mx - v.x, my - v.y);
            if (dist < 40 && dist > 20) {
                selectedAngle = i;
                inputMode = true;
                inputValue = '';
                GameAudio.playClick();
                return;
            }
        }
    }

    function onPointerMove(e) {
        if (dragging === null) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const angle = Math.atan2(my - cy, mx - cx);
        vertices[dragging].angle = angle;
    }

    function onPointerUp(e) {
        if (dragging !== null) {
            dragging = null;
        }
    }

    function onKeyDown(e) {
        if (!inputMode || selectedAngle === null) return;
        if (e.key === 'Enter') {
            submitAnswer();
        } else if (e.key === ' ') {
            e.preventDefault();
            inputValue = String(calcAngleAtVertex(angles[selectedAngle]));
        } else if (e.key === 'Escape') {
            inputMode = false;
            selectedAngle = null;
        } else if (e.key === 'Backspace') {
            inputValue = inputValue.slice(0, -1);
        } else if (e.key >= '0' && e.key <= '9') {
            if (inputValue.length < 4) inputValue += e.key;
        }
    }

    function submitAnswer() {
        if (selectedAngle === null) return;
        const angle = angles[selectedAngle];
        const measured = calcAngleAtVertex(angle);
        const parsed = parseInt(inputValue, 10);
        const answer = Number.isFinite(parsed) ? parsed : measured;
        const tolerance = 2;
        const matchedExpected = Math.abs(answer - angle.value) <= tolerance;
        const matchedMeasured = Math.abs(answer - measured) <= tolerance;

        if (matchedExpected || matchedMeasured) {
            if (!matchedExpected) angle.value = measured;
            angle.solved = true;
            angle.known = true;
            angle.color = '#22C55E';
            solvedCount++;
            feedbackText = GameI18N.t('hunter.correct');
            feedbackColor = '#22C55E';
            feedbackTimer = 50;
            GameAudio.playPerfect();

            const v = getVertexPos(angle.vertexIdx);
            spawnParticles(v.x, v.y, '#22C55E', 25);

            inputMode = false;
            selectedAngle = null;
            updateUI();

            if (solvedCount >= totalUnknowns) {
                levelComplete = true;
                const level = levels[currentLevel];
                const stars = hints >= level.par ? 3 : hints >= level.par - 1 ? 2 : 1;
                if (elStars) elStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
                if (elWinOverlay) elWinOverlay.style.display = 'flex';
                GameAudio.playStarRating(stars);
                spawnParticles(cx, cy, '#F59E0B', 50);
            }
        } else {
            // 错误
            feedbackText = GameI18N.t('hunter.wrong');
            feedbackColor = '#EF4444';
            feedbackTimer = 40;
            GameAudio.playMiss();
            inputValue = '';
        }
    }

    // ===== 粒子 =====
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * TAU;
            const s = 1 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
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
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.05;
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
        if (elSolved) elSolved.textContent = `${solvedCount}/${totalUnknowns}`;
        if (elHints) elHints.textContent = hints;
    }

    // ===== 渲染 =====
    function gameLoop() {
        if (!active) return;
        update();
        draw();
        animId = requestAnimationFrame(gameLoop);
    }

    function update() {
        updateParticles();
        if (feedbackTimer > 0) feedbackTimer--;
    }

    function draw() {
        if (!ctx) return;
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);

        drawCircle();
        drawEdges();
        drawAngles();
        drawVertices();
        drawParticles();
        drawFeedback();
        if (inputMode && selectedAngle !== null) drawInputBox();
    }

    function drawCircle() {
        // 光晕
        ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, TAU);
        ctx.strokeStyle = 'rgba(37,99,235,0.15)'; ctx.lineWidth = 6; ctx.stroke();
        // 主圆
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
        ctx.strokeStyle = 'rgba(37,99,235,0.4)'; ctx.lineWidth = 2; ctx.stroke();
        // 圆心
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU);
        ctx.fillStyle = 'rgba(148,163,184,0.4)'; ctx.fill();
    }

    function drawEdges() {
        edges.forEach(e => {
            const p1 = getVertexPos(e.from);
            const p2 = getVertexPos(e.to);
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(96,165,250,0.5)'; ctx.lineWidth = 2; ctx.stroke();
        });
    }

    function drawAngles() {
        angles.forEach((a, idx) => {
            const v = getVertexPos(a.vertexIdx);
            const p1 = getVertexPos(a.p1Idx);
            const p2 = getVertexPos(a.p2Idx);

            const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
            const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);

            // 角度弧线
            const arcR = 25;
            ctx.beginPath(); ctx.arc(v.x, v.y, arcR, a1, a2, false);
            ctx.strokeStyle = a.color;
            ctx.lineWidth = a.solved ? 3 : 2;
            ctx.globalAlpha = a.solved ? 1 : 0.7;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // 角度数值
            const midAngle = (a1 + a2) / 2;
            const labelR = arcR + 18;
            const lx = v.x + Math.cos(midAngle) * labelR;
            const ly = v.y + Math.sin(midAngle) * labelR;

            if (a.known) {
                ctx.fillStyle = a.color;
                ctx.font = 'bold 14px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${a.value}°`, lx, ly);
            } else {
                // 未知角度 — 问号
                const isSelected = selectedAngle === idx;
                ctx.fillStyle = isSelected ? '#F59E0B' : 'rgba(245,158,11,0.6)';
                ctx.font = `bold ${isSelected ? 18 : 16}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', lx, ly);

                // 选中时高亮
                if (isSelected) {
                    ctx.beginPath(); ctx.arc(v.x, v.y, 35, 0, TAU);
                    ctx.strokeStyle = 'rgba(245,158,11,0.4)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        });
    }

    function drawVertices() {
        vertices.forEach((v, i) => {
            const p = getVertexPos(i);
            const isDragged = dragging === i;

            // 顶点圆
            ctx.beginPath(); ctx.arc(p.x, p.y, isDragged ? 10 : 8, 0, TAU);
            ctx.fillStyle = isDragged ? '#F59E0B' : '#60A5FA';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 标签
            const labelR = R + 22;
            const lx = cx + Math.cos(v.angle) * labelR;
            const ly = cy + Math.sin(v.angle) * labelR;
            ctx.fillStyle = '#F8FAFC';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(v.label, lx, ly);
        });
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
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
        ctx.fillText(feedbackText, cx, 40);
        ctx.restore();
    }

    function drawInputBox() {
        const bw = 180, bh = 76;
        const bx = cx - bw / 2, by = cy + R + 50;
        const measured = selectedAngle !== null ? calcAngleAtVertex(angles[selectedAngle]) : null;

        ctx.fillStyle = 'rgba(30,41,59,0.95)';
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2; ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((inputValue || '--') + '°', cx, by + 26);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`当前图形约 ${measured}°`, cx, by + 50);

        ctx.font = '11px Inter, sans-serif';
        ctx.fillText('Space 填入测量值  Enter ✓  Esc ✕', cx, by + bh + 16);
    }

    function drawStatic() {
        if (!ctx) return;
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);
        drawCircle();
    }

    return { show, hide };
})();
