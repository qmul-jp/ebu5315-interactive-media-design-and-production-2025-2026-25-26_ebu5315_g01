/**
 * 工具函数：主题、语言、锚点滚动、导航高亮、涟漪样式注入
 */

function getSiteLang() {
    const stored = localStorage.getItem('lang');
    return stored === 'zh' || stored === 'en' ? stored : 'en';
}

const GLOBAL_FONT_SCALE_KEY = 'circlelearnGlobalFontScaleV1';
const SPRITE_ENABLED_KEY = 'circlelearnSpriteEnabledV1';
const FONT_SCALE_MIN = 85;
const FONT_SCALE_MAX = 125;
const FONT_SCALE_INITIAL = 95;
const FONT_SCALE_DEFAULT = 100;

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
    const themeSwitchCheckbox = document.querySelector('.switch .circle, .theme-switch__checkbox');
    const themeValue = document.getElementById('menuThemeValue');
    const isNewSwitch = Boolean(themeSwitchCheckbox && themeSwitchCheckbox.classList.contains('circle'));

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
            themeSwitchCheckbox.checked = isNewSwitch ? !isDark : isDark;
        }
        updateThemeText();
    };

    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme === 'dark');
    body.classList.add('theme-sync-ready');

    document.addEventListener('circlelearn:langchange', updateThemeText);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            applyTheme(!body.classList.contains('dark-mode'));
        });
    }

    if (themeSwitchCheckbox) {
        themeSwitchCheckbox.addEventListener('change', () => {
            applyTheme(isNewSwitch ? !themeSwitchCheckbox.checked : themeSwitchCheckbox.checked);
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

function getFontSize() {
    const stored = localStorage.getItem('preferredFontSize');
    return stored === 'small' || stored === 'large' || stored === 'medium' ? stored : 'medium';
}

function setFontSize(size, updateUI = true) {
    const body = document.body;
    body.classList.remove('font-small', 'font-large');
    if (size !== 'medium') {
        body.classList.add(`font-${size}`);
    }
    localStorage.setItem('preferredFontSize', size);
    
    if (updateUI) {
        updateFontSizeButtons(size);
    }
    
    document.dispatchEvent(new CustomEvent('circlelearn:fontsizechange', { detail: { size } }));
}

function updateFontSizeButtons(size) {
    const buttons = document.querySelectorAll('#fontSmall, #fontMedium, #fontLarge');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === 'fontSmall' && size === 'small') {
            btn.classList.add('active');
        } else if (btn.id === 'fontMedium' && size === 'medium') {
            btn.classList.add('active');
        } else if (btn.id === 'fontLarge' && size === 'large') {
            btn.classList.add('active');
        }
    });
}

function initFontSize() {
    const fontSmall = document.getElementById('fontSmall');
    const fontMedium = document.getElementById('fontMedium');
    const fontLarge = document.getElementById('fontLarge');
    
    if (!fontSmall || !fontMedium || !fontLarge) return;
    
    const currentSize = getFontSize();
    setFontSize(currentSize, true);
    
    fontSmall.addEventListener('click', () => setFontSize('small'));
    fontMedium.addEventListener('click', () => setFontSize('medium'));
    fontLarge.addEventListener('click', () => setFontSize('large'));
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

function initClickSelectMenu() {
    const selects = document.querySelectorAll('.select');
    if (!selects.length) return;

    const closeAll = (except) => {
        selects.forEach((select) => {
            if (select === except) return;
            select.classList.remove('is-open');
            const selected = select.querySelector('.selected');
            if (selected instanceof HTMLElement) {
                selected.setAttribute('aria-expanded', 'false');
            }
        });
    };

    selects.forEach((select) => {
        const selected = select.querySelector('.selected');
        if (!(selected instanceof HTMLElement)) return;

        selected.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = !select.classList.contains('is-open');
            closeAll(select);
            select.classList.toggle('is-open', willOpen);
            selected.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });

        select.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    document.addEventListener('click', () => {
        closeAll(null);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAll(null);
        }
    });
}

