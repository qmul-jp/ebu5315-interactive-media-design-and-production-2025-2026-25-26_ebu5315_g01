/**
 * 工具函数：主题、语言、锚点滚动、导航高亮、涟漪样式注入
 */

function getSiteLang() {
    const stored = localStorage.getItem('lang');
    return stored === 'zh' || stored === 'en' ? stored : 'en';
}

function setSiteLang(nextLang) {
    const lang = nextLang === 'zh' ? 'zh' : 'en';
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.dispatchEvent(new CustomEvent('circlelearn:langchange', { detail: { lang } }));
    return lang;
}

function initTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('menuThemeToggle');
    const themeSwitchCheckbox = document.querySelector('.theme-switch__checkbox');
    const themeValue = document.getElementById('menuThemeValue');

    const updateThemeText = () => {
        if (themeValue) {
            const lang = getSiteLang();
            if (lang === 'zh') {
                themeValue.textContent = body.classList.contains('dark-mode') ? '开' : '关';
            } else {
                themeValue.textContent = body.classList.contains('dark-mode') ? 'On' : 'Off';
            }
        }
    };

    const applyTheme = (isDark) => {
        body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (themeSwitchCheckbox) {
            themeSwitchCheckbox.checked = isDark;
        }
        updateThemeText();
    };

    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme === 'dark');

    document.addEventListener('circlelearn:langchange', updateThemeText);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            applyTheme(!body.classList.contains('dark-mode'));
        });
    }

    if (themeSwitchCheckbox) {
        themeSwitchCheckbox.addEventListener('change', () => {
            applyTheme(themeSwitchCheckbox.checked);
        });
    }
}

function initLangToggle() {
    const langToggle = document.getElementById('menuLangToggle');
    const langValue = document.getElementById('menuLangValue');
    const zhRadio = document.getElementById('glass-lang-zh');
    const enRadio = document.getElementById('glass-lang-en');
    if (!langToggle && !zhRadio && !enRadio) return;
    let currentLang = getSiteLang();
    const updateLangText = () => {
        if (langValue) {
            langValue.textContent = currentLang === 'en' ? 'EN' : '中文';
        }
        if (zhRadio) zhRadio.checked = currentLang === 'zh';
        if (enRadio) enRadio.checked = currentLang === 'en';
    };
    updateLangText();
    setSiteLang(currentLang);

    const applyLang = (nextLang) => {
        currentLang = nextLang === 'zh' ? 'zh' : 'en';
        setSiteLang(currentLang);
        if (window.GameI18N && typeof window.GameI18N.setLang === 'function') {
            window.GameI18N.setLang(currentLang);
        }
        updateLangText();
    };

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            applyLang(currentLang === 'en' ? 'zh' : 'en');
        });
    }

    if (zhRadio) {
        zhRadio.addEventListener('change', () => {
            if (zhRadio.checked) applyLang('zh');
        });
    }

    if (enRadio) {
        enRadio.addEventListener('change', () => {
            if (enRadio.checked) applyLang('en');
        });
    }

    document.addEventListener('circlelearn:langchange', (e) => {
        const nextLang = e && e.detail && e.detail.lang;
        if (nextLang !== 'zh' && nextLang !== 'en') return;
        currentLang = nextLang;
        updateLangText();
    });
}

function initSettingsMenu() {
    const dropdown = document.querySelector('.settings-dropdown');
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsMenu = document.getElementById('settingsMenu');
    if (!dropdown || !settingsToggle || !settingsMenu) return;

    const closeMenu = () => {
        dropdown.classList.remove('is-open');
        settingsToggle.setAttribute('aria-expanded', 'false');
    };

    settingsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('is-open');
        settingsToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    settingsMenu.addEventListener('click', (e) => {
        const target = e.target;
        if (target instanceof HTMLElement && target.tagName === 'A') {
            closeMenu();
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });
}

function initSmoothAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#' || href.length < 2) return;
            let id;
            try {
                id = decodeURIComponent(href.slice(1));
            } catch (err) {
                id = href.slice(1);
            }
            if (!id) return;
            const target = document.getElementById(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initNavScrollSpy() {
    /* 仅首页启用：当前导航只有 Home 锚点，首页任意滚动位置都保持 Home 高亮 */
    if (!document.body.classList.contains('page-scroll-spy')) return;

    const navLinks = document.querySelectorAll('.nav-link');
    if (!navLinks.length) return;

    navLinks.forEach((link) => {
        link.classList.remove('active');
    });
    const homeLink = document.querySelector('.nav-link[href="#home"]');
    if (homeLink) {
        homeLink.classList.add('active');
    }
}

function injectRippleStyles() {
    if (document.getElementById('circlelearn-ripple-styles')) return;
    const style = document.createElement('style');
    style.id = 'circlelearn-ripple-styles';
    style.textContent = `
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
        }
        @keyframes ripple-animation {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

function initButtonRipples() {
    const selector =
        '.btn, .btn-primary, .btn-outline, .btn-primary-full, .btn-success-full, .btn-premium, .btn-send';
    document.querySelectorAll(selector).forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const ripple = document.createElement('span');
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });
}
