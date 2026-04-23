(function initSharedAiSprite() {
    const widget = document.getElementById('aiSpriteWidget');
    if (!widget) return;
    const SPRITE_ENABLED_KEY = 'circlelearnSpriteEnabledV1';
    const spriteEnabled = localStorage.getItem(SPRITE_ENABLED_KEY) !== '0';
    if (!spriteEnabled) {
        window.__circlelearnSpriteRuntimeActive = false;
        widget.setAttribute('hidden', '');
        widget.style.display = 'none';
        return;
    }
    window.__circlelearnSpriteRuntimeActive = true;
    const forcePeekFromSettings = window.__circlelearnSpriteEnableFromSettings === true;
    window.__circlelearnSpriteEnableFromSettings = false;
    const navEntry = performance.getEntriesByType('navigation')[0];
    const isReloadNav =
        (navEntry && navEntry.type === 'reload') ||
        (!!performance.navigation && performance.navigation.type === 1);

    const SPRITE_STATE_KEY = 'circlelearnAiSpriteStateV1';
    const MANAGED_CLASSES = [
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
    const TRANSIENT_CLASSES = [
        'is-waving',
        'is-exiting',
        'is-peek-popout',
        'is-returning-peek-exit',
        'is-returning-peek-tilt'
    ];

    const ENTRANCE_MS = 1100;
    const WAVE_MS = 5000;

    let entranceTimer = null;
    let waveEndTimer = null;
    let exitSlideListener = null;
    let fallbackPeekTimer = null;
    let peekPopoutFallbackTimer = null;
    let peekPopoutFinalized = false;
    let peekSequenceTimer = null;
    let peekEmergeFallbackTimer = null;
    let peekTiltFallbackTimer = null;
    let returnPeekSlideFallbackTimer = null;
    let returnPeekTiltFallbackTimer = null;
    let returnPeekSlideListener = null;
    let returnPeekTiltListener = null;
    let learnPromptAutoDismissTimer = null;

    const PEEK_FALLBACK_MS = 1850;
    const PEEK_AFTER_OFFSCREEN_MS = 1000;
    const PEEK_EMERGE_FALLBACK_MS = 1000;
    const PEEK_TILT_FALLBACK_MS = 700;
    const PEEK_POPOUT_MS = 1150;
    const RETURN_PEEK_SLIDE_FALLBACK_MS = 980;
    const RETURN_PEEK_TILT_FALLBACK_MS = 640;
    function toCrossPageAssetUrl(inputPath) {
        if (!inputPath) return '';
        const raw = String(inputPath).trim().replace(/\\/g, '/');
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
        const assetIdx = raw.indexOf('assets/');
        if (assetIdx >= 0) {
            return `${window.location.origin}/${raw.slice(assetIdx)}`;
        }
        try {
            return new URL(raw, window.location.href).href;
        } catch (e) {
            return raw;
        }
    }

    const BODY_SMILE_TUCK_SRC = toCrossPageAssetUrl(
        widget.dataset.bodySmileTuckSrc || 'assets/images/global/笑容揣手.png'
    );
    const SPRITE_EXIT_AFTER_BUBBLE_NAV_KEY = 'circlelearnSpriteExitAfterBubbleNavV1';
    const path = window.location.pathname.replace(/\\/g, '/');
    const isLearnMorePage = /\/learn_more(?:\/learn_more\.html)?$/i.test(path) || /\/learn_more\.html$/i.test(path);
    const shouldExitAfterBubbleNav = (() => {
        try {
            const hit = window.sessionStorage.getItem(SPRITE_EXIT_AFTER_BUBBLE_NAV_KEY) === '1';
            if (hit) window.sessionStorage.removeItem(SPRITE_EXIT_AFTER_BUBBLE_NAV_KEY);
            return hit;
        } catch (e) {
            return false;
        }
    })();
    let bubblePromptMode = 'welcome';
    let pendingBubblePromptMode = null;

    function resolveGamePageUrl() {
        const navGame = document.querySelector('a.nav-link[href*="game/game.html"]');
        if (navGame) {
            const href = navGame.getAttribute('href');
            if (href) return href;
        }
        if (path === '/' || /\/index\.html$/i.test(path)) return 'game/game.html';
        if (/\/game(?:\/game\.html)?$/i.test(path)) return 'game.html';
        return '../game/game.html';
    }

    function forceSmileTuckAppearance() {
        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        const armLayer = widget.querySelector('.ai-sprite-widget__arm-layer');
        if (bodyImg) {
            const current = bodyImg.getAttribute('src') || '';
            if (!current.includes('笑容揣手')) {
                bodyImg.src = BODY_SMILE_TUCK_SRC;
            }
            bodyImg.alt = '';
        }
        if (armLayer) armLayer.setAttribute('hidden', '');
        widget.classList.remove('is-waving');
    }

    function resolveRouteUrl(target) {
        const routeMatchers = {
            home: /index\.html#home/i,
            game: /game(?:\/game\.html|\.html)/i,
            quiz: /quiz\/quiz-levels\.html|quiz-levels\.html/i,
            learn: /learn_more\/learn_more\.html|learn_more\.html/i,
            premium: /premium\/premium\.html|premium\.html/i
        };
        const matcher = routeMatchers[target];
        if (matcher) {
            const fromAnyLink = Array.from(document.querySelectorAll('a[href]')).find((a) => {
                const href = a.getAttribute('href');
                return href && matcher.test(href);
            });
            if (fromAnyLink) {
                const href = fromAnyLink.getAttribute('href');
                if (href) return href;
            }
        }
        if (target === 'home') {
            if (path === '/' || /\/index\.html$/i.test(path)) return 'index.html#home';
            return '../index.html#home';
        }
        if (target === 'game') return resolveGamePageUrl();
        if (target === 'quiz') {
            if (path === '/' || /\/index\.html$/i.test(path)) return 'quiz/quiz-levels.html';
            if (/\/quiz\//i.test(path)) return 'quiz-levels.html';
            return '../quiz/quiz-levels.html';
        }
        if (target === 'learn') {
            if (path === '/' || /\/index\.html$/i.test(path)) return 'learn_more/learn_more.html';
            if (/\/learn_more\//i.test(path)) return 'learn_more.html';
            return '../learn_more/learn_more.html';
        }
        if (target === 'premium') {
            if (path === '/' || /\/index\.html$/i.test(path)) return 'premium/premium.html';
            if (/\/premium\//i.test(path)) return 'premium.html';
            return '../premium/premium.html';
        }
        return resolveGamePageUrl();
    }

    const bubble = widget.querySelector('.ai-sprite-widget__bubble');
    let bubbleCta = bubble ? bubble.querySelector('.ai-sprite-widget__cta') : null;
    if (bubble && !bubbleCta) {
        const cta = document.createElement('button');
        cta.type = 'button';
        cta.className = 'ai-sprite-widget__cta';
        cta.setAttribute('data-i18n', 'sprite.cta.playGame');
        cta.textContent = 'Play Game';
        cta.hidden = true;
        cta.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            try {
                window.sessionStorage.setItem(SPRITE_EXIT_AFTER_BUBBLE_NAV_KEY, '1');
            } catch (e) {}
            window.location.href = resolveGamePageUrl();
        });
        bubble.appendChild(cta);
        bubbleCta = cta;
    } else if (bubbleCta) {
        bubbleCta.hidden = true;
    }

    function setBubbleCtaVisible(visible) {
        if (!bubbleCta) return;
        bubbleCta.hidden = !visible;
    }

    let bubbleNav = bubble ? bubble.querySelector('.ai-sprite-widget__nav-grid') : null;
    if (bubble && !bubbleNav) {
        bubbleNav = document.createElement('div');
        bubbleNav.className = 'ai-sprite-widget__nav-grid';
        bubbleNav.hidden = true;
        const targets = ['home', 'game', 'quiz', 'learn', 'premium'];
        targets.forEach((target) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ai-sprite-widget__nav-btn';
            btn.setAttribute('data-target', target);
            btn.setAttribute('data-i18n', `sprite.nav.${target}`);
            btn.textContent = target;
            btn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                try {
                    window.sessionStorage.setItem(SPRITE_EXIT_AFTER_BUBBLE_NAV_KEY, '1');
                } catch (e) {}
                window.location.href = resolveRouteUrl(target);
            });
            bubbleNav.appendChild(btn);
        });
        bubble.appendChild(bubbleNav);
    }

    function setBubbleNavVisible(visible) {
        if (!bubbleNav) return;
        bubbleNav.hidden = !visible;
    }

    let bubbleAiBtn = bubble ? bubble.querySelector('.ai-sprite-widget__ai-btn') : null;
    if (bubble && !bubbleAiBtn) {
        const aiBtn = document.createElement('button');
        aiBtn.type = 'button';
        aiBtn.className = 'ai-sprite-widget__ai-btn';
        aiBtn.setAttribute('data-i18n', 'sprite.cta.ai');
        aiBtn.textContent = 'AI';
        aiBtn.hidden = true;
        aiBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (typeof window.openAiChatWidget === 'function') {
                window.openAiChatWidget();
            }
        });
        bubble.appendChild(aiBtn);
        bubbleAiBtn = aiBtn;
    } else if (bubbleAiBtn) {
        bubbleAiBtn.hidden = true;
    }

    function setBubbleAiBtnVisible(visible) {
        if (!bubbleAiBtn) return;
        bubbleAiBtn.hidden = !visible;
    }

    function applyBubblePromptMode() {
        const welcome = widget.querySelector('.ai-sprite-widget__welcome');
        if (!welcome) return;
        widget.classList.remove('is-bubble-learnbreak', 'is-bubble-quicknav');
        if (bubblePromptMode === 'learnBreak') {
            welcome.setAttribute('data-i18n', 'learn.sprite.breakPrompt');
            widget.classList.add('is-bubble-learnbreak');
            setBubbleCtaVisible(true);
            setBubbleNavVisible(false);
            setBubbleAiBtnVisible(false);
        } else if (bubblePromptMode === 'quickNav') {
            welcome.setAttribute('data-i18n', 'sprite.quickNav.prompt');
            widget.classList.add('is-bubble-quicknav');
            setBubbleCtaVisible(false);
            setBubbleNavVisible(true);
            setBubbleAiBtnVisible(true);
        } else {
            welcome.setAttribute('data-i18n', 'home.sprite.welcome');
            setBubbleCtaVisible(false);
            setBubbleNavVisible(false);
            setBubbleAiBtnVisible(false);
        }
        if (typeof window.applySiteI18n === 'function') {
            window.applySiteI18n();
        }
    }

    function readPersistedState() {
        try {
            const raw = window.sessionStorage.getItem(SPRITE_STATE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function clearPersistedState() {
        try {
            window.sessionStorage.removeItem(SPRITE_STATE_KEY);
        } catch (e) {}
    }

    function persistState() {
        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        const armLayer = widget.querySelector('.ai-sprite-widget__arm-layer');
        const rawClasses = Array.from(widget.classList).filter((name) => MANAGED_CLASSES.includes(name));
        const classes = normalizeSnapshotClasses(rawClasses);
        const isPreInitHidden = widget.hasAttribute('hidden') && !classes.includes('is-visible');
        if (isPreInitHidden) return;
        const snapshot = {
            classes,
            hidden: widget.hasAttribute('hidden'),
            vars: {
                exitX: widget.style.getPropertyValue('--ai-exit-x'),
                exitFull: widget.style.getPropertyValue('--ai-exit-full'),
                spriteH: widget.style.getPropertyValue('--ai-sprite-h')
            },
            bodySrc: bodyImg ? toCrossPageAssetUrl(bodyImg.currentSrc || bodyImg.getAttribute('src') || '') : '',
            armHidden: !!(armLayer && armLayer.hasAttribute('hidden'))
        };
        try {
            window.sessionStorage.setItem(SPRITE_STATE_KEY, JSON.stringify(snapshot));
        } catch (e) {}
    }

    function applyPersistedState(snapshot) {
        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        const armLayer = widget.querySelector('.ai-sprite-widget__arm-layer');
        const classes = normalizeSnapshotClasses(Array.isArray(snapshot.classes) ? snapshot.classes : []);

        if (!classes.length) return false;
        if (snapshot.hidden && !classes.includes('is-visible')) return false;

        clearSequence();
        widget.classList.remove(...MANAGED_CLASSES);
        classes.forEach((name) => {
            if (MANAGED_CLASSES.includes(name)) widget.classList.add(name);
        });

        const vars = snapshot.vars || {};
        if (vars.exitX) widget.style.setProperty('--ai-exit-x', vars.exitX);
        else widget.style.removeProperty('--ai-exit-x');
        if (vars.exitFull) widget.style.setProperty('--ai-exit-full', vars.exitFull);
        else widget.style.removeProperty('--ai-exit-full');
        if (vars.spriteH) widget.style.setProperty('--ai-sprite-h', vars.spriteH);
        else widget.style.removeProperty('--ai-sprite-h');

        if (bodyImg && snapshot.bodySrc) bodyImg.src = toCrossPageAssetUrl(snapshot.bodySrc);
        if (armLayer) {
            if (snapshot.armHidden) armLayer.setAttribute('hidden', '');
            else armLayer.removeAttribute('hidden');
        }

        if (snapshot.hidden) widget.setAttribute('hidden', '');
        else widget.removeAttribute('hidden');

        if (isLearnMorePage) {
            forceSmileTuckAppearance();
        }

        requestAnimationFrame(() => {
            alignHandToBody();
        });
        return true;
    }

    function normalizeSnapshotClasses(inputClasses) {
        const classSet = new Set(
            (Array.isArray(inputClasses) ? inputClasses : []).filter((name) => MANAGED_CLASSES.includes(name))
        );
        const hasTransient = TRANSIENT_CLASSES.some((name) => classSet.has(name));
        const midPeek =
            classSet.has('is-tuck-offscreen') &&
            classSet.has('is-peek-emerge') &&
            !classSet.has('is-peek');

        if (hasTransient || midPeek) {
            return [
                'is-visible',
                'is-tuck-offscreen',
                'is-peek-emerge',
                'is-peek-tilt',
                'is-peek',
                'is-welcome-done'
            ];
        }
        return Array.from(classSet);
    }

    function restoreFromSession() {
        const snapshot = readPersistedState();
        if (!snapshot) return false;
        return applyPersistedState(snapshot);
    }

    function onPeekEmergeEnd(ev) {
        if (ev.propertyName !== 'transform') return;
        if (peekEmergeFallbackTimer !== null) {
            window.clearTimeout(peekEmergeFallbackTimer);
            peekEmergeFallbackTimer = null;
        }
        if (!widget.classList.contains('is-peek-emerge') || widget.classList.contains('is-peek-tilt')) return;
        widget.classList.add('is-peek-tilt');
        const stack = widget.querySelector('.ai-sprite-stack');
        if (stack) stack.addEventListener('transitionend', onPeekTiltEnd, { once: true });
        peekTiltFallbackTimer = window.setTimeout(() => {
            peekTiltFallbackTimer = null;
            if (!widget.classList.contains('is-peek')) widget.classList.add('is-peek');
        }, PEEK_TILT_FALLBACK_MS + 120);
    }

    function onPeekTiltEnd(ev) {
        if (ev.propertyName !== 'transform') return;
        if (peekTiltFallbackTimer !== null) {
            window.clearTimeout(peekTiltFallbackTimer);
            peekTiltFallbackTimer = null;
        }
        if (!widget.classList.contains('is-peek-tilt')) return;
        if (widget.classList.contains('is-peek')) return;
        widget.classList.add('is-peek');
    }

    function schedulePeekFromOffscreen(delayMs = PEEK_AFTER_OFFSCREEN_MS) {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            applyPeekExitMetrics();
            widget.classList.add('is-peek-emerge', 'is-peek-tilt', 'is-peek');
            return;
        }
        peekSequenceTimer = window.setTimeout(() => {
            peekSequenceTimer = null;
            applyPeekExitMetrics();
            requestAnimationFrame(() => {
                widget.classList.add('is-peek-emerge');
                const stack = widget.querySelector('.ai-sprite-stack');
                peekEmergeFallbackTimer = window.setTimeout(() => {
                    peekEmergeFallbackTimer = null;
                    if (widget.classList.contains('is-peek-emerge') && !widget.classList.contains('is-peek-tilt')) {
                        onPeekEmergeEnd({ propertyName: 'transform' });
                    }
                }, PEEK_EMERGE_FALLBACK_MS);
                if (stack) stack.addEventListener('transitionend', onPeekEmergeEnd, { once: true });
            });
        }, delayMs);
    }

    function clearSequence() {
        if (entranceTimer !== null) {
            window.clearTimeout(entranceTimer);
            entranceTimer = null;
        }
        if (waveEndTimer !== null) {
            window.clearTimeout(waveEndTimer);
            waveEndTimer = null;
        }
        if (fallbackPeekTimer !== null) {
            window.clearTimeout(fallbackPeekTimer);
            fallbackPeekTimer = null;
        }
        if (peekSequenceTimer !== null) {
            window.clearTimeout(peekSequenceTimer);
            peekSequenceTimer = null;
        }
        if (peekEmergeFallbackTimer !== null) {
            window.clearTimeout(peekEmergeFallbackTimer);
            peekEmergeFallbackTimer = null;
        }
        if (peekTiltFallbackTimer !== null) {
            window.clearTimeout(peekTiltFallbackTimer);
            peekTiltFallbackTimer = null;
        }
        if (exitSlideListener) {
            const stack = widget.querySelector('.ai-sprite-stack');
            if (stack) stack.removeEventListener('transitionend', exitSlideListener);
            exitSlideListener = null;
        }
        if (peekPopoutFallbackTimer !== null) {
            window.clearTimeout(peekPopoutFallbackTimer);
            peekPopoutFallbackTimer = null;
        }
        if (returnPeekSlideFallbackTimer !== null) {
            window.clearTimeout(returnPeekSlideFallbackTimer);
            returnPeekSlideFallbackTimer = null;
        }
        if (returnPeekTiltFallbackTimer !== null) {
            window.clearTimeout(returnPeekTiltFallbackTimer);
            returnPeekTiltFallbackTimer = null;
        }
        if (learnPromptAutoDismissTimer !== null) {
            window.clearTimeout(learnPromptAutoDismissTimer);
            learnPromptAutoDismissTimer = null;
        }
        const stackPeek = widget.querySelector('.ai-sprite-stack');
        if (stackPeek) {
            stackPeek.removeEventListener('transitionend', onPeekPopoutEnd);
            stackPeek.removeEventListener('transitionend', onPeekEmergeEnd);
            stackPeek.removeEventListener('transitionend', onPeekTiltEnd);
            if (returnPeekSlideListener) {
                stackPeek.removeEventListener('transitionend', returnPeekSlideListener);
                returnPeekSlideListener = null;
            }
            if (returnPeekTiltListener) {
                stackPeek.removeEventListener('transitionend', returnPeekTiltListener);
                returnPeekTiltListener = null;
            }
        }
    }

    function alignHandToBody() {
        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        const armImg = widget.querySelector('.ai-sprite-widget__arm');
        const layer = widget.querySelector('.ai-sprite-widget__arm-layer');
        if (!bodyImg || !bodyImg.naturalWidth || !bodyImg.naturalHeight) return;
        const br = bodyImg.getBoundingClientRect();
        const bh = br.height;
        const bw = br.width;
        if (!bh || !bw) return;
        widget.style.setProperty('--ai-sprite-h', `${Math.round(bh)}px`);
        if (layer && layer.hasAttribute('hidden')) return;
        if (widget.classList.contains('is-smile-rest') || armImg == null || layer == null) return;
        if (!armImg.naturalWidth || !armImg.naturalHeight) return;
        const handTargetH = bh * 0.36;
        armImg.style.width = 'auto';
        armImg.style.height = `${handTargetH}px`;
        armImg.style.maxHeight = 'none';
        layer.style.left = `${Math.round(bw * 0.01)}px`;
        layer.style.bottom = `${Math.round(bh * 0.3)}px`;
        layer.style.top = 'auto';
        layer.style.right = 'auto';
    }

    function finalizePeekPopout() {
        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        const armLayer = widget.querySelector('.ai-sprite-widget__arm-layer');
        if (!bodyImg) return;
        const path = bodyImg.getAttribute('src') || '';
        if (!path.includes('笑容揣手')) {
            bodyImg.src = BODY_SMILE_TUCK_SRC;
        }
        bodyImg.alt = '';
        if (armLayer) armLayer.setAttribute('hidden', '');
        widget.classList.remove(
            'is-peek',
            'is-peek-popout',
            'is-tuck-offscreen',
            'is-peek-emerge',
            'is-peek-tilt'
        );
        widget.classList.add('is-smile-rest');
        if (pendingBubblePromptMode) {
            bubblePromptMode = pendingBubblePromptMode;
            pendingBubblePromptMode = null;
        }
        applyBubblePromptMode();
        widget.style.removeProperty('--ai-exit-x');
        widget.style.removeProperty('--ai-exit-full');
        if (bodyImg.complete && bodyImg.naturalWidth) {
            alignHandToBody();
        } else {
            bodyImg.addEventListener(
                'load',
                () => {
                    alignHandToBody();
                },
                { once: true }
            );
        }
    }

    function applyFullExitMetrics() {
        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        if (!bodyImg || !bodyImg.naturalWidth) return;
        const br = bodyImg.getBoundingClientRect();
        const bw = br.width;
        if (!bw) return;
        const pad = 12;
        const tx = Math.round(bw + pad + 36);
        widget.style.setProperty('--ai-exit-full', `${tx}px`);
    }

    function applyPeekExitMetrics() {
        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        if (!bodyImg || !bodyImg.naturalWidth) return;
        const br = bodyImg.getBoundingClientRect();
        const bw = br.width;
        if (!bw) return;
        const pad = 12;
        const visibleW = Math.max(52, Math.round(bw * 0.40));
        const tx = Math.round(bw + pad - visibleW);
        widget.style.setProperty('--ai-exit-x', `${tx}px`);
    }

    const show = () => {
        widget.removeAttribute('hidden');
        widget.classList.remove('is-welcome-done');
        bubblePromptMode = 'welcome';
        applyBubblePromptMode();
        setBubbleCtaVisible(false);
        if (isLearnMorePage) {
            forceSmileTuckAppearance();
        }
        requestAnimationFrame(() => {
            widget.classList.add('is-visible');
        });
        if (typeof window.applySiteI18n === 'function') {
            window.applySiteI18n();
        }

        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        const armImg = widget.querySelector('.ai-sprite-widget__arm');
        const onImgReady = () => alignHandToBody();
        if (bodyImg) {
            if (bodyImg.complete) onImgReady();
            else bodyImg.addEventListener('load', onImgReady, { once: true });
        }
        if (armImg) {
            if (armImg.complete) onImgReady();
            else armImg.addEventListener('load', onImgReady, { once: true });
        }
        window.addEventListener(
            'resize',
            () => {
                alignHandToBody();
                if (widget.classList.contains('is-exiting')) {
                    applyFullExitMetrics();
                }
                if (
                    widget.classList.contains('is-tuck-offscreen') ||
                    widget.classList.contains('is-peek-emerge') ||
                    widget.classList.contains('is-peek')
                ) {
                    applyPeekExitMetrics();
                    applyFullExitMetrics();
                }
            },
            { passive: true }
        );

        const onFullExitComplete = () => {
            if (fallbackPeekTimer !== null) {
                window.clearTimeout(fallbackPeekTimer);
                fallbackPeekTimer = null;
            }
            if (exitSlideListener) {
                const stack = widget.querySelector('.ai-sprite-stack');
                if (stack) stack.removeEventListener('transitionend', exitSlideListener);
                exitSlideListener = null;
            }
            if (!widget.classList.contains('is-exiting')) return;
            const bodyImg = widget.querySelector('.ai-sprite-widget__body');
            const armLayer = widget.querySelector('.ai-sprite-widget__arm-layer');
            if (!bodyImg) return;
            if (armLayer) armLayer.setAttribute('hidden', '');
            bodyImg.src = BODY_SMILE_TUCK_SRC;
            widget.classList.remove('is-exiting');
            widget.classList.add('is-tuck-offscreen');
            const afterTuckLoad = () => {
                applyFullExitMetrics();
                applyPeekExitMetrics();
                alignHandToBody();
                schedulePeekFromOffscreen();
            };
            if (bodyImg.complete && bodyImg.naturalWidth) afterTuckLoad();
            else bodyImg.addEventListener('load', afterTuckLoad, { once: true });
        };

        if (isLearnMorePage) {
            applyFullExitMetrics();
            applyPeekExitMetrics();
            widget.classList.add('is-tuck-offscreen');
            schedulePeekFromOffscreen(260);
            return;
        }

        const onExitSlideEnd = (ev) => {
            if (ev.propertyName !== 'transform') return;
            if (!widget.classList.contains('is-exiting')) return;
            onFullExitComplete();
        };

        entranceTimer = window.setTimeout(() => {
            widget.classList.add('is-waving');
            waveEndTimer = window.setTimeout(() => {
                widget.classList.remove('is-waving');
                widget.classList.add('is-welcome-done');
                applyFullExitMetrics();
                const stack = widget.querySelector('.ai-sprite-stack');
                if (stack) {
                    exitSlideListener = onExitSlideEnd;
                    stack.addEventListener('transitionend', exitSlideListener);
                }
                fallbackPeekTimer = window.setTimeout(onFullExitComplete, PEEK_FALLBACK_MS);
                requestAnimationFrame(() => {
                    widget.classList.add('is-exiting');
                });
                waveEndTimer = null;
            }, WAVE_MS);
            entranceTimer = null;
        }, ENTRANCE_MS);
    };

    if (isReloadNav) {
        clearPersistedState();
    }
    const restored = !isReloadNav && !forcePeekFromSettings && restoreFromSession();
    if (forcePeekFromSettings) {
        widget.style.removeProperty('display');
        widget.removeAttribute('hidden');
        widget.classList.remove(...MANAGED_CLASSES);
        // 设置启用时只播放探头动画，不显示欢迎文案气泡。
        widget.classList.add('is-visible', 'is-tuck-offscreen', 'is-welcome-done');
        schedulePeekFromOffscreen(80);
    } else if (!restored) {
        const root = document.documentElement;
        if (root.classList.contains('hero-intro-play')) {
            window.addEventListener('circlelearn:heroIntroComplete', show, { once: true });
        } else {
            window.setTimeout(show, 500);
        }
    } else if (typeof window.applySiteI18n === 'function') {
        window.applySiteI18n();
    }

    const spriteStage = widget.querySelector('.ai-sprite-widget__sprite-stage');
    const peekStack = widget.querySelector('.ai-sprite-stack');

    function finalizePeekPopoutOnce() {
        if (peekPopoutFinalized) return;
        peekPopoutFinalized = true;
        if (peekPopoutFallbackTimer !== null) {
            window.clearTimeout(peekPopoutFallbackTimer);
            peekPopoutFallbackTimer = null;
        }
        finalizePeekPopout();
    }

    function onPeekPopoutEnd(ev) {
        if (ev.propertyName !== 'transform') return;
        if (!widget.classList.contains('is-peek-popout')) return;
        finalizePeekPopoutOnce();
    }

    function finalizeReturnToPeekTilt() {
        if (returnPeekTiltFallbackTimer !== null) {
            window.clearTimeout(returnPeekTiltFallbackTimer);
            returnPeekTiltFallbackTimer = null;
        }
        const stack = widget.querySelector('.ai-sprite-stack');
        if (stack && returnPeekTiltListener) {
            stack.removeEventListener('transitionend', returnPeekTiltListener);
            returnPeekTiltListener = null;
        }
        if (!widget.classList.contains('is-returning-peek-exit')) return;
        if (!widget.classList.contains('is-returning-peek-tilt')) return;
        widget.classList.remove('is-smile-rest', 'is-returning-peek-exit', 'is-returning-peek-tilt');
        widget.classList.add('is-tuck-offscreen', 'is-peek-emerge', 'is-peek-tilt', 'is-peek');
    }

    function beginReturnPeekTiltPhase() {
        if (returnPeekSlideFallbackTimer !== null) {
            window.clearTimeout(returnPeekSlideFallbackTimer);
            returnPeekSlideFallbackTimer = null;
        }
        const stack = widget.querySelector('.ai-sprite-stack');
        if (stack && returnPeekSlideListener) {
            stack.removeEventListener('transitionend', returnPeekSlideListener);
            returnPeekSlideListener = null;
        }
        if (!widget.classList.contains('is-returning-peek-exit')) return;
        if (widget.classList.contains('is-returning-peek-tilt')) return;
        if (stack) {
            returnPeekTiltListener = (ev) => {
                if (ev.propertyName !== 'transform') return;
                finalizeReturnToPeekTilt();
            };
            stack.addEventListener('transitionend', returnPeekTiltListener, { once: true });
        }
        requestAnimationFrame(() => {
            widget.classList.add('is-returning-peek-tilt');
            returnPeekTiltFallbackTimer = window.setTimeout(
                finalizeReturnToPeekTilt,
                RETURN_PEEK_TILT_FALLBACK_MS
            );
        });
    }

    function startReturnToPeekFromSmileRest() {
        const bodyImg = widget.querySelector('.ai-sprite-widget__body');
        const armLayer = widget.querySelector('.ai-sprite-widget__arm-layer');
        if (bodyImg) {
            const path = bodyImg.getAttribute('src') || '';
            if (!path.includes('笑容揣手')) bodyImg.src = BODY_SMILE_TUCK_SRC;
            bodyImg.alt = '';
        }
        if (armLayer) armLayer.setAttribute('hidden', '');

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            applyPeekExitMetrics();
            widget.classList.remove('is-smile-rest');
            widget.classList.add('is-tuck-offscreen', 'is-peek-emerge', 'is-peek-tilt', 'is-peek');
            return;
        }

        applyPeekExitMetrics();
        const stack = widget.querySelector('.ai-sprite-stack');
        if (stack) {
            returnPeekSlideListener = (ev) => {
                if (ev.propertyName !== 'transform') return;
                beginReturnPeekTiltPhase();
            };
            stack.addEventListener('transitionend', returnPeekSlideListener, { once: true });
        }
        requestAnimationFrame(() => {
            widget.classList.add('is-returning-peek-exit');
            returnPeekSlideFallbackTimer = window.setTimeout(
                beginReturnPeekTiltPhase,
                RETURN_PEEK_SLIDE_FALLBACK_MS
            );
        });
    }

    function startPeekPopout(promptMode = null) {
        if (!widget.classList.contains('is-peek') || widget.classList.contains('is-peek-popout')) return false;
        if (promptMode) pendingBubblePromptMode = promptMode;
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            finalizePeekPopoutOnce();
            return true;
        }
        peekPopoutFinalized = false;
        const stack = widget.querySelector('.ai-sprite-stack');
        if (stack) {
            stack.addEventListener('transitionend', onPeekPopoutEnd, { once: true });
        }
        requestAnimationFrame(() => {
            widget.classList.add('is-peek-popout');
            peekPopoutFallbackTimer = window.setTimeout(
                finalizePeekPopoutOnce,
                PEEK_POPOUT_MS + 180
            );
        });
        return true;
    }

    function triggerRetreatAnimation() {
        widget.classList.add('is-welcome-done');
        bubblePromptMode = 'welcome';
        pendingBubblePromptMode = null;
        setBubbleNavVisible(false);
        setBubbleCtaVisible(false);
        if (widget.classList.contains('is-peek-popout')) {
            finalizePeekPopoutOnce();
            requestAnimationFrame(() => {
                if (widget.classList.contains('is-smile-rest')) {
                    startReturnToPeekFromSmileRest();
                }
            });
            return true;
        }
        if (widget.classList.contains('is-smile-rest')) {
            startReturnToPeekFromSmileRest();
            return true;
        }
        if (startPeekPopout()) {
            window.setTimeout(() => {
                triggerRetreatAnimation();
            }, PEEK_POPOUT_MS + 80);
            return true;
        }
        return false;
    }

    function scheduleLearnPromptAutoDismiss() {
        if (learnPromptAutoDismissTimer !== null) {
            window.clearTimeout(learnPromptAutoDismissTimer);
        }
        learnPromptAutoDismissTimer = window.setTimeout(() => {
            learnPromptAutoDismissTimer = null;
            // 文案先渐隐，再复用原有“弹出 -> 侧边探头”退场链路。
            triggerRetreatAnimation();
        }, 10000);
    }

    function showLearnBreakPrompt() {
        bubblePromptMode = 'learnBreak';
        pendingBubblePromptMode = 'learnBreak';
        applyBubblePromptMode();
        widget.style.removeProperty('display');
        widget.removeAttribute('hidden');
        widget.classList.remove('is-welcome-done');

        if (widget.classList.contains('is-smile-rest') || widget.classList.contains('is-peek-popout')) {
            scheduleLearnPromptAutoDismiss();
            return;
        }
        if (startPeekPopout('learnBreak')) {
            scheduleLearnPromptAutoDismiss();
            return;
        }

        // 若当前仍在侧边探头过渡链路中，稍后再次尝试复用弹出动画。
        let retries = 10;
        const retry = () => {
            if (startPeekPopout('learnBreak')) {
                scheduleLearnPromptAutoDismiss();
                return;
            }
            retries -= 1;
            if (retries <= 0) return;
            window.setTimeout(retry, 220);
        };
        retry();
    }

    const peekClickableTarget = peekStack || spriteStage;
    if (peekClickableTarget) {
        peekClickableTarget.addEventListener('click', () => {
            if (learnPromptAutoDismissTimer !== null) {
                window.clearTimeout(learnPromptAutoDismissTimer);
                learnPromptAutoDismissTimer = null;
            }
            bubblePromptMode = 'welcome';
            pendingBubblePromptMode = null;
            setBubbleCtaVisible(false);
            setBubbleNavVisible(false);
            if (
                widget.classList.contains('is-returning-peek-exit') ||
                widget.classList.contains('is-returning-peek-tilt')
            ) {
                return;
            }
            if (widget.classList.contains('is-peek-popout')) {
                finalizePeekPopoutOnce();
                requestAnimationFrame(() => {
                    if (widget.classList.contains('is-smile-rest')) {
                        startReturnToPeekFromSmileRest();
                    }
                });
                return;
            }
            if (widget.classList.contains('is-smile-rest')) {
                startReturnToPeekFromSmileRest();
                return;
            }
            // 从偷看点击弹出时，确保气泡可见，再切换到快捷导航文案模式。
            widget.classList.remove('is-welcome-done');
            bubblePromptMode = 'quickNav';
            startPeekPopout('quickNav');
        });
    }

    document.addEventListener('circlelearn:spriteLearnBreakPrompt', showLearnBreakPrompt);

    if (shouldExitAfterBubbleNav) {
        window.setTimeout(() => {
            triggerRetreatAnimation();
        }, 260);
    }

    const persistObserver = new MutationObserver(() => {
        persistState();
    });
    persistObserver.observe(widget, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class', 'style', 'hidden', 'src']
    });

    persistState();
    const flushPersist = () => persistState();
    window.addEventListener('pagehide', flushPersist);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushPersist();
    });
    window.addEventListener(
        'beforeunload',
        () => {
            flushPersist();
            clearSequence();
        },
        { once: true }
    );
})();
