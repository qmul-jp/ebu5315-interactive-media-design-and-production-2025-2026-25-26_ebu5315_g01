/**
 * game.js - 游戏板块主控制器
 * 负责：视图切换、预览动画、双语初始化
 */
(function () {
    'use strict';

    // ===== 视图管理 =====
    const views = {
        menu: document.querySelectorAll('#gameMenuView'),
        sniper: document.getElementById('sniperView'),
        slingshot: document.getElementById('slingshotView')
    };

    function showView(name) {
        // 隐藏所有视图
        views.menu.forEach(el => el.style.display = 'none');
        if (views.sniper) views.sniper.style.display = 'none';
        if (views.slingshot) views.slingshot.style.display = 'none';

        // 显示目标视图
        if (name === 'menu') {
            views.menu.forEach(el => el.style.display = '');
        } else if (name === 'sniper' && views.sniper) {
            views.sniper.style.display = 'flex';
        } else if (name === 'slingshot' && views.slingshot) {
            views.slingshot.style.display = 'flex';
        }

        // 控制 header/footer 显隐
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
    function initNavigation() {
        // 进入圆周狙击
        const btnSniper = document.getElementById('btnPlaySniper');
        if (btnSniper) {
            btnSniper.addEventListener('click', (e) => {
                e.stopPropagation();
                GameAudio.playClick();
                showView('sniper');
                if (typeof PiSniper !== 'undefined') PiSniper.show();
            });
        }

        // 返回菜单按钮
        ['sniperBackBtn', 'sniperMenuBtn',].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    GameAudio.playClick();
                    // 停止游戏
                    if (typeof PiSniper !== 'undefined') PiSniper.hide();
                    showView('menu');
                });
            }
        });
    }

    // ===== 预览动画 =====
    function initPreviewAnimations() {
        initSniperPreview();
    }

    function initSniperPreview() {
        const canvas = document.getElementById('previewSniper');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 200;

        let angle = 0;
        const targetAngle = Math.PI / 4;

        function animate() {
            if (canvas.style.display === 'none') {
                requestAnimationFrame(animate);
                return;
            }
            ctx.fillStyle = '#0F172A';
            ctx.fillRect(0, 0, 400, 200);

            const cx = 200, cy = 100, r = 70;

            // 单位圆
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(37, 99, 235, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 刻度
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
                ctx.lineTo(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5));
                ctx.strokeStyle = 'rgba(37, 99, 235, 0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // 旋转瞄准线
            angle += 0.015;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            ctx.strokeStyle = '#22C55E';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 目标
            const tx = cx + Math.cos(targetAngle) * r;
            const ty = cy + Math.sin(targetAngle) * r;
            ctx.beginPath();
            ctx.arc(tx, ty, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#EF4444';
            ctx.fill();

            // 角度显示
            const deg = ((angle * 180 / Math.PI) % 360 + 360) % 360;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${deg.toFixed(1)}°`, cx, cy + r + 25);

            requestAnimationFrame(animate);
        }
        animate();
    }

    // ===== 初始化 =====
    document.addEventListener('DOMContentLoaded', () => {
        GameI18N.init();
        GameI18N.translatePage();
        initNavigation();
        initPreviewAnimations();
        showView('menu');
    });
})();
