/**
 * 首页：Hero 圆形视觉状态、悬停箭头、悬浮聊天、滚动显现
 */
(function () {
    const innerCircle = document.querySelector('.inner-circle');
    const diagramSvg = document.querySelector('.inner-circle-diagram');
    const rc1 = document.querySelector('.rotating-circle-1');
    const circleAnimation = document.querySelector('.circle-animation');
    const prevBtn = document.querySelector('.hero-visual-arrow--prev');
    const nextBtn = document.querySelector('.hero-visual-arrow--next');
    const diagramAnimElements = diagramSvg
        ? diagramSvg.querySelectorAll('.animated-path, .animated-line-1, .animated-line-2, .animated-dot')
        : [];

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

    function restartDiagramAnimation() {
        if (!diagramSvg || !diagramAnimElements.length) return;
        diagramAnimElements.forEach((el) => {
            el.style.animation = 'none';
        });
        void diagramSvg.getBoundingClientRect();
        diagramAnimElements.forEach((el) => {
            el.style.removeProperty('animation');
        });
    }

    function resetToDiagram() {
        onManualInteraction();
        state = DIAGRAM_STATE;
        applyState();
        requestAnimationFrame(() => {
            restartDiagramAnimation();
        });
    }

    if (innerCircle) {
        applyState();
        scheduleAuto();

        if (diagramSvg) {
            diagramSvg.addEventListener('click', (e) => {
                if (state === DIAGRAM_STATE) return;
                e.stopPropagation();
                resetToDiagram();
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
