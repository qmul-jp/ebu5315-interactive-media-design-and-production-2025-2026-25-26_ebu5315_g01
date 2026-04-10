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

        // ===== 角度猎人 =====
        'game.hunter.name': { zh: '角度猎人', en: 'Angle Hunter' },
        'game.hunter.desc': { zh: '拖动圆上的顶点，发现隐藏的角度！掌握Thales定理、圆周角与内接四边形的奥秘。', en: 'Drag vertices on the circle to discover hidden angles! Master Thales\' theorem, inscribed angles, and cyclic quadrilateral properties.' },
        'game.hunter.tag': { zh: '角度解谜', en: 'Angle Puzzle' },
        'hunter.title': { zh: '角度猎人', en: 'Angle Hunter' },
        'hunter.level': { zh: '关卡', en: 'Level' },
        'hunter.solved': { zh: '已解', en: 'Solved' },
        'hunter.hints': { zh: '提示', en: 'Hints' },
        'hunter.start': { zh: '开始', en: 'Start' },
        'hunter.next': { zh: '下一关', en: 'Next Level' },
        'hunter.win': { zh: '全部角度已找到！', en: 'All Angles Found!' },
        'hunter.backToMenu': { zh: '返回菜单', en: 'Back to Menu' },
        'hunter.correct': { zh: '正确！', en: 'Correct!' },
        'hunter.wrong': { zh: '再想想...', en: 'Try again...' },
        'hunter.hintUsed': { zh: '提示已使用', en: 'Hint used' },
        'hunter.dragTip': { zh: '拖动顶点观察角度变化', en: 'Drag vertices to observe angle changes' },
        'hunter.clickAngle': { zh: '点击未知角度输入答案', en: 'Click unknown angle to input answer' },
        'hunter.knowledge.thales': { zh: 'Thales定理：半圆上的角始终为90°', en: 'Thales\' Theorem: Angle in a semicircle is always 90°' },
        'hunter.knowledge.inscribedAngle': { zh: '圆周角定理：圆周角 = 圆心角 ÷ 2', en: 'Inscribed Angle Theorem: Inscribed angle = Central angle ÷ 2' },
        'hunter.knowledge.sameArc': { zh: '同弧定理：同弧上的圆周角相等', en: 'Same Arc: Angles subtended by the same arc are equal' },
        'hunter.knowledge.cyclicQuad': { zh: '内接四边形：对角互补，∠A+∠C=180°', en: 'Cyclic Quadrilateral: Opposite angles sum to 180°' },
        'hunter.knowledge.triangleSum': { zh: '三角形内角和 = 180°', en: 'Triangle angle sum = 180°' },

        // ===== 弦之裂变 =====
        'game.chord.name': { zh: '弦之裂变', en: 'Chord Breaker' },
        'game.chord.desc': { zh: '发射能量球在圆内弹射！击中弦上的节点来通关，运用交弦定理。', en: 'Launch energy balls that bounce inside the circle! Hit chord nodes to clear levels using intersecting chords theorem.' },
        'game.chord.tag': { zh: '弹球解谜', en: 'Pinball Puzzle' },
        'chord.title': { zh: '弦之裂变', en: 'Chord Breaker' },
        'chord.level': { zh: '关卡', en: 'Level' },
        'chord.shots': { zh: '发射', en: 'Shots' },
        'chord.nodes': { zh: '节点', en: 'Nodes' },
        'chord.start': { zh: '开始', en: 'Start' },
        'chord.next': { zh: '下一关', en: 'Next Level' },
        'chord.retry': { zh: '重试', en: 'Retry' },
        'chord.win': { zh: '关卡通过！', en: 'Level Clear!' },
        'chord.finalCongrats': { zh: '恭喜通关！', en: 'Congratulations!' },
        'chord.finalDesc': { zh: '你已完成弦之裂变全部关卡', en: 'You have completed all Chord Breaker levels.' },
        'chord.playAgain': { zh: '再来一轮', en: 'Play Again' },
        'chord.backToMenu': { zh: '返回菜单', en: 'Back to Menu' },
        'chord.dragToAim': { zh: '在圆周上拖拽瞄准', en: 'Drag on circle to aim' },
        'chord.knowledge.chordTheorem': { zh: '交弦定理：PA × PB = PC × PD', en: 'Chord Theorem: PA × PB = PC × PD' },
        'chord.knowledge.secantTheorem': { zh: '割线定理：从圆外一点引割线，切线²=割线外段×全段', en: 'Secant Theorem: Tangent² = External segment × Whole secant' },
        'chord.knowledge.perpBisector': { zh: '弦的垂直平分线过圆心', en: 'Perpendicular bisector of a chord passes through the center' },
        'chord.knowledge.reflection': { zh: '反射定律：入射角=反射角（圆弧法线=半径方向）', en: 'Reflection: Angle of incidence = Angle of reflection (normal = radius direction)' },
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
