(function () {
    'use strict';

    const PREMIUM_STORAGE_KEY = 'circlelearnPremiumPlanV1';
    const GAME_SKIN_STORAGE_KEY = 'circlelearnGameSkinV1';
    const planButtons = document.querySelectorAll('.plan-buy-btn');
    const statusEl = document.getElementById('premiumMemberStatus');
    const debugResetBtn = document.getElementById('premiumDebugResetBtn');

    function readPlan() {
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

    function formatRemaining(expireAt) {
        if (!expireAt) return '长期有效';
        const remainMs = Math.max(0, expireAt - Date.now());
        const remainDays = Math.ceil(remainMs / (24 * 60 * 60 * 1000));
        return `剩余 ${remainDays} 天`;
    }

    function updateStatus() {
        if (!statusEl) return;
        const plan = readPlan();
        if (!plan) {
            statusEl.textContent = '当前状态：未开通';
            return;
        }
        statusEl.textContent = `当前状态：已开通（${plan.name}，${formatRemaining(plan.expireAt)}）`;
    }

    function savePlan(btn) {
        const planId = btn.getAttribute('data-plan-id') || '';
        const planName = btn.getAttribute('data-plan-name') || 'Premium';
        const planPrice = Number(btn.getAttribute('data-plan-price') || 0);
        const planDays = Number(btn.getAttribute('data-plan-days') || 0);
        const now = Date.now();
        const expireAt = planDays > 0 ? now + planDays * 24 * 60 * 60 * 1000 : null;

        const payload = {
            id: planId,
            name: planName,
            price: planPrice,
            currency: 'CNY',
            startAt: now,
            expireAt
        };

        localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(payload));
        updateStatus();
        window.alert(`支付成功：${planName} 已开通！\n现在可前往 Game 页面使用更多皮肤。`);
    }

    planButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const planName = btn.getAttribute('data-plan-name') || 'Premium';
            const planPrice = btn.getAttribute('data-plan-price') || '0';
            const ok = window.confirm(`确认开通 ${planName}（¥${planPrice}）？`);
            if (!ok) return;
            savePlan(btn);
        });
    });

    if (debugResetBtn) {
        debugResetBtn.addEventListener('click', () => {
            const ok = window.confirm('确认恢复为“未开通”状态吗？该操作仅用于调试。');
            if (!ok) return;
            localStorage.removeItem(PREMIUM_STORAGE_KEY);
            localStorage.removeItem(GAME_SKIN_STORAGE_KEY);
            updateStatus();
            window.alert('已恢复为未开通状态。');
        });
    }

    updateStatus();
})();