function getGlobalFontScale() {
    const stored = Number(localStorage.getItem(GLOBAL_FONT_SCALE_KEY));
    if (!Number.isFinite(stored)) return FONT_SCALE_INITIAL;
    return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, stored));
}

function applyGlobalFontScale(scale, persist = true) {
    const normalized = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Number(scale) || FONT_SCALE_DEFAULT));
    document.documentElement.style.fontSize = `${normalized}%`;
    if (persist) localStorage.setItem(GLOBAL_FONT_SCALE_KEY, String(normalized));
    return normalized;
}

function clampGlobalFontScale(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return FONT_SCALE_DEFAULT;
    return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(parsed)));
}

function getRangeProgressPercent(value) {
    const normalized = clampGlobalFontScale(value);
    return ((normalized - FONT_SCALE_MIN) / (FONT_SCALE_MAX - FONT_SCALE_MIN)) * 100;
}

function initGlobalFontScale() {
    applyGlobalFontScale(getGlobalFontScale(), false);
}

function buildSettingsModal() {
    if (document.getElementById('globalSettingsModal')) return document.getElementById('globalSettingsModal');
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.id = 'globalSettingsModal';
    modal.setAttribute('hidden', '');
    modal.innerHTML = `
        <div class="settings-modal__backdrop" data-settings-close="1"></div>
        <div class="settings-modal__panel" role="dialog" aria-modal="true" aria-labelledby="globalSettingsTitle">
            <div class="settings-modal__header">
                <h3 id="globalSettingsTitle" data-i18n="settings.modal.title">Settings</h3>
                <button type="button" class="settings-modal__close" aria-label="Close" data-settings-close="1">×</button>
            </div>
            <div class="settings-modal__content">
                <div class="settings-item-block">
                    <label for="settingsSpriteToggle" data-i18n="settings.sprite.label">AI Sprite</label>
                    <div class="settings-custom-select" id="settingsSpriteToggle">
                        <button type="button" class="settings-custom-select__trigger" aria-expanded="false">
                            <span id="settingsSpriteToggleValue">Enable</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="settings-custom-select__arrow" aria-hidden="true">
                                <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"></path>
                            </svg>
                        </button>
                        <div class="settings-custom-select__options">
                            <button type="button" class="settings-custom-select__option" data-value="1" data-i18n="settings.sprite.enable">Enable</button>
                            <button type="button" class="settings-custom-select__option" data-value="0" data-i18n="settings.sprite.disable">Disable</button>
                        </div>
                    </div>
                </div>
                <div class="settings-item-block">
                    <label for="settingsFontRange" data-i18n="settings.font.label">Font Size</label>
                    <div class="settings-range-row">
                        <input id="settingsFontRange" type="range" min="${FONT_SCALE_MIN}" max="${FONT_SCALE_MAX}" step="1" />
                        <div class="settings-percent-input-wrap">
                            <input id="settingsFontRangeValue" type="number" min="${FONT_SCALE_MIN}" max="${FONT_SCALE_MAX}" step="1" value="${FONT_SCALE_DEFAULT}" />
                            <span>%</span>
                        </div>
                        <button type="button" id="settingsFontResetBtn" class="settings-reset-btn" data-i18n="settings.font.reset">Default</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (typeof window.applySiteI18n === 'function') window.applySiteI18n();
    return modal;
}

function initSettingsModal() {
    const modal = buildSettingsModal();
    const spriteToggle = modal.querySelector('#settingsSpriteToggle');
    const spriteToggleTrigger = modal.querySelector('.settings-custom-select__trigger');
    const spriteToggleValue = modal.querySelector('#settingsSpriteToggleValue');
    const spriteOptions = Array.from(modal.querySelectorAll('.settings-custom-select__option'));
    const fontRange = modal.querySelector('#settingsFontRange');
    const fontValue = modal.querySelector('#settingsFontRangeValue');
    const fontResetBtn = modal.querySelector('#settingsFontResetBtn');
    const openers = document.querySelectorAll('.option-settings');
    if (!spriteToggle || !spriteToggleTrigger || !spriteToggleValue || !spriteOptions.length || !fontRange || !fontValue || !fontResetBtn || !openers.length) return;

    const setSpriteUIValue = (value) => {
        const next = value === '0' ? '0' : '1';
        spriteToggle.setAttribute('data-value', next);
        spriteOptions.forEach((option) => {
            option.classList.toggle('is-active', option.dataset.value === next);
        });
        const active = spriteOptions.find((option) => option.dataset.value === next);
        spriteToggleValue.textContent = active ? active.textContent : next;
    };

    const setFontUIValue = (value, persist = true) => {
        const next = applyGlobalFontScale(value, persist);
        fontRange.value = String(next);
        fontValue.value = String(next);
        fontRange.style.setProperty('--settings-range-progress', `${getRangeProgressPercent(next)}%`);
        return next;
    };

    const runSpritePeekEnterAnimation = () => {
        const widget = document.getElementById('aiSpriteWidget');
        if (!widget) return;
        const stack = widget.querySelector('.ai-sprite-stack');
        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        const managedClasses = [
            'is-visible',
            'is-waving',
            'is-exiting',
            'is-tuck-offscreen',
            'is-peek-emerge',
            'is-peek-tilt',
            'is-peek',
            'is-peek-popout',
            'is-smile-rest',
            'is-welcome-done',
            'is-returning-peek-exit',
            'is-returning-peek-tilt'
        ];
        const applyPeekExitMetrics = () => {
            if (!(bodyImg instanceof HTMLImageElement) || !bodyImg.naturalWidth) return;
            const rect = bodyImg.getBoundingClientRect();
            const bodyWidth = rect.width;
            if (!bodyWidth) return;
            const pad = 12;
            const visibleWidth = Math.max(52, Math.round(bodyWidth * 0.4));
            const tx = Math.round(bodyWidth + pad - visibleWidth);
            widget.style.setProperty('--ai-exit-x', `${tx}px`);
        };

        widget.style.removeProperty('display');
        widget.removeAttribute('hidden');
        widget.classList.remove(...managedClasses);
        // Enable路径只播放探头动画，不展示欢迎文案气泡。
        widget.classList.add('is-visible', 'is-tuck-offscreen', 'is-welcome-done');

        const onTiltEnd = (ev) => {
            if (ev.propertyName !== 'transform') return;
            if (!widget.classList.contains('is-peek-tilt')) return;
            widget.classList.add('is-peek');
        };
        const onEmergeEnd = (ev) => {
            if (ev.propertyName !== 'transform') return;
            if (!widget.classList.contains('is-peek-emerge') || widget.classList.contains('is-peek-tilt')) return;
            widget.classList.add('is-peek-tilt');
            if (stack) stack.addEventListener('transitionend', onTiltEnd, { once: true });
        };

        const begin = () => {
            applyPeekExitMetrics();
            requestAnimationFrame(() => {
                widget.classList.add('is-peek-emerge');
                if (stack) stack.addEventListener('transitionend', onEmergeEnd, { once: true });
                window.setTimeout(() => {
                    if (widget.classList.contains('is-peek-emerge') && !widget.classList.contains('is-peek-tilt')) {
                        widget.classList.add('is-peek-tilt');
                    }
                }, 1000);
                window.setTimeout(() => {
                    if (widget.classList.contains('is-peek-tilt') && !widget.classList.contains('is-peek')) {
                        widget.classList.add('is-peek');
                    }
                }, 1660);
            });
        };

        window.setTimeout(() => {
            if (bodyImg instanceof HTMLImageElement && !bodyImg.complete) {
                bodyImg.addEventListener('load', begin, { once: true });
                return;
            }
            begin();
        }, 80);
    };

    const enableSpriteWithoutReload = () => {
        sessionStorage.removeItem('circlelearnAiSpriteStateV1');
        const runtimeActive = Boolean(window.__circlelearnSpriteRuntimeActive);
        if (runtimeActive) {
            runSpritePeekEnterAnimation();
            return;
        }
        window.__circlelearnSpriteEnableFromSettings = true;
        const runtimeScript = document.querySelector('script[src*="js/components/ai-sprite.js"]');
        if (!(runtimeScript instanceof HTMLScriptElement)) {
            runSpritePeekEnterAnimation();
            window.__circlelearnSpriteRuntimeActive = true;
            return;
        }
        const src = runtimeScript.getAttribute('src');
        if (!src) {
            runSpritePeekEnterAnimation();
            window.__circlelearnSpriteRuntimeActive = true;
            return;
        }
        const script = document.createElement('script');
        script.src = `${src}${src.includes('?') ? '&' : '?'}enableFromSettings=${Date.now()}`;
        script.defer = true;
        document.body.appendChild(script);
    };

    const openModal = () => {
        const enabled = localStorage.getItem(SPRITE_ENABLED_KEY) !== '0';
        setSpriteUIValue(enabled ? '1' : '0');
        spriteToggle.classList.remove('is-open');
        spriteToggleTrigger.setAttribute('aria-expanded', 'false');
        const scale = getGlobalFontScale();
        setFontUIValue(scale, false);
        modal.removeAttribute('hidden');
        if (typeof window.applySiteI18n === 'function') {
            window.applySiteI18n();
            setSpriteUIValue(enabled ? '1' : '0');
        }
    };

    const closeModal = () => {
        modal.setAttribute('hidden', '');
        spriteToggle.classList.remove('is-open');
        spriteToggleTrigger.setAttribute('aria-expanded', 'false');
    };

    openers.forEach((opener) => {
        opener.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.select.is-open').forEach((select) => {
                select.classList.remove('is-open');
                const selected = select.querySelector('.selected');
                if (selected instanceof HTMLElement) selected.setAttribute('aria-expanded', 'false');
            });
            openModal();
        });
    });

    modal.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.hasAttribute('data-settings-close')) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
    });

    spriteToggleTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        const willOpen = !spriteToggle.classList.contains('is-open');
        spriteToggle.classList.toggle('is-open', willOpen);
        spriteToggleTrigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    spriteOptions.forEach((option) => {
        option.addEventListener('click', () => {
            const selected = option.dataset.value === '0' ? '0' : '1';
            setSpriteUIValue(selected);
            spriteToggle.classList.remove('is-open');
            spriteToggleTrigger.setAttribute('aria-expanded', 'false');
            const enabled = selected === '1';
            const wasEnabled = localStorage.getItem(SPRITE_ENABLED_KEY) !== '0';
            localStorage.setItem(SPRITE_ENABLED_KEY, enabled ? '1' : '0');
            if (!enabled) {
                sessionStorage.removeItem('circlelearnAiSpriteStateV1');
                const widget = document.getElementById('aiSpriteWidget');
                if (widget) {
                    widget.setAttribute('hidden', '');
                    widget.style.display = 'none';
                }
                window.__circlelearnSpriteRuntimeActive = false;
            } else if (!wasEnabled) {
                enableSpriteWithoutReload();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (modal.hasAttribute('hidden')) return;
        const target = e.target;
        if (!(target instanceof Node)) return;
        if (spriteToggle.contains(target)) return;
        spriteToggle.classList.remove('is-open');
        spriteToggleTrigger.setAttribute('aria-expanded', 'false');
    });

    const onFontValueCommit = () => {
        const next = clampGlobalFontScale(fontValue.value);
        setFontUIValue(next);
    };

    fontRange.addEventListener('input', () => {
        setFontUIValue(fontRange.value);
    });

    fontValue.addEventListener('input', () => {
        if (fontValue.value.trim() === '') return;
        setFontUIValue(fontValue.value);
    });

    fontValue.addEventListener('change', onFontValueCommit);
    fontValue.addEventListener('blur', onFontValueCommit);

    fontResetBtn.addEventListener('click', () => {
        setFontUIValue(FONT_SCALE_DEFAULT);
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
