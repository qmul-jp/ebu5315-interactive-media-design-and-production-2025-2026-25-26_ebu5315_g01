(function initSharedAiSprite() {
    const widget = document.getElementById('aiSpriteWidget');
    if (!widget) return;
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
        const classes = Array.from(widget.classList).filter((name) => MANAGED_CLASSES.includes(name));
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
        const classes = Array.isArray(snapshot.classes) ? snapshot.classes : [];

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

        requestAnimationFrame(() => {
            alignHandToBody();
        });
        return true;
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
    const restored = !isReloadNav && restoreFromSession();
    if (!restored) {
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

    const peekClickableTarget = peekStack || spriteStage;
    if (peekClickableTarget) {
        peekClickableTarget.addEventListener('click', () => {
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
            if (!widget.classList.contains('is-peek') || widget.classList.contains('is-peek-popout')) return;
            const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReduced) {
                finalizePeekPopoutOnce();
                return;
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
        });
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
