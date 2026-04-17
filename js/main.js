/**
 * 全局初始化（各页共用）
 */
document.addEventListener('DOMContentLoaded', () => {
    initSettingsMenu();
    initClickSelectMenu();
    initTheme();
    initLangToggle();
    initSmoothAnchorScroll();
    initNavScrollSpy();
    injectRippleStyles();
    initButtonRipples();

    console.log('%c CircleLearn 🎓', 'color: #2563EB; font-size: 24px; font-weight: bold;');
    console.log('%c Master Circle Theorems Visually', 'color: #64748B; font-size: 14px;');
    console.log('%c Built with HTML, CSS, and JavaScript', 'color: #22C55E; font-size: 12px;');
});
