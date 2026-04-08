/**
 * 全站静态文案 i18n（非游戏画布文本）
 */
(function () {
    const dict = {
        en: {
            'settings.language': 'Language',
            'settings.theme': 'Eye Comfort Mode',
            'settings.contact': 'Contact Us',
            'nav.home': 'Home',
            'nav.game': 'Game',
            'nav.quiz': 'Quiz',
            'home.hero.title': 'Master Circle Theorems Visually',
            'home.hero.subtitle': 'Learn GCSE circle geometry through interactive visualizations, engaging games, and AI-powered guidance. Master complex theorems with ease and confidence.',
            'home.hero.startGame': 'Start Game',
            'home.hero.takeQuiz': 'Take Quiz',
            'home.theorem.sectionTitle': 'Explore Circle Theorems',
            'home.theorem.sectionSubtitle': 'Master fundamental circle geometry concepts',
            'home.ai.title': 'Meet Your AI Math Guide',
            'home.ai.subtitle': 'Ask questions about circle geometry and get instant, detailed explanations powered by AI',
            'home.ai.greeting': "Hello! I'm here to help you understand circle theorems. What would you like to learn about today?",
            'home.ai.inputPlaceholder': 'Ask about circle theorems, angles, or any geometry concept...',
            'home.usp.visual.title': 'Visual Learning',
            'home.usp.visual.desc': 'Interactive diagrams and animations bring circle theorems to life, making complex concepts easy to understand.',
            'home.usp.interactive.title': 'Interactive Practice',
            'home.usp.interactive.desc': 'Hands-on exercises and real-time feedback help you master geometry through active engagement.',
            'home.usp.bilingual.title': 'Bilingual Support',
            'home.usp.bilingual.desc': 'Learn in English or Chinese with seamless language switching for maximum accessibility.',
            'home.premium.badge': 'Premium',
            'home.premium.title': 'Upgrade to Premium Practice',
            'home.premium.desc': 'Unlock unlimited quizzes, advanced theorems, personalized learning paths, and detailed analytics. Take your geometry skills to the next level.',
            'home.premium.cta': 'Get Premium',
            'footer.quickLinks': 'Quick Links',
            'footer.legal': 'Legal',
            'footer.contact': 'Contact',
            'footer.privacy': 'Privacy Policy',
            'footer.terms': 'Terms of Service',
            'footer.accessibility': 'Accessibility',
            'footer.copy': '© 2026 CircleLearn. All rights reserved. Built with care for students worldwide.',
            'learn.breadcrumb.home': 'Home',
            'learn.breadcrumb.current': 'Learn More',
            'learn.hero.title': 'Circle theorems, explained clearly',
            'learn.hero.lead': 'Scroll through each theorem for a concise statement, intuition, and the diagram you saw on the home page. Open the Basic menu to jump to any of the eight foundational theorems.',
            'learn.hero.back': 'Back to Explore Circle Theorems',
            'learn.toc.title': 'Jump to',
            'learn.toc.basic': 'Basic',
            'contact.title': 'Contact Us',
            'contact.subtitle': "Have questions? We'd love to hear from you.",
            'contact.info.title': 'Get in Touch',
            'contact.info.text': 'Whether you have a question about features, need technical support, or want to provide feedback, our team is ready to answer all your questions.',
            'contact.form.name': 'Name',
            'contact.form.email': 'Email',
            'contact.form.message': 'Message',
            'contact.form.placeholder.name': 'Your name',
            'contact.form.placeholder.email': 'your.email@example.com',
            'contact.form.placeholder.message': 'Tell us how we can help you...',
            'contact.privacy': 'We respect your privacy. Your information will never be shared with third parties.',
            'contact.send': 'Send Message'
        },
        zh: {
            'settings.language': '语言',
            'settings.theme': '护眼模式',
            'settings.contact': '联系我们',
            'nav.home': '首页',
            'nav.game': '游戏',
            'nav.quiz': '测验',
            'home.hero.title': '可视化掌握圆定理',
            'home.hero.subtitle': '通过交互可视化、趣味游戏和 AI 辅导学习 GCSE 圆几何，更轻松、更自信地掌握复杂定理。',
            'home.hero.startGame': '开始游戏',
            'home.hero.takeQuiz': '开始测验',
            'home.theorem.sectionTitle': '探索圆定理',
            'home.theorem.sectionSubtitle': '掌握圆几何核心基础概念',
            'home.ai.title': '认识你的 AI 数学助手',
            'home.ai.subtitle': '围绕圆几何随时提问，立即获得 AI 提供的详细讲解',
            'home.ai.greeting': '你好！我来帮你理解圆定理。你想先学习哪一部分？',
            'home.ai.inputPlaceholder': '输入你关于圆定理、角度或任意几何概念的问题...',
            'home.usp.visual.title': '可视化学习',
            'home.usp.visual.desc': '通过交互图示与动画让圆定理更直观，复杂概念也能快速理解。',
            'home.usp.interactive.title': '互动练习',
            'home.usp.interactive.desc': '动手练习与实时反馈结合，帮助你在参与中真正掌握几何。',
            'home.usp.bilingual.title': '双语支持',
            'home.usp.bilingual.desc': '支持中英文无缝切换，让学习更高效、更易用。',
            'home.premium.badge': '高级版',
            'home.premium.title': '升级到高级练习',
            'home.premium.desc': '解锁无限测验、进阶定理、个性化学习路径与详细学习分析，进一步提升你的几何能力。',
            'home.premium.cta': '获取高级版',
            'footer.quickLinks': '快速链接',
            'footer.legal': '法律条款',
            'footer.contact': '联系我们',
            'footer.privacy': '隐私政策',
            'footer.terms': '服务条款',
            'footer.accessibility': '无障碍说明',
            'footer.copy': '© 2026 CircleLearn. 保留所有权利。为全球学生用心打造。',
            'learn.breadcrumb.home': '首页',
            'learn.breadcrumb.current': '深入学习',
            'learn.hero.title': '清晰理解圆定理',
            'learn.hero.lead': '逐条浏览定理，快速掌握核心结论、直观理解与首页同款图示。打开 Basic 菜单可跳转到 8 个基础定理。',
            'learn.hero.back': '返回「探索圆定理」',
            'learn.toc.title': '跳转到',
            'learn.toc.basic': '基础',
            'contact.title': '联系我们',
            'contact.subtitle': '有任何问题？欢迎随时联系。',
            'contact.info.title': '取得联系',
            'contact.info.text': '无论你对功能有疑问、需要技术支持，还是想提供反馈，我们的团队都乐意帮助你。',
            'contact.form.name': '姓名',
            'contact.form.email': '邮箱',
            'contact.form.message': '留言',
            'contact.form.placeholder.name': '请输入你的姓名',
            'contact.form.placeholder.email': 'your.email@example.com',
            'contact.form.placeholder.message': '告诉我们你需要什么帮助...',
            'contact.privacy': '我们尊重你的隐私。你的信息不会与任何第三方共享。',
            'contact.send': '发送消息'
        }
    };

    function getLang() {
        const lang = localStorage.getItem('lang');
        return lang === 'zh' ? 'zh' : 'en';
    }

    function t(lang, key) {
        return (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || null;
    }

    function applySiteI18n() {
        const lang = getLang();
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            const text = t(lang, key);
            if (text !== null) el.textContent = text;
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            const text = t(lang, key);
            if (text !== null) el.setAttribute('placeholder', text);
        });
    }

    document.addEventListener('DOMContentLoaded', applySiteI18n);
    document.addEventListener('circlelearn:langchange', applySiteI18n);
    window.applySiteI18n = applySiteI18n;
})();
