/**
 * game.js - 游戏板块主控制器
 * 负责：视图切换、预览动画、双语初始化
 */
(function () {
    'use strict';

    const PREMIUM_STORAGE_KEY = 'circlelearnPremiumPlanV1';
    const GAME_SKIN_STORAGE_KEY = 'circlelearnGameSkinV1';

    function readPremiumPlan() {
        try {
            const raw = localStorage.getItem(PREMIUM_STORAGE_KEY);
            if (!raw) return null;
            const plan = JSON.parse(raw);
            if (!plan || typeof plan !== 'object') return null;
            if (typeof plan.expireAt === 'number' && Date.now() > plan.expireAt) {
                localStorage.removeItem(PREMIUM_STORAGE_KEY);
                return null;
            }
            return plan;
        } catch (err) {
            return null;
        }
    }

    function tGame(key, fallback = key) {
        if (window.GameI18N && typeof window.GameI18N.t === 'function') {
            return window.GameI18N.t(key);
        }
        return fallback;
    }

    function withVars(template, vars) {
        return String(template).replace(/\{(\w+)\}/g, (_, name) => {
            return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : '';
        });
    }

    function formatPremiumRemaining(expireAt) {
        if (!expireAt) return tGame('game.premium.remaining.forever', 'Lifetime');
        const remainMs = Math.max(0, expireAt - Date.now());
        const remainDays = Math.ceil(remainMs / (24 * 60 * 60 * 1000));
        return withVars(
            tGame('game.premium.remaining.days', '{days} days left'),
            { days: remainDays }
        );
    }

    function applyMenuSkin(skinName) {
        document.body.classList.remove(
            'game-skin-aurora',
            'game-skin-sunset',
            'game-skin-neon'
        );
        if (skinName && skinName !== 'default') {
            document.body.classList.add(`game-skin-${skinName}`);
        }
    }

    function initPremiumSkins() {
        const lab = document.getElementById('premiumSkinLab');
        const statusEl = document.getElementById('premiumSkinStatus');
        const unlockCta = document.getElementById('premiumUnlockCta');
        if (!lab || !statusEl || !unlockCta) return;

        localStorage.removeItem(GAME_SKIN_STORAGE_KEY);
        applyMenuSkin('default');

        const renderPremiumStatus = () => {
            const plan = readPremiumPlan();
            const hasPremium = Boolean(plan);
            if (hasPremium) {
                statusEl.textContent = withVars(
                    tGame('game.premium.status.active', 'Active: {plan} ({remaining})'),
                    {
                        plan: plan.name || tGame('game.premium.active', 'Premium Active'),
                        remaining: formatPremiumRemaining(plan.expireAt)
                    }
                );
                unlockCta.textContent = tGame('game.premium.active', 'Premium Active');
                unlockCta.setAttribute('aria-disabled', 'true');
                unlockCta.classList.add('is-disabled');
                unlockCta.setAttribute('tabindex', '-1');
                lab.classList.remove('is-locked');
            } else {
                statusEl.textContent = tGame(
                    'game.premium.status.locked',
                    'Not active: visit Premium page to unlock more skin themes.'
                );
                unlockCta.textContent = tGame('game.premium.unlock', 'Get Premium');
                unlockCta.removeAttribute('aria-disabled');
                unlockCta.classList.remove('is-disabled');
                unlockCta.removeAttribute('tabindex');
                lab.classList.add('is-locked');
            }
        };

        renderPremiumStatus();
        document.addEventListener('gameLanguageChanged', renderPremiumStatus);
    }

    // ===== 视图管理 =====
    const views = {
        menu: document.getElementById('menuView'),
        sniper: document.getElementById('sniperView'),
        slingshot: document.getElementById('slingshotView'),
        chord: document.getElementById('chordView')
    };

    function showView(name) {
        Object.values(views).forEach(v => {
            if (!v) return;
            if (typeof v.forEach === 'function') {
                v.forEach(el => el.style.display = 'none');
                return;
            }
            v.style.display = 'none';
        });

        if (name === 'menu') {
            const menuHero = document.getElementById('gameMenuHero');
            const menuMain = document.getElementById('gameMenuMain');
            if (menuHero) menuHero.style.display = 'block';
            if (menuMain) menuMain.style.display = 'block';
        } else if (views[name]) {
            views[name].style.display = 'flex';
        }

        const header = document.querySelector('.header');
        const footer = document.querySelector('.footer');
        if (name === 'menu') {
            if (header) header.style.display = '';
            if (footer) footer.style.display = '';
        } else {
            if (header) header.style.display = 'none';
            if (footer) footer.style.display = 'none';
        }
    }

    // ===== 按钮事件绑定 =====
    function getGameModule(moduleName) {
        if (moduleName === 'PiSniper' && typeof PiSniper !== 'undefined') return PiSniper;
        if (moduleName === 'GravitySlingshot' && typeof GravitySlingshot !== 'undefined') return GravitySlingshot;
        if (moduleName === 'ChordBreaker' && typeof ChordBreaker !== 'undefined') return ChordBreaker;
        return null;
    }

    function initNavigation() {
        const gameEntries = [
            { btn: 'btnPlaySniper', view: 'sniper', module: 'PiSniper' },
            { btn: 'btnPlaySlingshot', view: 'slingshot', module: 'GravitySlingshot' },
            { btn: 'btnPlayChord', view: 'chord', module: 'ChordBreaker' }
        ];

        gameEntries.forEach(({ btn, view, module }) => {
            const el = document.getElementById(btn);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.GameAudio && typeof window.GameAudio.init === 'function') window.GameAudio.init();
                    GameAudio.playClick();
                    showView(view);
                    const gameModule = getGameModule(module);
                    if (gameModule && typeof gameModule.show === 'function') gameModule.show();
                });
            }
        });

        // 返回菜单按钮
        const backBtns = [
            'sniperBackBtn', 'sniperMenuBtn', 'sniperBackFromStartBtn',
            'slingshotBackBtn', 'slingshotMenuBtn', 'slingshotBackFromStartBtn',
            'chordBackBtn', 'chordMenuBtn', 'chordFinalMenuBtn', 'chordBackFromStartBtn'
        ];
        backBtns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    GameAudio.playClick();
                    if (typeof PiSniper !== 'undefined') PiSniper.hide();
                    if (typeof GravitySlingshot !== 'undefined') GravitySlingshot.hide();
                    if (typeof ChordBreaker !== 'undefined') ChordBreaker.hide();
                    showView('menu');
                });
            }
        });

        // 练习报告按钮
        const reportBtn = document.getElementById('sniperReportBtn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                GameAudio.playClick();
                const endOverlay = document.getElementById('sniperEndOverlay');
                const reportOverlay = document.getElementById('sniperReportOverlay');
                if (endOverlay) endOverlay.style.display = 'none';
                if (reportOverlay) reportOverlay.style.display = 'flex';
                // 填充报告内容
                const reportContent = document.getElementById('sniperReportContent');
                if (reportContent && window.piSniperReport) {
                    const r = window.piSniperReport;
                    const lang = GameI18N.getLang();
                    const t = GameI18N.t.bind(GameI18N);
                    let html = '';
                    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">`;
                    html += `<div style="background:rgba(30,41,59,0.8);padding:8px 12px;border-radius:6px;"><span style="color:#94A3B8;">${t('sniper.report.hitRate')}</span><br><strong style="color:#F8FAFC;font-size:18px;">${r.hitRate}%</strong></div>`;
                    html += `<div style="background:rgba(30,41,59,0.8);padding:8px 12px;border-radius:6px;"><span style="color:#94A3B8;">${t('sniper.report.maxCombo')}</span><br><strong style="color:#F8FAFC;font-size:18px;">${r.maxCombo}</strong></div>`;
                    html += `</div>`;
                    html += `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:12px;">`;
                    const grades = [
                        { label: t('sniper.report.perfectCount'), value: r.stats.perfects, color: '#F59E0B' },
                        { label: t('sniper.report.excellentCount'), value: r.stats.excellents, color: '#22C55E' },
                        { label: t('sniper.report.goodCount'), value: r.stats.goods, color: '#60A5FA' },
                        { label: t('sniper.report.hitCount'), value: r.stats.hits, color: '#94A3B8' },
                        { label: t('sniper.report.missCount'), value: r.stats.misses, color: '#EF4444' },
                    ];
                    grades.forEach(g => {
                        html += `<div style="background:rgba(30,41,59,0.8);padding:6px;border-radius:6px;text-align:center;">`;
                        html += `<div style="color:${g.color};font-size:16px;font-weight:bold;">${g.value}</div>`;
                        html += `<div style="color:#94A3B8;font-size:11px;">${g.label}</div>`;
                        html += `</div>`;
                    });
                    html += `</div>`;
                    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">`;
                    html += `<div style="background:rgba(30,41,59,0.8);padding:8px 12px;border-radius:6px;"><span style="color:#94A3B8;">${t('sniper.report.frenzyCount')}</span><br><strong style="color:#F59E0B;">${r.stats.frenzyCount}</strong></div>`;
                    html += `<div style="background:rgba(30,41,59,0.8);padding:8px 12px;border-radius:6px;"><span style="color:#94A3B8;">${t('sniper.report.bossDefeated')}</span><br><strong style="color:#A78BFA;">${r.stats.bossDefeated}</strong></div>`;
                    html += `</div>`;
                    // 薄弱角度区间
                    if (r.weakRanges && r.weakRanges.length > 0) {
                        html += `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:10px;margin-top:8px;">`;
                        html += `<div style="color:#FCA5A5;font-weight:bold;margin-bottom:6px;">⚠ ${t('sniper.report.weakAngles')}</div>`;
                        r.weakRanges.forEach(w => {
                            html += `<div style="color:#FECACA;font-size:13px;">${w.range}: ${w.rate}% ${t('sniper.report.practiceMore')}</div>`;
                        });
                        html += `</div>`;
                    }
                    reportContent.innerHTML = html;
                }
            });
        }

        // 关闭报告按钮
        const reportCloseBtn = document.getElementById('sniperReportCloseBtn');
        if (reportCloseBtn) {
            reportCloseBtn.addEventListener('click', () => {
                GameAudio.playClick();
                const reportOverlay = document.getElementById('sniperReportOverlay');
                const endOverlay = document.getElementById('sniperEndOverlay');
                if (reportOverlay) reportOverlay.style.display = 'none';
                if (endOverlay) endOverlay.style.display = 'flex';
            });
        }
    }

    // ===== 预览动画 =====
    function initPreviewAnimations() {
        initSlingshotPreview();
        initSniperPreview();
        initHunterPreview();
        initChordPreview();
    }

    function initSlingshotPreview() {
        const canvas = document.getElementById('previewSlingshot');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 400; canvas.height = 200;
        const planets = [
            { x: 120, y: 100, r: 30, color: '#2563EB' },
            { x: 280, y: 80, r: 20, color: '#7C3AED' },
            { x: 200, y: 150, r: 25, color: '#EC4899' }
        ];
        let ball = { x: 30, y: 100, trail: [] };
        let angle = 0;
        function animate() {
            if (canvas.style.display === 'none') { requestAnimationFrame(animate); return; }
            ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, 400, 200);
            for (let i = 0; i < 30; i++) {
                ctx.beginPath();
                ctx.arc((i * 137.5) % 400, (i * 97.3) % 200, 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(angle + i) * 0.2})`; ctx.fill();
            }
            planets.forEach(p => {
                const grad = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r);
                grad.addColorStop(0, p.color); grad.addColorStop(1, 'rgba(0,0,0,0.5)');
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(37,99,235,${0.1 + Math.sin(angle * 2) * 0.05})`; ctx.lineWidth = 1; ctx.stroke();
            });
            angle += 0.02;
            ball.x = 30 + 340 * ((Math.sin(angle * 0.5) + 1) / 2);
            ball.y = 100 + Math.sin(angle * 1.5) * 60;
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 40) ball.trail.shift();
            ball.trail.forEach((t, i) => {
                ctx.beginPath(); ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(34,197,94,${i / ball.trail.length * 0.6})`; ctx.fill();
            });
            ctx.beginPath(); ctx.arc(ball.x, ball.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#22C55E'; ctx.fill();
            requestAnimationFrame(animate);
        }
        animate();
    }

    function initSniperPreview() {
        const canvas = document.getElementById('previewSniper');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 400; canvas.height = 200;
        let angle = 0;
        const targetAngle = Math.PI / 4;
        function animate() {
            if (canvas.style.display === 'none') { requestAnimationFrame(animate); return; }
            ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, 400, 200);
            const cx = 200, cy = 100, r = 70;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(37,99,235,0.3)'; ctx.lineWidth = 2; ctx.stroke();
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
                ctx.lineTo(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5));
                ctx.strokeStyle = 'rgba(37,99,235,0.5)'; ctx.lineWidth = 1; ctx.stroke();
            }
            angle += 0.015;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            ctx.strokeStyle = '#22C55E'; ctx.lineWidth = 2; ctx.stroke();
            const tx = cx + Math.cos(targetAngle) * r, ty = cy + Math.sin(targetAngle) * r;
            ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI * 2); ctx.fillStyle = '#EF4444'; ctx.fill();
            const deg = ((angle * 180 / Math.PI) % 360 + 360) % 360;
            ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
            ctx.fillText(`${deg.toFixed(1)}°`, cx, cy + r + 25);
            requestAnimationFrame(animate);
        }
        animate();
    }

    function initHunterPreview() {
        const canvas = document.getElementById('previewHunter');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 400; canvas.height = 200;
        const cx = 200, cy = 100, r = 75;
        // 三个顶点（内接三角形）
        let verts = [
            { angle: -Math.PI / 2 },        // 顶部 (A)
            { angle: Math.PI / 6 },          // 右下 (B)
            { angle: Math.PI * 5 / 6 }       // 左下 (C)
        ];
        let t = 0;
        function animate() {
            if (canvas.style.display === 'none') { requestAnimationFrame(animate); return; }
            ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, 400, 200);
            t += 0.01;
            // 圆
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(37,99,235,0.3)'; ctx.lineWidth = 2; ctx.stroke();
            // 三角形
            const pts = verts.map(v => ({
                x: cx + Math.cos(v.angle + t * 0.3) * r,
                y: cy + Math.sin(v.angle + t * 0.3) * r
            }));
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.lineTo(pts[2].x, pts[2].y);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(96,165,250,0.6)'; ctx.lineWidth = 2; ctx.stroke();
            // 顶点
            pts.forEach((p, i) => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#60A5FA'; ctx.fill();
                ctx.fillStyle = '#F8FAFC'; ctx.font = 'bold 11px Inter,sans-serif';
                ctx.textAlign = 'center'; ctx.fillText(['A', 'B', 'C'][i], p.x, p.y - 12);
            });
            // 角度弧线
            const drawAngleArc = (p1, vertex, p2, radius, color) => {
                const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
                const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
                ctx.beginPath(); ctx.arc(vertex.x, vertex.y, radius, a1, a2, false);
                ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
            };
            drawAngleArc(pts[1], pts[0], pts[2], 20, 'rgba(245,158,11,0.7)');
            drawAngleArc(pts[0], pts[1], pts[2], 18, 'rgba(34,197,94,0.7)');
            drawAngleArc(pts[0], pts[2], pts[1], 18, 'rgba(167,139,250,0.7)');
            requestAnimationFrame(animate);
        }
        animate();
    }

    function initChordPreview() {
        const canvas = document.getElementById('previewChord');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 400; canvas.height = 200;
        const cx = 200, cy = 100, r = 75;
        // 两根弦
        const chords = [
            { x1: cx - 60, y1: cy - 40, x2: cx + 60, y2: cy + 40 },
            { x1: cx - 50, y1: cy + 30, x2: cx + 50, y2: cy - 50 }
        ];
        // 交点
        const ix = cx + 5, iy = cy - 5;
        let ball = { x: cx - r + 10, y: cy, vx: 3, vy: -1.5, trail: [] };
        let t = 0;

        function animate() {
            if (canvas.style.display === 'none') { requestAnimationFrame(animate); return; }
            ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, 400, 200);
            t += 0.02;
            // 圆
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(37,99,235,0.3)'; ctx.lineWidth = 2; ctx.stroke();
            // 弦
            chords.forEach(c => {
                ctx.beginPath(); ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2);
                ctx.strokeStyle = 'rgba(96,165,250,0.5)'; ctx.lineWidth = 2; ctx.stroke();
                // 节点
                [{ x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 }].forEach(n => {
                    ctx.beginPath(); ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#60A5FA'; ctx.fill();
                });
            });
            // 交点光晕
            ctx.beginPath(); ctx.arc(ix, iy, 8 + Math.sin(t * 3) * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(245,158,11,${0.3 + Math.sin(t * 3) * 0.15})`; ctx.fill();
            ctx.beginPath(); ctx.arc(ix, iy, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#F59E0B'; ctx.fill();
            // 球运动（简单弹射）
            ball.x += ball.vx; ball.y += ball.vy;
            const dx = ball.x - cx, dy = ball.y - cy;
            if (dx * dx + dy * dy > r * r) {
                // 反射
                const nx = dx / Math.sqrt(dx * dx + dy * dy);
                const ny = dy / Math.sqrt(dx * dx + dy * dy);
                const dot = ball.vx * nx + ball.vy * ny;
                ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny;
                ball.x = cx + nx * (r - 2); ball.y = cy + ny * (r - 2);
            }
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 30) ball.trail.shift();
            ball.trail.forEach((p, i) => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(34,197,94,${i / ball.trail.length * 0.6})`; ctx.fill();
            });
            ctx.beginPath(); ctx.arc(ball.x, ball.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#22C55E'; ctx.fill();
            requestAnimationFrame(animate);
        }
        animate();
    }

    // ===== 初始化 =====
    document.addEventListener('DOMContentLoaded', () => {
        GameI18N.init();
        GameI18N.translatePage();
        initNavigation();
        initPremiumSkins();
        initPreviewAnimations();
        showView('menu');
    });
})();
