/**
 * 联系页：表单提交（演示，无后端）
 */
(function () {
    const contactForm = document.querySelector('.contact-form');
    if (!contactForm) return;
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');
    const requiredFields = [
        { el: nameInput, key: 'name' },
        { el: emailInput, key: 'email' },
        { el: messageInput, key: 'message' }
    ];

    const messages = {
        en: {
            requiredName: 'Please enter your name.',
            requiredEmail: 'Please enter your email.',
            invalidEmail: 'Please enter a valid email address (e.g. name@example.com).',
            requiredMessage: 'Please enter your message.',
            success: 'Thank you for your message! We will get back to you soon.'
        },
        zh: {
            requiredName: '请输入姓名。',
            requiredEmail: '请输入邮箱。',
            invalidEmail: '请输入有效的邮箱地址（例如：name@example.com）。',
            requiredMessage: '请输入留言。',
            success: '感谢你的留言！我们会尽快回复你。'
        }
    };

    function getLang() {
        const docLang = (document.documentElement.lang || '').toLowerCase();
        if (docLang.startsWith('zh')) return 'zh';
        const zhRadio = document.getElementById('glass-lang-zh');
        if (zhRadio && zhRadio.checked) return 'zh';
        const enRadio = document.getElementById('glass-lang-en');
        if (enRadio && enRadio.checked) return 'en';
        try { return localStorage.getItem('lang') === 'zh' ? 'zh' : 'en'; } catch (e) { return 'en'; }
    }

    function t(key) {
        const lang = getLang();
        return messages[lang]?.[key] || messages.en[key] || '';
    }

    function getRequiredMessageByKey(fieldKey) {
        if (fieldKey === 'name') return t('requiredName');
        if (fieldKey === 'email') return t('requiredEmail');
        return t('requiredMessage');
    }

    function getInvalidMessage(inputEl, fieldKey) {
        if (!inputEl || !inputEl.validity) return '';
        if (inputEl.validity.valueMissing) return getRequiredMessageByKey(fieldKey);
        if (fieldKey === 'email' && inputEl.validity.typeMismatch) return t('invalidEmail');
        return '';
    }

    function clearCustomValidityForField(inputEl) {
        if (!inputEl) return;
        inputEl.setCustomValidity('');
    }

    requiredFields.forEach(({ el }) => {
        if (!el) return;
        el.addEventListener('input', () => clearCustomValidityForField(el));
    });

    requiredFields.forEach(({ el, key }) => {
        if (!el) return;
        el.addEventListener('invalid', () => {
            clearCustomValidityForField(el);
            const message = getInvalidMessage(el, key);
            if (message) el.setCustomValidity(message);
        });
    });

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!contactForm.checkValidity()) {
            contactForm.reportValidity();
            return;
        }

        alert(t('success'));
        contactForm.reset();
    });
})();
