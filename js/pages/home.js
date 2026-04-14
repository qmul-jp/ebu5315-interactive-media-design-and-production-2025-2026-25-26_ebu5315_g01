/**
 * 首页：Hero 圆形视觉状态、悬停箭头、悬浮聊天、滚动显现
 */
(function initHeroIntro() {
    const root = document.documentElement;
    if (!root.classList.contains('hero-intro-play')) return;
    const circleAnimation = document.querySelector('.circle-animation');
    const heroContent = document.querySelector('.hero-content');
    const heroFadeEls = document.querySelectorAll(
        '.hero-content .animate-fade-in, .hero-content .animate-fade-in-delay-1, .hero-content .animate-fade-in-delay-2'
    );
    heroFadeEls.forEach((el) => {
        el.classList.remove('animate-fade-in', 'animate-fade-in-delay-1', 'animate-fade-in-delay-2');
    });

    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(fallbackId);
        root.classList.remove('hero-intro-play');
    };

    /** 圆环入场 2.6s；文案入场延迟 1.82s + 2.2s ≈ 4.02s — 须两者都结束再摘 class，否则会打断文案动画产生一帧跳变 */
    let circleDone = !circleAnimation;
    let contentDone = !heroContent;
    const tryFinish = () => {
        if (circleDone && contentDone) finish();
    };

    const fallbackMs = 5200;
    const fallbackId = window.setTimeout(finish, fallbackMs);

    if (circleAnimation) {
        const onCircleEnd = (e) => {
            if (e.target !== circleAnimation || e.animationName !== 'heroCircleIntro') return;
            circleAnimation.removeEventListener('animationend', onCircleEnd);
            circleDone = true;
            tryFinish();
        };
        circleAnimation.addEventListener('animationend', onCircleEnd);
    }

    if (heroContent) {
        const onContentEnd = (e) => {
            if (e.target !== heroContent || e.animationName !== 'heroContentIntro') return;
            heroContent.removeEventListener('animationend', onContentEnd);
            contentDone = true;
            tryFinish();
        };
        heroContent.addEventListener('animationend', onContentEnd);
    }

    tryFinish();
})();

