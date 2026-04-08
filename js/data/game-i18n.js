/**
 * game-i18n.js - 游戏板块双语数据
 * 放置在 js/data/ 目录下，作为游戏模块的共享数据
 */
window.GameI18N = (() => {
    let currentLang = 'zh';

    const translations = {
        // ===== 游戏选择页 =====
        'game.select.title': { zh: '选择游戏', en: 'Choose a Game' },
        'game.select.subtitle': { zh: '通过互动游戏探索圆的几何奥秘', en: 'Explore the mysteries of circle geometry through interactive games' },
        'game.slingshot.name': { zh: '引力弹弓', en: 'Gravity Slingshot' },
        'game.slingshot.desc': { zh: '利用行星引力弯曲弹道，将能量球射入虫洞！掌握半径、切线与弧长的奥秘。', en: 'Bend trajectories using planetary gravity and shoot energy balls into wormholes! Master radius, tangent, and arc length.' },
        'game.slingshot.tag': { zh: '物理解谜', en: 'Physics Puzzle' },
        'game.sniper.name': { zh: '圆周狙击', en: 'Pi Sniper' },
        'game.sniper.desc': { zh: '在单位圆上精准瞄准目标角度！挑战你的角度直觉，解锁弧度与扇形面积模式。', en: 'Aim precisely at target angles on the unit circle! Challenge your angle intuition and unlock radian & sector area modes.' },
        'game.sniper.tag': { zh: '精准射击', en: 'Precision Shooting' },
        'game.play': { zh: '开始游戏', en: 'Play Now' },

        // ===== 引力弹弓 =====
        'slingshot.title': { zh: '引力弹弓', en: 'Gravity Slingshot' },
        'slingshot.level': { zh: '关卡', en: 'Level' },
        'slingshot.shots': { zh: '发射', en: 'Shots' },
        'slingshot.best': { zh: '最佳', en: 'Best' },
        'slingshot.launch': { zh: '拖拽发射', en: 'Drag to Launch' },
        'slingshot.reset': { zh: '重置', en: 'Reset' },
        'slingshot.next': { zh: '下一关', en: 'Next Level' },
        'slingshot.retry': { zh: '重试', en: 'Retry' },
        'slingshot.win': { zh: '命中目标！', en: 'Target Hit!' },
        'slingshot.fail': { zh: '未命中！', en: 'Missed!' },
        'slingshot.selectLevel': { zh: '选择关卡', en: 'Select Level' },
        'slingshot.backToMenu': { zh: '返回菜单', en: 'Back to Menu' },
        'slingshot.knowledge.radius': { zh: '半径(r)：行星大小决定引力强度', en: 'Radius (r): Planet size determines gravity strength' },
        'slingshot.knowledge.area': { zh: '面积(A=πr²)：引力场覆盖范围', en: 'Area (A=πr²): Gravity field coverage' },
        'slingshot.knowledge.tangent': { zh: '切线：能量球脱离引力场的方向', en: 'Tangent: Direction of ball escaping gravity' },
        'slingshot.knowledge.arc': { zh: '弧长(L=rθ)：能量球绕行星的弧形轨迹', en: 'Arc Length (L=rθ): Curved trajectory around planet' },
        'slingshot.knowledge.pi': { zh: '圆周率(π)：轨道周长 C=2πr', en: 'Pi (π): Orbit circumference C=2πr' },
        'slingshot.complete.title': { zh: '恭喜通关！', en: 'Congratulations!' },
        'slingshot.complete.desc': { zh: '你已掌握所有引力弹弓挑战！现在你理解了半径、面积与引力的奥秘。', en: "You've mastered all gravity slingshot challenges! You now understand how radius, area, and gravity work together." },
        'slingshot.complete.totalShots': { zh: '总发射次数', en: 'Total Shots' },
        'slingshot.complete.totalStars': { zh: '获得星星', en: 'Stars Earned' },
        'slingshot.complete.backToMenu': { zh: '返回菜单', en: 'Back to Menu' },

        // ===== 圆周狙击 =====
        'sniper.title': { zh: '圆周狙击', en: 'Pi Sniper' },
        'sniper.score': { zh: '得分', en: 'Score' },
        'sniper.combo': { zh: '连击', en: 'Combo' },
        'sniper.best': { zh: '最佳', en: 'Best' },
        'sniper.time': { zh: '时间', en: 'Time' },
        'sniper.perfect': { zh: '完美！', en: 'Perfect!' },
        'sniper.excellent': { zh: '优秀！', en: 'Excellent!' },
        'sniper.good': { zh: '良好', en: 'Good' },
        'sniper.hit': { zh: '命中', en: 'Hit' },
        'sniper.miss': { zh: '脱靶！', en: 'Miss!' },
        'sniper.frenzy': { zh: 'PI FRENZY!', en: 'PI FRENZY!' },
        'sniper.mode.angle': { zh: '角度模式', en: 'Angle Mode' },
        'sniper.mode.radian': { zh: '弧度模式', en: 'Radian Mode' },
        'sniper.mode.arc': { zh: '弧长模式', en: 'Arc Length Mode' },
        'sniper.mode.locked': { zh: '下一等级解锁', en: 'Unlock at next level' },
        'sniper.start': { zh: '开始', en: 'Start' },
        'sniper.restart': { zh: '重新开始', en: 'Restart' },
        'sniper.backToMenu': { zh: '返回菜单', en: 'Back to Menu' },
        'sniper.gameOver': { zh: '游戏结束', en: 'Game Over' },
        'sniper.finalScore': { zh: '最终得分', en: 'Final Score' },
        'sniper.newRecord': { zh: '新纪录！', en: 'New Record!' },
        'sniper.knowledge.unitCircle': { zh: '单位圆：半径为1的圆，是三角函数的基础', en: 'Unit Circle: A circle with radius 1, the foundation of trigonometry' },
        'sniper.knowledge.centralAngle': { zh: '圆心角：以圆心为顶点的角', en: 'Central Angle: An angle with vertex at the center' },
        'sniper.knowledge.radian': { zh: '弧度：弧长等于半径时的圆心角，π rad = 180°', en: 'Radian: Angle when arc length equals radius, π rad = 180°' },
        'sniper.knowledge.arcLength': { zh: '弧长 L = rθ（θ为弧度）', en: 'Arc Length L = rθ (θ in radians)' },
        'sniper.knowledge.sectorArea': { zh: '扇形面积 A = ½r²θ', en: 'Sector Area A = ½r²θ' },
    };

    function t(key) {
        const entry = translations[key];
        if (!entry) return key;
        return entry[currentLang] || entry['en'] || key;
    }

    function getLang() { return currentLang; }

    function setLang(lang) {
        if (lang === 'zh' || lang === 'en') {
            currentLang = lang;
            document.dispatchEvent(new CustomEvent('gameLanguageChanged', { detail: { lang } }));
        }
    }

    /** 初始化：从 localStorage 或全局 lang 设置读取 */
    function init() {
        // 优先使用全站语言设置（由 utils.js 的 initLangToggle 管理）
        const siteLang = localStorage.getItem('lang');
        const legacyLang = localStorage.getItem('pref_lang');
        const mergedLang = siteLang || legacyLang;
        if (mergedLang && (mergedLang === 'zh' || mergedLang === 'en')) {
            currentLang = mergedLang;
        } else {
            const browserLang = navigator.language || 'en';
            currentLang = browserLang.startsWith('zh') ? 'zh' : 'en';
        }
    }

    /** 自动翻译页面中所有带 data-game-i18n 属性的元素 */
    function translatePage() {
        document.querySelectorAll('[data-game-i18n]').forEach(el => {
            const key = el.getAttribute('data-game-i18n');
            el.textContent = t(key);
        });
        document.querySelectorAll('[data-game-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-game-i18n-placeholder');
            el.placeholder = t(key);
        });
    }

    document.addEventListener('gameLanguageChanged', translatePage);

    return { t, getLang, setLang, init, translatePage };
})();
