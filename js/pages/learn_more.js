/**
 * Learn More 页：Basic 下拉导航、滚动高亮
 */
(function () {
    const sections = document.querySelectorAll('.learn-theorem[id]');
    const tocLinks = document.querySelectorAll('.learn-toc-link[href^="#"]');
    const trigger = document.getElementById('learnTocTrigger');
    const menu = document.getElementById('learnTocMenu');
    const dropdown = document.querySelector('.learn-toc-dropdown');

    const setActive = (id) => {
        tocLinks.forEach((link) => {
            const href = link.getAttribute('href');
            link.classList.toggle('is-active', href === `#${id}`);
        });
    };

    const closeMenu = () => {
        if (!menu || !trigger || !dropdown) return;
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('is-open');
    };

    const openMenu = () => {
        if (!menu || !trigger || !dropdown) return;
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        dropdown.classList.add('is-open');
    };

    const toggleMenu = () => {
        if (!menu || menu.hidden) openMenu();
        else closeMenu();
    };

    if (trigger && menu && dropdown) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        document.addEventListener('click', (e) => {
            if (dropdown.contains(e.target)) return;
            closeMenu();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });

    }

    if (!sections.length || !tocLinks.length) return;

    const ioNav = new IntersectionObserver(
        (entries) => {
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
        const id = window.location.hash.slice(1);
        const el = document.getElementById(id);
        if (el) {
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActive(id);
            });
        }
    }
})();