(function () {
    const innerCircle = document.querySelector('.inner-circle');
    const mainCircle = document.querySelector('.main-circle');
    const diagramSvg = document.querySelector('.inner-circle-diagram');
    const rc1 = document.querySelector('.rotating-circle-1');
    const circleAnimation = document.querySelector('.circle-animation');
    const prevBtn = document.querySelector('.hero-visual-arrow--prev');
    const nextBtn = document.querySelector('.hero-visual-arrow--next');

    /** 线稿仅作为重置状态，不参与轮播循环 */
    const DIAGRAM_STATE = 'diagram';
    const cycleStates = [
        'pizza',
        'donut',
        'moon',
        'emoji',
        'sunflower',
        'oreo',
        'cat',
        'can',
        'egg',
        'coin',
        'noodles'
    ];
    let state = DIAGRAM_STATE;
    let autoTimer = null;

    function clearAuto() {
        if (autoTimer) clearTimeout(autoTimer);
        autoTimer = null;
    }

    function applyState() {
        if (!innerCircle) return;
        innerCircle.classList.remove(
            'show-pizza',
            'show-donut',
            'show-moon',
            'show-emoji',
            'show-sunflower',
            'show-oreo',
            'show-cat',
            'show-can',
            'show-egg',
            'show-coin',
            'show-noodles'
        );
        if (state !== DIAGRAM_STATE) {
            innerCircle.classList.add(`show-${state}`);
        }

        if (prevBtn) {
            prevBtn.disabled = false;
            prevBtn.setAttribute('aria-disabled', 'false');
        }
    }

    function autoAdvanceNext() {
        if (state === DIAGRAM_STATE) {
            state = cycleStates[0];
        } else {
            const curIdx = cycleStates.indexOf(state);
            const nextIdx = (curIdx + 1) % cycleStates.length;
            state = cycleStates[nextIdx];
        }
        applyState();
    }

    function scheduleAuto() {
        clearAuto();
        autoTimer = setTimeout(() => {
            autoAdvanceNext();
            scheduleAuto();
        }, 6000);
    }

    function onManualInteraction() {
        scheduleAuto();
    }

    /** 线稿停在「未画」状态（无 CSS 动效），避免 forwards 终态一闪而过 */
    function primeDiagramUndrawnNoAnim() {
        if (!diagramSvg) return;
        const els = diagramSvg.querySelectorAll(
            '.animated-path, .animated-line-1, .animated-line-2, .animated-dot'
        );
        els.forEach((el) => {
            el.style.animation = 'none';
            if (el.classList.contains('animated-path')) {
                el.style.strokeDasharray = '628';
                el.style.strokeDashoffset = '628';
            } else if (
                el.classList.contains('animated-line-1') ||
                el.classList.contains('animated-line-2')
            ) {
                el.style.strokeDasharray = '100';
                el.style.strokeDashoffset = '100';
            } else if (el.classList.contains('animated-dot')) {
                el.style.transform = 'scale(0)';
            }
        });
    }

    /** 交还样式表里的 animation，从当前未画状态开始播放 */
    function releaseDiagramAnimations() {
        if (!diagramSvg) return;
        const els = diagramSvg.querySelectorAll(
            '.animated-path, .animated-line-1, .animated-line-2, .animated-dot'
        );
        els.forEach((el) => {
            el.style.removeProperty('animation');
            el.style.removeProperty('stroke-dasharray');
            el.style.removeProperty('stroke-dashoffset');
            el.style.removeProperty('transform');
        });
    }

    /** 重播线稿绘制（先 prime 再下一帧 release） */
    function restartDiagramAnimation() {
        if (!diagramSvg) return;
        primeDiagramUndrawnNoAnim();
        void diagramSvg.offsetHeight;
        requestAnimationFrame(() => {
            releaseDiagramAnimations();
            void diagramSvg.offsetHeight;
        });
    }

    /** 轮播图上一张：线稿时回到循环最后一张 */
    function goPrev() {
        onManualInteraction();
        if (state === DIAGRAM_STATE) {
            state = cycleStates[cycleStates.length - 1];
        } else {
            const curIdx = cycleStates.indexOf(state);
            const prevIdx = (curIdx - 1 + cycleStates.length) % cycleStates.length;
            state = cycleStates[prevIdx];
        }
        applyState();
    }

    /** 轮播图下一张：线稿时进入循环第一张 */
    function goNext() {
        onManualInteraction();
        autoAdvanceNext();
    }

    /** 点击圆内：main-circle 丝滑隐去，由持久圆环粒子接替（环径略大于 rotating-circle-1） */
    const prefersParticleMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const BLUE_CENTER = { r: 37, g: 99, b: 235 };
    const RING_TRANSITION_MS = prefersParticleMotion ? 820 : 420;
    const RING_RC_MEAN_SCALE = 1.054;
    /** 外缘半宽占 rMean 的比例（决定「最外一圈」位置，与原先 halfBand 一致） */
    const RING_OUTER_HALF_RATIO = 0.04;
    /**
     * 内缘半宽 = 外缘半宽 × 该系数。保持 rMax 不变，仅把 rMin 往内推。
     * 1 = 内外对称；>1 向内更宽；<1 向内更窄。
     */
    const RING_INNER_HALF_MULT = 6;
    /**
     * 相对圆心整体缩放环（内、外半径同比变化，环带相对宽度比例不变）。
     * 1 = 不缩放；0.88 ≈ 缩到 88%。
     */
    const RING_OVERALL_SCALE = 0.9;
    /** 弹开：沿环方向稍晚启动，形成轻柔波纹（0~0.35） */
    const RING_MORPH_STAGGER = 0.22;
    /** 飘动振幅渐强时长（秒），消弭与弹开衔接处的抖动 */
    const RING_FLOAT_AMP_RAMP_SEC = prefersParticleMotion ? 1.15 : 0.72;
    /**
     * 环上飞出装饰图：每项一组「角度 + 环外额外距离（px）」独立调节。
     * 角度：0 = 向右，Math.PI/2 = 向下。距离：落点半径 ≈ ringGeom.rMax + 对应常量（prefers-reduced-motion 时该 px 会 ×0.72）。
     */
    const RING_POPOUT_MOONCAKE_ANGLE_RAD = Math.PI * 1.3;
    const RING_POPOUT_MOONCAKE_OUTER_PAD_PX = 110;
    const RING_POPOUT_CAP_ANGLE_RAD = Math.PI * 0.6;
    const RING_POPOUT_CAP_OUTER_PAD_PX = 80;
    const RING_POPOUT_BUBBLE_ANGLE_RAD = Math.PI * 1.8;
    const RING_POPOUT_BUBBLE_OUTER_PAD_PX = -100;
    const RING_POPOUT_CLOCK_ANGLE_RAD = Math.PI * 0.2;
    const RING_POPOUT_CLOCK_OUTER_PAD_PX = 85;
    const RING_POPOUT_PIE_ANGLE_RAD = Math.PI * 0.9;
    const RING_POPOUT_PIE_OUTER_PAD_PX = 180;
    const RING_POPOUT_BURGER_ANGLE_RAD = Math.PI * 1.6;
    const RING_POPOUT_BURGER_OUTER_PAD_PX = 70;
    /** 各层装饰图 <img> 宽度（px），高度按比例；与弹出 transform scale 相乘为最终大小 */
    const RING_POPOUT_IMG_DEFAULT_WIDTH_PX = 260;
    const RING_POPOUT_MOONCAKE_IMG_WIDTH_PX = RING_POPOUT_IMG_DEFAULT_WIDTH_PX;
    const RING_POPOUT_CAP_IMG_WIDTH_PX = RING_POPOUT_IMG_DEFAULT_WIDTH_PX * 0.7;
    const RING_POPOUT_BUBBLE_IMG_WIDTH_PX = RING_POPOUT_IMG_DEFAULT_WIDTH_PX * 3.5;
    const RING_POPOUT_CLOCK_IMG_WIDTH_PX = RING_POPOUT_IMG_DEFAULT_WIDTH_PX;
    const RING_POPOUT_PIE_IMG_WIDTH_PX = RING_POPOUT_IMG_DEFAULT_WIDTH_PX * 1.5;
    const RING_POPOUT_BURGER_IMG_WIDTH_PX = RING_POPOUT_IMG_DEFAULT_WIDTH_PX * 1.5;
    /** 顺序 = 叠放自下而上（zIndex 递增） */
    const RING_POPOUT_LAYERS = [
        {
            src: 'assets/images/homepage/月饼.png',
            zIndex: 4,
            angleRad: RING_POPOUT_MOONCAKE_ANGLE_RAD,
            outerPadPx: RING_POPOUT_MOONCAKE_OUTER_PAD_PX,
            imgWidthPx: RING_POPOUT_MOONCAKE_IMG_WIDTH_PX
        },
        {
            src: 'assets/images/homepage/瓶盖.png',
            zIndex: 5,
            angleRad: RING_POPOUT_CAP_ANGLE_RAD,
            outerPadPx: RING_POPOUT_CAP_OUTER_PAD_PX,
            imgWidthPx: RING_POPOUT_CAP_IMG_WIDTH_PX
        },
        {
            src: 'assets/images/homepage/气泡2.png',
            zIndex: 6,
            angleRad: RING_POPOUT_BUBBLE_ANGLE_RAD,
            outerPadPx: RING_POPOUT_BUBBLE_OUTER_PAD_PX,
            imgWidthPx: RING_POPOUT_BUBBLE_IMG_WIDTH_PX
        },
        {
            src: 'assets/images/homepage/钟表.png',
            zIndex: 7,
            angleRad: RING_POPOUT_CLOCK_ANGLE_RAD,
            outerPadPx: RING_POPOUT_CLOCK_OUTER_PAD_PX,
            imgWidthPx: RING_POPOUT_CLOCK_IMG_WIDTH_PX
        },
        {
            src: 'assets/images/homepage/派.png',
            zIndex: 8,
            angleRad: RING_POPOUT_PIE_ANGLE_RAD,
            outerPadPx: RING_POPOUT_PIE_OUTER_PAD_PX,
            imgWidthPx: RING_POPOUT_PIE_IMG_WIDTH_PX
        },
        {
            src: 'assets/images/homepage/汉堡.png',
            zIndex: 9,
            angleRad: RING_POPOUT_BURGER_ANGLE_RAD,
            outerPadPx: RING_POPOUT_BURGER_OUTER_PAD_PX,
            imgWidthPx: RING_POPOUT_BURGER_IMG_WIDTH_PX
        }
    ];
    /**
     * 环粒子取色：先按占比抽黄系 / 灰系，再走图片取样与 pickPaletteRgb（蓝系等）。
     * 二者之和宜 < 1；调大则蓝系与图片色相对较少。
     */
    const RING_PARTICLE_YELLOW_SHARE = 0.2;
    const RING_PARTICLE_GRAY_SHARE = 0.19;
    const RING_RETRACT_MS = prefersParticleMotion ? 900 : 520;
    /** idle | expand | hold | retract */
    let ringPhase = 'idle';
    let ringRetractStart = 0;
    let ringCenterHitEl = null;
    let ringMode = false;
    let ringCanvas = null;
    let ringCtx = null;
    let ringParticles = [];
    let ringRaf = null;
    let ringLastT = 0;
    let ringTransitionStart = 0;
    let ringFloatTime = 0;
    const ringGeom = { cx: 0, cy: 0, rMin: 0, rMax: 0 };
    /** Canvas 大于 .circle-animation 时，将粒子坐标平移到 bitmap 内（避免环被 canvas / overflow 裁切） */
    const ringCanvasPad = { x: 0, y: 0 };
    let ringCanvasCssW = 0;
    let ringCanvasCssH = 0;
    let sampleCanvas = null;
    /**
     * @type {{ root: HTMLElement, inner: HTMLElement, angleRad: number, outerPadPx: number, retractTx: number, retractTy: number, retractSc: number }[]}
     */
    let ringPopoutInstances = [];

    function easeInOutCubic(t) {
        const x = Math.min(1, Math.max(0, t));
        return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
    }

    function smoothstep01(t) {
        const x = Math.min(1, Math.max(0, t));
        return x * x * (3 - 2 * x);
    }

    function ringPopoutEffectiveOuterPadPx(basePadPx) {
        return prefersParticleMotion ? basePadPx : basePadPx * 0.72;
    }

    /**
     * @param {number} angleRad
     * @param {number} morphClock 0~1 弹出进度
     * @param {number} tRaw 环展开归一化时间；回退快照时传 NaN，仅按 prefersParticleMotion 决定是否飘动
     * @param {number} ringFloatT hold 阶段累加时间（秒）
     * @param {number} outerPadBasePx 该层在 rMax 外的额外距离（见 RING_POPOUT_*_OUTER_PAD_PX）
     */
    function computePopoutTxTy(angleRad, morphClock, tRaw, ringFloatT, outerPadBasePx) {
        const outward = ringGeom.rMax + ringPopoutEffectiveOuterPadPx(outerPadBasePx);
        let tx = Math.cos(angleRad) * outward * morphClock;
        let ty = Math.sin(angleRad) * outward * morphClock;
        const allowWobble =
            prefersParticleMotion &&
            (Number.isNaN(tRaw) || tRaw >= 1);
        if (allowWobble) {
            const wb = 4.8 * Math.sin(ringFloatT * 0.86);
            tx += Math.cos(angleRad + Math.PI / 2) * wb * 0.4;
            ty += Math.sin(angleRad + Math.PI / 2) * wb * 0.4;
        }
        return { tx, ty };
    }

    function clamp255(x) {
        return Math.max(0, Math.min(255, x));
    }

    function parseCssRgb(str) {
        const m = str && str.match(/\d+/g);
        if (!m || m.length < 3) return [BLUE_CENTER.r, BLUE_CENTER.g, BLUE_CENTER.b];
        return [Number(m[0]), Number(m[1]), Number(m[2])];
    }

    function blendTowardBlue(r, g, b, t) {
        return [
            r + (BLUE_CENTER.r - r) * t,
            g + (BLUE_CENTER.g - g) * t,
            b + (BLUE_CENTER.b - b) * t
        ];
    }

    function pickPaletteRgb() {
        const roll = Math.random();
        if (roll < 0.48 && innerCircle) {
            const [r, g, b] = parseCssRgb(getComputedStyle(innerCircle).color);
            return blendTowardBlue(r, g, b, 0.18 + Math.random() * 0.42);
        }
        if (roll < 0.7) return [59, 130, 246];
        if (roll < 0.84) return [96, 165, 250];
        if (roll < 0.91) return [203, 213, 225];
        return [248, 250, 252];
    }

    /** 琥珀 / 柠黄系点缀（与蓝系冷暖对比） */
    function pickYellowAccentRgb() {
        const opts = [
            [251, 191, 36],
            [252, 211, 77],
            [234, 179, 8],
            [253, 230, 138],
            [250, 204, 21],
            [245, 158, 11],
            [254, 240, 138]
        ];
        const c = opts[Math.floor(Math.random() * opts.length)];
        const j = (Math.random() - 0.5) * 26;
        return [
            clamp255(c[0] + j * 0.85),
            clamp255(c[1] + j * 0.65),
            clamp255(c[2] + j * 0.25)
        ];
    }

    /** 冷灰系（slate），与黄系、蓝底协调 */
    function pickGrayAccentRgb() {
        const opts = [
            [100, 116, 139],
            [148, 163, 184],
            [175, 184, 198],
            [203, 213, 225],
            [226, 232, 240],
            [241, 245, 249]
        ];
        const c = opts[Math.floor(Math.random() * opts.length)];
        const j = (Math.random() - 0.5) * 20;
        return [clamp255(c[0] + j), clamp255(c[1] + j * 0.98), clamp255(c[2] + j * 1.02)];
    }

    function sampleImageColors(img, need) {
        const w = 72;
        const h = 72;
        if (!sampleCanvas) {
            sampleCanvas = document.createElement('canvas');
        }
        sampleCanvas.width = w;
        sampleCanvas.height = h;
        const sctx = sampleCanvas.getContext('2d');
        try {
            sctx.drawImage(img, 0, 0, w, h);
        } catch {
            return null;
        }
        const data = sctx.getImageData(0, 0, w, h).data;
        const cx = w / 2;
        const cy = h / 2;
        const rad = Math.min(w, h) / 2;
        const out = [];
        let attempts = 0;
        while (out.length < need && attempts < need * 10) {
            attempts += 1;
            const ux = Math.random() * w;
            const uy = Math.random() * h;
            if (Math.hypot(ux - cx, uy - cy) > rad * 0.99) continue;
            const xi = Math.floor(ux);
            const yi = Math.floor(uy);
            const idx = (yi * w + xi) * 4;
            if (data[idx + 3] < 32) continue;
            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];
            const mix = 0.1 + Math.random() * 0.36;
            out.push(blendTowardBlue(r, g, b, mix));
        }
        return out.length ? out : null;
    }

    function getVisibleCarouselImage() {
        if (state === DIAGRAM_STATE) return null;
        return innerCircle ? innerCircle.querySelector(`.inner-circle-${state}`) : null;
    }

    function updateRingGeometry() {
        if (!circleAnimation || !mainCircle || !rc1) return;
        const animR = circleAnimation.getBoundingClientRect();
        const mainR = mainCircle.getBoundingClientRect();
        const rcR = rc1.getBoundingClientRect();
        ringGeom.cx = mainR.left - animR.left + mainR.width * 0.5;
        ringGeom.cy = mainR.top - animR.top + mainR.height * 0.5;
        const rcRadiusCss = rcR.width * 0.5;
        const rMean = rcRadiusCss * RING_RC_MEAN_SCALE;
        const outerHalf = Math.max(12, rMean * RING_OUTER_HALF_RATIO);
        const innerHalf = outerHalf * RING_INNER_HALF_MULT;
        ringGeom.rMin = (rMean - innerHalf) * RING_OVERALL_SCALE;
        ringGeom.rMax = (rMean + outerHalf) * RING_OVERALL_SCALE;
    }

    function effectiveRingOuterRadius() {
        if (ringGeom.rMax > 0) return ringGeom.rMax;
        if (rc1) {
            const rcR = rc1.getBoundingClientRect();
            const rMean = rcR.width * 0.5 * RING_RC_MEAN_SCALE;
            const outerHalf = Math.max(12, rMean * RING_OUTER_HALF_RATIO);
            return (rMean + outerHalf) * RING_OVERALL_SCALE;
        }
        return 220;
    }

    function resizeRingCanvas() {
        if (!ringCanvas || !ringCtx || !circleAnimation) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const animW = circleAnimation.clientWidth;
        const animH = circleAnimation.clientHeight;
        const floatExtra = prefersParticleMotion ? 36 : 20;
        const need = Math.ceil((effectiveRingOuterRadius() + floatExtra + 8) * 2);
        const cw = Math.max(animW, need);
        const ch = Math.max(animH, need);
        ringCanvasPad.x = (cw - animW) * 0.5;
        ringCanvasPad.y = (ch - animH) * 0.5;
        ringCanvasCssW = cw;
        ringCanvasCssH = ch;
        ringCanvas.style.left = `${(animW - cw) * 0.5}px`;
        ringCanvas.style.top = `${(animH - ch) * 0.5}px`;
        ringCanvas.style.width = `${cw}px`;
        ringCanvas.style.height = `${ch}px`;
        ringCanvas.width = Math.floor(cw * dpr);
        ringCanvas.height = Math.floor(ch * dpr);
        ringCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function ensureRingCanvas() {
        if (ringCanvas || !circleAnimation) return;
        ringCanvas = document.createElement('canvas');
        ringCanvas.className = 'hero-particle-ring-canvas';
        ringCanvas.setAttribute('aria-hidden', 'true');
        circleAnimation.appendChild(ringCanvas);
        ringCtx = ringCanvas.getContext('2d', { alpha: true });
    }

    function ensureRingPopoutLayers() {
        if (ringPopoutInstances.length || !circleAnimation) return;
        for (let li = 0; li < RING_POPOUT_LAYERS.length; li += 1) {
            const layer = RING_POPOUT_LAYERS[li];
            const root = document.createElement('div');
            root.className = 'hero-ring-popout';
            root.setAttribute('aria-hidden', 'true');
            root.style.zIndex = String(layer.zIndex);
            const inner = document.createElement('div');
            inner.className = 'hero-ring-popout__inner';
            const img = document.createElement('img');
            img.src = layer.src;
            img.alt = '';
            img.draggable = false;
            img.style.width = `${layer.imgWidthPx != null ? layer.imgWidthPx : RING_POPOUT_IMG_DEFAULT_WIDTH_PX}px`;
            inner.appendChild(img);
            root.appendChild(inner);
            root.style.visibility = 'hidden';
            root.style.opacity = '0';
            circleAnimation.appendChild(root);
            ringPopoutInstances.push({
                root,
                inner,
                angleRad: layer.angleRad,
                outerPadPx: layer.outerPadPx,
                retractTx: 0,
                retractTy: 0,
                retractSc: 1
            });
        }
    }

    function layoutRingPopoutPivots() {
        for (let i = 0; i < ringPopoutInstances.length; i += 1) {
            const { root } = ringPopoutInstances[i];
            root.style.left = `${ringGeom.cx}px`;
            root.style.top = `${ringGeom.cy}px`;
        }
    }

    function computeExpandParticleXY(p, i, nPart, tRaw, T) {
        const floatAmpMul = smoothstep01(T / RING_FLOAT_AMP_RAMP_SEC);
        const ampA0 = prefersParticleMotion ? 0.32 : 0.12;
        const ampR0 = prefersParticleMotion ? 4.1 : 1.85;
        const denom = Math.max(1e-6, 1 - RING_MORPH_STAGGER);
        const staggerFrac = nPart > 1 ? (i / (nPart - 1)) * RING_MORPH_STAGGER : 0;
        const morphT = tRaw <= staggerFrac ? 0 : Math.min(1, (tRaw - staggerFrac) / denom);
        const eMorph = easeInOutCubic(morphT);
        const xRing = p.sx + (p.tx - p.sx) * eMorph;
        const yRing = p.sy + (p.ty - p.sy) * eMorph;
        const dA =
            floatAmpMul *
            (ampA0 * Math.sin(T * 0.62 + p.ph1) +
                ampA0 * 0.52 * Math.sin(T * 1.18 + p.ph2));
        const dRad =
            floatAmpMul *
            (ampR0 * Math.sin(T * 0.74 + p.ph3) + ampR0 * 0.48 * Math.sin(T * 1.52 + p.ph4));
        let radial = ringGeom.rMin + p.radT * (ringGeom.rMax - ringGeom.rMin) + dRad;
        radial = Math.max(ringGeom.rMin - 3, Math.min(ringGeom.rMax + 3, radial));
        const ang = p.baseAng + dA;
        const xFloat = ringGeom.cx + Math.cos(ang) * radial;
        const yFloat = ringGeom.cy + Math.sin(ang) * radial;
        const blendPost = smoothstep01(Math.min(1, Math.max(0, (tRaw - 0.86) / 0.14)));
        const x = xRing * (1 - blendPost) + xFloat * blendPost;
        const y = yRing * (1 - blendPost) + yFloat * blendPost;
        return { x, y };
    }

    function snapshotParticlesForRetract() {
        const tRaw = 1;
        const T = ringFloatTime;
        const nPart = ringParticles.length;
        for (let i = 0; i < nPart; i += 1) {
            const p = ringParticles[i];
            const { x, y } = computeExpandParticleXY(p, i, nPart, tRaw, T);
            p.retractFromX = x;
            p.retractFromY = y;
        }
    }

    function snapshotPopoutsForRetract() {
        const morphClock = 1;
        const scFrom = 0.07;
        const scTo = prefersParticleMotion ? 0.54 : 0.46;
        const sc = scFrom + (scTo - scFrom) * morphClock;
        for (let i = 0; i < ringPopoutInstances.length; i += 1) {
            const inst = ringPopoutInstances[i];
            const { tx, ty } = computePopoutTxTy(inst.angleRad, morphClock, NaN, ringFloatTime, inst.outerPadPx);
            inst.retractTx = tx;
            inst.retractTy = ty;
            inst.retractSc = sc;
        }
    }

    function ensureRingCenterHit() {
        if (ringCenterHitEl || !circleAnimation) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hero-ring-center-hit';
        btn.setAttribute('aria-label', '返回线稿视图');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            beginRingRetract();
        });
        btn.style.display = 'none';
        circleAnimation.appendChild(btn);
        ringCenterHitEl = btn;
    }

    function layoutRingCenterHit() {
        if (!ringCenterHitEl) return;
        ringCenterHitEl.style.left = `${ringGeom.cx}px`;
        ringCenterHitEl.style.top = `${ringGeom.cy}px`;
        ringCenterHitEl.style.display = 'block';
    }

    function beginRingRetract() {
        if (!ringMode || ringPhase !== 'hold' || !circleAnimation) return;
        snapshotParticlesForRetract();
        snapshotPopoutsForRetract();
        ringPhase = 'retract';
        ringRetractStart = performance.now();
        state = DIAGRAM_STATE;
        applyState();
        updateRingGeometry();
        layoutRingPopoutPivots();
        circleAnimation.classList.add('is-particle-ring-retract');
        circleAnimation.classList.remove('is-particle-ring-hold');
        if (ringCenterHitEl) ringCenterHitEl.style.display = 'none';
        for (let i = 0; i < ringPopoutInstances.length; i += 1) {
            ringPopoutInstances[i].inner.classList.remove('is-settled');
        }

        if (diagramSvg) {
            primeDiagramUndrawnNoAnim();
            void diagramSvg.offsetHeight;
            requestAnimationFrame(() => {
                releaseDiagramAnimations();
                void diagramSvg.offsetHeight;
            });
        }
    }

    function finishRingRetract() {
        ringMode = false;
        ringPhase = 'idle';
        ringParticles.length = 0;
        circleAnimation.classList.remove(
            'is-particle-ring-active',
            'is-particle-ring-retract',
            'is-particle-ring-hold'
        );
        document.querySelector('.hero')?.classList.remove('hero--particle-ring');
        for (let i = 0; i < ringPopoutInstances.length; i += 1) {
            const inst = ringPopoutInstances[i];
            inst.root.style.visibility = 'hidden';
            inst.root.style.opacity = '0';
            inst.inner.classList.remove('is-settled');
            inst.inner.style.transform = '';
        }
        if (ringCenterHitEl) ringCenterHitEl.style.display = 'none';
        scheduleAuto();
    }

    /** 单粒子取色：黄 / 灰占比 → 图片来源 → 调色盘（蓝系等） */
    function pickParticleColor(sampled) {
        const rPick = Math.random();
        if (rPick < RING_PARTICLE_YELLOW_SHARE) {
            return pickYellowAccentRgb();
        }
        if (rPick < RING_PARTICLE_YELLOW_SHARE + RING_PARTICLE_GRAY_SHARE) {
            return pickGrayAccentRgb();
        }
        if (sampled && sampled.length && Math.random() < 0.68) {
            const c = sampled[Math.floor(Math.random() * sampled.length)];
            const j = (Math.random() - 0.5) * 22;
            return [clamp255(c[0] + j), clamp255(c[1] + j), clamp255(c[2] + j)];
        }
        const p = pickPaletteRgb();
        return [clamp255(p[0]), clamp255(p[1]), clamp255(p[2])];
    }

    function enterParticleRingMode() {
        if (document.documentElement.classList.contains('hero-intro-play')) return;
        if (ringMode || !innerCircle || !mainCircle || !rc1 || !circleAnimation || !diagramSvg) return;
        ensureRingCanvas();
        if (!ringCtx) return;
        ensureRingPopoutLayers();

        clearAuto();
        ringMode = true;
        ringPhase = 'expand';
        updateRingGeometry();
        resizeRingCanvas();
        layoutRingPopoutPivots();

        for (let i = 0; i < ringPopoutInstances.length; i += 1) {
            ringPopoutInstances[i].root.style.visibility = 'visible';
        }

        const mainRect = mainCircle.getBoundingClientRect();
        const cx = ringGeom.cx;
        const cy = ringGeom.cy;
        const diskR = mainRect.width * 0.48;

        const img = getVisibleCarouselImage();
        const count = prefersParticleMotion ? 340 : 110;
        let sampled = null;
        if (img && img.complete && img.naturalWidth) {
            sampled = sampleImageColors(img, Math.min(220, count));
        }

        ringParticles = [];
        for (let i = 0; i < count; i += 1) {
            const baseAng = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
            const radT = Math.random();
            const baseRe = ringGeom.rMin + radT * (ringGeom.rMax - ringGeom.rMin);
            const tx = ringGeom.cx + Math.cos(baseAng) * baseRe;
            const ty = ringGeom.cy + Math.sin(baseAng) * baseRe;

            const a0 = Math.random() * Math.PI * 2;
            const r0 = diskR * Math.sqrt(Math.random()) * 0.97;
            const sx = cx + Math.cos(a0) * r0;
            const sy = cy + Math.sin(a0) * r0;

            const [cr, cg, cb] = pickParticleColor(sampled);

            ringParticles.push({
                sx,
                sy,
                baseAng,
                radT,
                tx,
                ty,
                cr,
                cg,
                cb,
                size: prefersParticleMotion ? 1.45 + Math.random() * 1.85 : 1.2 + Math.random() * 1.2,
                ph1: Math.random() * Math.PI * 2,
                ph2: Math.random() * Math.PI * 2,
                ph3: Math.random() * Math.PI * 2,
                ph4: Math.random() * Math.PI * 2
            });
        }

        ringTransitionStart = performance.now();
        ringFloatTime = 0;
        circleAnimation.classList.add('is-particle-ring-active');
        document.querySelector('.hero')?.classList.add('hero--particle-ring');

        if (ringRaf == null) {
            ringLastT = 0;
            ringRaf = requestAnimationFrame(ringLoop);
        }
    }

    function ringLoop(now) {
        if (!ringMode || !ringCtx || !ringCanvas || !circleAnimation) {
            ringRaf = null;
            return;
        }
        if (!ringLastT) ringLastT = now;
        const dt = Math.min(0.032, (now - ringLastT) / 1000);
        ringLastT = now;

        const cw = ringCanvasCssW || circleAnimation.clientWidth;
        const ch = ringCanvasCssH || circleAnimation.clientHeight;
        ringCtx.clearRect(0, 0, cw, ch);
        const prevComp = ringCtx.globalCompositeOperation;
        ringCtx.globalCompositeOperation = 'lighter';

        if (ringPhase === 'retract') {
            const tRet = Math.min(1, (now - ringRetractStart) / RING_RETRACT_MS);
            const nPart = ringParticles.length;
            const denomR = Math.max(1e-6, 1 - RING_MORPH_STAGGER);
            const canvasFade = 1 - smoothstep01(Math.max(0, (tRet - 0.72) / 0.28));
            ringCtx.globalAlpha = canvasFade;

            for (let i = 0; i < nPart; i += 1) {
                const p = ringParticles[i];
                const staggerFrac = nPart > 1 ? (i / (nPart - 1)) * RING_MORPH_STAGGER : 0;
                const uSrc =
                    tRet <= staggerFrac ? 0 : Math.min(1, (tRet - staggerFrac) / denomR);
                const u = easeInOutCubic(uSrc);
                const x = p.retractFromX + (p.sx - p.retractFromX) * u;
                const y = p.retractFromY + (p.sy - p.retractFromY) * u;
                const fadePart = 1 - smoothstep01(Math.max(0, (u - 0.34) / 0.66));
                const baseA = prefersParticleMotion ? 0.68 : 0.6;
                ringCtx.fillStyle = `rgba(${clamp255(p.cr)},${clamp255(p.cg)},${clamp255(p.cb)},${baseA * fadePart * canvasFade})`;
                ringCtx.beginPath();
                ringCtx.arc(x + ringCanvasPad.x, y + ringCanvasPad.y, p.size, 0, Math.PI * 2);
                ringCtx.fill();
            }

            ringCtx.globalAlpha = 1;
            ringCtx.globalCompositeOperation = prevComp || 'source-over';

            const k = 1 - easeInOutCubic(tRet);
            const scFrom = 0.07;
            const op = 1 - smoothstep01(Math.max(0, (tRet - 0.74) / 0.26));
            for (let pi = 0; pi < ringPopoutInstances.length; pi += 1) {
                const inst = ringPopoutInstances[pi];
                const tx = inst.retractTx * k;
                const ty = inst.retractTy * k;
                const sc = scFrom + (inst.retractSc - scFrom) * k;
                inst.inner.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${sc})`;
                inst.root.style.opacity = String(op);
            }

            if (tRet >= 1) {
                finishRingRetract();
                ringRaf = null;
                return;
            }
            ringRaf = requestAnimationFrame(ringLoop);
            return;
        }

        const tRaw = Math.min(1, (now - ringTransitionStart) / RING_TRANSITION_MS);

        if (tRaw >= 1) {
            ringFloatTime += dt;
        }

        if (ringPhase === 'expand' && tRaw >= 1) {
            ringPhase = 'hold';
            ensureRingCenterHit();
            layoutRingCenterHit();
            circleAnimation.classList.add('is-particle-ring-hold');
        }

        const T = ringFloatTime;
        const nPart = ringParticles.length;

        for (let i = 0; i < nPart; i += 1) {
            const p = ringParticles[i];
            const { x, y } = computeExpandParticleXY(p, i, nPart, tRaw, T);

            ringCtx.fillStyle = `rgba(${clamp255(p.cr)},${clamp255(p.cg)},${clamp255(p.cb)},${prefersParticleMotion ? 0.68 : 0.6})`;
            ringCtx.beginPath();
            ringCtx.arc(x + ringCanvasPad.x, y + ringCanvasPad.y, p.size, 0, Math.PI * 2);
            ringCtx.fill();
        }

        ringCtx.globalCompositeOperation = prevComp || 'source-over';

        const morphClock = easeInOutCubic(tRaw);
        const scFrom = 0.07;
        const scTo = prefersParticleMotion ? 0.54 : 0.46;
        const sc = scFrom + (scTo - scFrom) * morphClock;
        const op = tRaw < 1 ? smoothstep01(tRaw / 0.14) : 1;
        for (let pi = 0; pi < ringPopoutInstances.length; pi += 1) {
            const inst = ringPopoutInstances[pi];
            const { tx, ty } = computePopoutTxTy(inst.angleRad, morphClock, tRaw, ringFloatTime, inst.outerPadPx);
            inst.inner.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${sc})`;
            inst.root.style.opacity = String(op);
            inst.inner.classList.toggle('is-settled', tRaw >= 1);
        }

        ringRaf = requestAnimationFrame(ringLoop);
    }

    window.addEventListener(
        'resize',
        () => {
            if (!ringMode || !ringCanvas) return;
            updateRingGeometry();
            resizeRingCanvas();
            layoutRingPopoutPivots();
            if (ringPhase === 'hold') layoutRingCenterHit();
            ringParticles.forEach((p) => {
                const baseRe = ringGeom.rMin + p.radT * (ringGeom.rMax - ringGeom.rMin);
                p.tx = ringGeom.cx + Math.cos(p.baseAng) * baseRe;
                p.ty = ringGeom.cy + Math.sin(p.baseAng) * baseRe;
            });
        },
        { passive: true }
    );

    if (innerCircle) {
        applyState();
        scheduleAuto();

        if (diagramSvg) {
            diagramSvg.addEventListener('click', (e) => {
                if (document.documentElement.classList.contains('hero-intro-play')) return;
                if (ringMode) {
                    if (ringPhase === 'hold') {
                        e.stopPropagation();
                        beginRingRetract();
                    }
                    return;
                }
                e.stopPropagation();
                enterParticleRingMode();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                goPrev();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                goNext();
            });
        }
    }

    if (rc1 && circleAnimation) {
        const showArrows = () => circleAnimation.classList.add('is-rc1-hover');
        const hideArrows = () => circleAnimation.classList.remove('is-rc1-hover');

        rc1.addEventListener('mouseenter', showArrows);
        rc1.addEventListener('mouseleave', (e) => {
            const t = e.relatedTarget;
            if (t && t.closest && t.closest('.hero-visual-arrow')) return;
            hideArrows();
        });

        document.querySelectorAll('.hero-visual-arrow').forEach((btn) => {
            btn.addEventListener('mouseenter', showArrows);
            btn.addEventListener('mouseleave', (e) => {
                const t = e.relatedTarget;
                if (t && (rc1.contains(t) || (t.closest && t.closest('.hero-visual-arrow')))) return;
                hideArrows();
            });
        });
    }

    const floatingChatBtn = document.getElementById('floatingChatBtn');
    if (floatingChatBtn) {
        floatingChatBtn.addEventListener('click', () => {
            alert('Chat feature coming soon! This would open a chat window with our AI assistant.');
        });
    }

    const quickQuestionBtns = document.querySelectorAll('.quick-question-btn');
    const chatInput = document.querySelector('.chat-input');
    const btnSend = document.querySelector('.btn-send');

    quickQuestionBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (chatInput) {
                chatInput.value = btn.textContent;
                chatInput.focus();
            }
        });
    });

    if (btnSend && chatInput) {
        btnSend.addEventListener('click', () => {
            const message = chatInput.value.trim();
            if (message) {
                alert(
                    `You asked: "${message}"\n\nOur AI assistant would respond here with detailed information about circle theorems!`
                );
                chatInput.value = '';
            }
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                btnSend.click();
            }
        });
    }

    function initTheoremCardFlip() {
        const cards = document.querySelectorAll('.theorem-card--flip');
        if (!cards.length) return;
        cards.forEach((card) => {
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-pressed', 'false');
            card.setAttribute('aria-label', 'Flip theorem card');

            const toggle = () => {
                const next = !card.classList.contains('is-flipped');
                card.classList.toggle('is-flipped', next);
                card.setAttribute('aria-pressed', next ? 'true' : 'false');
            };

            card.addEventListener('click', () => {
                toggle();
            });
            card.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                toggle();
            });
        });
    }

    initTheoremCardFlip();

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.theorem-card, .feature-card, .usp-item').forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
})();
