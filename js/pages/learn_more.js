/**
 * Learn More：Basic / 进阶 / 更进阶 下拉导航、滚动高亮（定理卡片为静态 HTML）
 */
(function () {
    function bindDropdowns() {
        const dropdowns = document.querySelectorAll('.learn-toc-dropdown');
        if (!dropdowns.length) return;

        const closeAll = () => {
            dropdowns.forEach((dd) => {
                const trig = dd.querySelector('.learn-toc-trigger');
                const menu = dd.querySelector('.learn-toc-menu');
                if (menu) menu.hidden = true;
                if (trig) trig.setAttribute('aria-expanded', 'false');
                dd.classList.remove('is-open');
            });
        };

        dropdowns.forEach((dd) => {
            const trigger = dd.querySelector('.learn-toc-trigger');
            const menu = dd.querySelector('.learn-toc-menu');
            if (!trigger || !menu) return;

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const willOpen = menu.hidden;
                menu.hidden = !willOpen;
                trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                dd.classList.toggle('is-open', willOpen);
            });
        });

        document.addEventListener('click', (e) => {
            if ([...dropdowns].some((dd) => dd.contains(e.target))) return;
            closeAll();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAll();
        });
    }

    function initScrollSpy() {
        const sections = document.querySelectorAll('.learn-theorem[id]');
        const tocLinks = document.querySelectorAll('.learn-toc-link[href^="#"]');
        if (!sections.length || !tocLinks.length) return;

        let tocClickLockUntil = 0;

        const setActive = (id) => {
            tocLinks.forEach((link) => {
                const href = link.getAttribute('href');
                link.classList.toggle('is-active', href === `#${id}`);
            });
        };

        tocLinks.forEach((link) => {
            link.addEventListener('click', () => {
                const href = link.getAttribute('href');
                if (!href || href.length < 2) return;
                let id;
                try {
                    id = decodeURIComponent(href.slice(1));
                } catch (e) {
                    id = href.slice(1);
                }
                tocClickLockUntil = Date.now() + 1400;
                setActive(id);
            });
        });

        const ioNav = new IntersectionObserver(
            (entries) => {
                if (Date.now() < tocClickLockUntil) return;
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
                if (visible[0]) {
                    setActive(visible[0].target.id);
                }
            },
            { rootMargin: '-40% 0px -45% 0px', threshold: [0, 0.1, 0.25, 0.5] }
        );

        sections.forEach((sec) => ioNav.observe(sec));

        if (window.location.hash) {
            let id;
            try {
                id = decodeURIComponent(window.location.hash.slice(1));
            } catch (e) {
                id = window.location.hash.slice(1);
            }
            const el = document.getElementById(id);
            if (el) {
                requestAnimationFrame(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setActive(id);
                });
            }
        }
    }

    bindDropdowns();
    initScrollSpy();
})();
