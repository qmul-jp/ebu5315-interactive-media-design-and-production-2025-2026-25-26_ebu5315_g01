(function () {
    'use strict';

    const PREMIUM_STORAGE_KEY = 'circlelearnPremiumPlanV1';
    const GAME_SKIN_STORAGE_KEY = 'circlelearnGameSkinV1';
    const planButtons = document.querySelectorAll('.plan-buy-btn');
    const statusEl = document.getElementById('premiumMemberStatus');
    const debugResetBtn = document.getElementById('premiumDebugResetBtn');
    const pageTitleBase = 'Geometry Challenger';

    function t(key) {
        if (typeof window.getSiteI18nText === 'function') {
            return window.getSiteI18nText(key) || key;
        }
        return key;
    }

    function getPlanNameFromBtn(btn) {
        const key = btn.getAttribute('data-plan-name-key');
        if (key) return t(key);
        return btn.getAttribute('data-plan-name') || t('premium.plan.defaultName');
    }

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
        if (!expireAt) return t('premium.status.remaining.forever');
        const remainMs = Math.max(0, expireAt - Date.now());
        const remainDays = Math.ceil(remainMs / (24 * 60 * 60 * 1000));
        return t('premium.status.remaining.days').replace('{days}', String(remainDays));
    }

    function updateStatus() {
        if (!statusEl) return;
        const plan = readPlan();
        if (!plan) {
            statusEl.textContent = t('premium.status.locked');
            return;
        }
        statusEl.textContent = t('premium.status.active')
            .replace('{plan}', plan.name || t('premium.plan.defaultName'))
            .replace('{remaining}', formatRemaining(plan.expireAt));
    }

    function savePlan(btn) {
        const planId = btn.getAttribute('data-plan-id') || '';
        const planName = getPlanNameFromBtn(btn);
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
        window.alert(
            t('premium.alert.purchaseSuccess')
                .replace('{plan}', planName)
        );
    }

    planButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const planName = getPlanNameFromBtn(btn);
            const planPrice = btn.getAttribute('data-plan-price') || '0';
            const ok = window.confirm(
                t('premium.alert.confirmPurchase')
                    .replace('{plan}', planName)
                    .replace('{price}', planPrice)
            );
            if (!ok) return;
            savePlan(btn);
        });
    });

    if (debugResetBtn) {
        debugResetBtn.addEventListener('click', () => {
            const ok = window.confirm(t('premium.alert.confirmReset'));
            if (!ok) return;
            localStorage.removeItem(PREMIUM_STORAGE_KEY);
            localStorage.removeItem(GAME_SKIN_STORAGE_KEY);
            updateStatus();
            window.alert(t('premium.alert.resetDone'));
        });
    }

    document.addEventListener('circlelearn:langchange', () => {
        updateStatus();
        document.title = t('premium.page.title') + ' - ' + pageTitleBase;
    });
    document.title = t('premium.page.title') + ' - ' + pageTitleBase;
    updateStatus();
})();
