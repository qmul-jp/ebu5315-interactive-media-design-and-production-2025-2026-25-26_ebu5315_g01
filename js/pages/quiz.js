/**
 * 测验页：从 quiz-questions.js 读取题目并判分
 */
(function () {
    const root = document.getElementById('quizRoot');
    if (!root || !window.QUIZ_QUESTIONS || !window.QUIZ_QUESTIONS.byDifficulty) return;

    // 全局状态对象
    const QuizState = {
        currentLevel: 1,
        currentQuestionId: null,
        userAnswers: {}, // { level: { questionId: { selected: index, correct: boolean } } }
        score: 0,
        correctInARow: 0,
        answeredCount: 0,
        totalCorrect: 0,
        wrongCategories: {},

        // 加载状态
        load() {
            try {
                const saved = localStorage.getItem('quizGameState');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.currentLevel = parsed.currentLevel || 1;
                    this.correctInARow = parsed.correctInARow || 0;
                    this.wrongCategories = parsed.wrongCategories || {};
                    this.userAnswers = parsed.userAnswers || {};
                }
            } catch (e) {
                console.error('Failed to load game state:', e);
            }

            // 加载统计数据
            this.answeredCount = localStorage.getItem('quizAnsweredCount') ? parseInt(localStorage.getItem('quizAnsweredCount')) : 0;
            this.totalCorrect = localStorage.getItem('quizTotalCorrect') ? parseInt(localStorage.getItem('quizTotalCorrect')) : 0;
            this.score = localStorage.getItem('quizScore') ? parseInt(localStorage.getItem('quizScore')) : 0;
        },

        // 保存状态
        save() {
            try {
                const stateToSave = {
                    currentLevel: this.currentLevel,
                    correctInARow: this.correctInARow,
                    wrongCategories: this.wrongCategories,
                    userAnswers: this.userAnswers
                };
                localStorage.setItem('quizGameState', JSON.stringify(stateToSave));
                localStorage.setItem('quizAnsweredCount', this.answeredCount.toString());
                localStorage.setItem('quizTotalCorrect', this.totalCorrect.toString());
                localStorage.setItem('quizScore', this.score.toString());
            } catch (e) {
                console.error('Failed to save game state:', e);
            }
        },

        // 获取当前等级的题目（按id顺序排列）
        getCurrentLevelQuestions() {
            const questions = window.getQuestionsByLevel(this.currentLevel);
            // 按id顺序排序
            return questions.sort((a, b) => {
                if (a.id < b.id) return -1;
                if (a.id > b.id) return 1;
                return 0;
            });
        },

        // 获取题目状态
        getQuestionStatus(questionId) {
            if (!this.userAnswers[this.currentLevel]) {
                return { selected: null, correct: null };
            }
            return this.userAnswers[this.currentLevel][questionId] || { selected: null, correct: null };
        },

        // 记录答案
        recordAnswer(questionId, selectedIndex, correct) {
            // 确保当前等级的作答记录对象存在
            if (!this.userAnswers[this.currentLevel]) {
                this.userAnswers[this.currentLevel] = {};
            }
            this.userAnswers[this.currentLevel][questionId] = { selected: selectedIndex, correct };
            this.answeredCount++;
            
            const question = window.getQuestionById(questionId);
            if (question) {
                if (correct) {
                this.totalCorrect++;
                this.score += question.points || 0;
                this.correctInARow++;
            } else {
                    this.correctInARow = 0;
                    // 记录弱点
                    const category = question.category || 'general';
                    this.wrongCategories[category] = (this.wrongCategories[category] || 0) + 1;
                }
            }

            this.save();
        },

        // 通知等级提升
        notifyLevelUp() {
            if (typeof window !== 'undefined' && window.console) {
                console.log(`[Quiz] Level up to ${this.currentLevel}`);
            }
        },

        // 获取当前进度
        getProgress() {
            const totalQuestions = this.getCurrentLevelQuestions().length;
            const answered = Object.keys(this.userAnswers).filter(id => {
                const q = window.getQuestionById(id);
                return q && q.level === this.currentLevel;
            }).length;
            return {
                answered,
                total: totalQuestions,
                percentage: totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0
            };
        },

        // 获取正确率
        getAccuracy() {
            return this.answeredCount > 0 ? Math.round((this.totalCorrect / this.answeredCount) * 100) : 0;
        },

        // 重置所有数据
        reset() {
            if (confirm(getCurrentLang() === 'zh' ? '确定要清除所有作答记录吗？此操作无法撤销。' : 'Are you sure you want to clear all progress? This cannot be undone.')) {
                localStorage.removeItem('quizGameState');
                localStorage.removeItem('quizAnsweredCount');
                localStorage.removeItem('quizTotalCorrect');
                localStorage.removeItem('quizScore');
                location.reload(); // 清除后刷新页面以重置所有状态
            }
        }
    };

    // 初始化状态
    QuizState.load();
    
    // 处理URL参数中的等级设置
    function handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const levelParam = urlParams.get('level');
        if (levelParam) {
            const level = parseInt(levelParam);
            if (level >= 1 && level <= 3) {
                QuizState.currentLevel = level;
                // 确保当前等级的作答记录对象存在
                if (!QuizState.userAnswers[QuizState.currentLevel]) {
                    QuizState.userAnswers[QuizState.currentLevel] = {};
                }
                QuizState.correctInARow = 0;
                QuizState.save();
            }
        }
    }
    handleUrlParams();

    // 顺序抽题逻辑
    function getNextSmartQuestion() {
        // 确保当前等级的作答记录对象存在
        if (!QuizState.userAnswers[QuizState.currentLevel]) {
            QuizState.userAnswers[QuizState.currentLevel] = {};
        }
        
        // 筛选：符合当前等级 且 没做过（已回答的题目）
        const pool = QuizState.getCurrentLevelQuestions().filter((q) =>
            !QuizState.userAnswers[QuizState.currentLevel][q.id]
        );

        // 如果当前等级题抽完了
        if (pool.length === 0) {
            if (QuizState.currentLevel < 3) {
                // 自动提升等级
                QuizState.currentLevel++;
                return getNextSmartQuestion();
            }
            // 所有题都做完了，重置当前等级的作答记录
            QuizState.userAnswers[QuizState.currentLevel] = {};
            return getNextSmartQuestion();
        }

        // 按顺序选择第一个未做过的题目
        const selected = pool[0];
        QuizState.currentQuestionId = selected.id;
        return selected;
    }

    // 获取当前语言
    function getCurrentLang() {
        const lang = localStorage.getItem('lang');
        return lang === 'zh' ? 'zh' : 'en';
    }

    // 更新UI
    function updateUI() {
        if (!root) return;

        // 更新面包屑等级显示
        const breadcrumbLevel = document.getElementById('breadcrumbLevel');
        if (breadcrumbLevel) {
            const lang = getCurrentLang();
            const levelText = lang === 'zh' ? `等级 ${QuizState.currentLevel}` : `Level ${QuizState.currentLevel}`;
            breadcrumbLevel.textContent = levelText;
        }

        // 更新标题，移除等级显示
        const levelDisplay = document.getElementById('levelDisplay');
        if (levelDisplay) {
            levelDisplay.textContent = '';
        }
    }

    // 渲染侧边栏导航网格
    function renderSidebarNavigator() {
        const sidebar = document.getElementById('quiz-sidebar');
        if (!sidebar) return;

        const questions = QuizState.getCurrentLevelQuestions();
        
        // 更新侧边栏标题
        const sidebarTitle = document.getElementById('sidebarTitleDisplay');
        if (sidebarTitle) {
            const lang = getCurrentLang();
            const titleText = lang === 'zh' ? `所有题目（等级 ${QuizState.currentLevel}）` : `All Questions (Level ${QuizState.currentLevel})`;
            sidebarTitle.textContent = titleText;
        }

        // 清空侧边栏内容（保留标题）
        const existingNavigator = sidebar.querySelector('.quiz-navigator');
        if (existingNavigator) {
            existingNavigator.remove();
        }

        const navigator = document.createElement('div');
        navigator.className = 'quiz-navigator';

        questions.forEach((question, index) => {
            const status = QuizState.getQuestionStatus(question.id);
            const isActive = question.id === QuizState.currentQuestionId;

            const item = document.createElement('div');
            item.className = 'quiz-nav-item';
            item.dataset.questionId = question.id;
            
            // 添加状态类名
            if (status.correct === true) {
                item.classList.add('correct');
            } else if (status.correct === false) {
                item.classList.add('incorrect');
            } else {
                item.classList.add('unanswered');
            }
            
            if (isActive) {
                item.classList.add('active');
            }

            item.textContent = (index + 1).toString();
            item.addEventListener('click', () => {
                // 跳转到对应题目
                QuizState.currentQuestionId = question.id;
                renderQuestion(question);
            });

            navigator.appendChild(item);
        });

        sidebar.appendChild(navigator);
    }

    // 渲染题目
    function renderQuestion(question = null) {
        const q = question || getNextSmartQuestion();
        if (!q) return;

        root.innerHTML = '';

        // 添加选关按钮
        const levelSelector = document.createElement('div');
        levelSelector.className = 'level-selector';
        
        for (let i = 1; i <= 3; i++) {
            const levelBtn = document.createElement('button');
            levelBtn.type = 'button';
            levelBtn.className = `level-btn ${QuizState.currentLevel === i ? 'active' : ''}`;
            levelBtn.textContent = `L${i}`;
            levelBtn.addEventListener('click', () => changeLevel(i));
            levelSelector.appendChild(levelBtn);
        }
        root.appendChild(levelSelector);

        const title = document.createElement('p');
        title.className = 'quiz-question';
        const lang = getCurrentLang();
        const questionText = lang === 'zh' && q.question_zh ? q.question_zh : q.question;
        title.textContent = `${q.id}. ${questionText}`;

        const statusCard = document.createElement('div');
        statusCard.style.marginBottom = '16px';
        statusCard.style.padding = '12px';
        statusCard.style.borderRadius = '12px';
        statusCard.style.border = '1px solid var(--gray-200)';
        statusCard.style.background = 'var(--gray-50)';
        statusCard.style.color = '#000000';
        
        // 检查是否为深色模式
        if (document.body.classList.contains('dark-mode')) {
            statusCard.style.color = '#FFFFFF';
            statusCard.style.background = '#1E4A2D';
            statusCard.style.border = '1px solid #2E5A3D';
        }
        
        const weakText = lang === 'zh' ? '薄弱知识点：' : 'Weak topics: ';
        const scoreText = lang === 'zh' ? '得分：' : 'Score: ';

        // 定义所有题目类别
        const categories = {
            center_circumference: lang === 'zh' ? '圆心角与圆周角' : 'Center & Circumference',
            semicircle: lang === 'zh' ? '半圆角' : 'Semicircle',
            same_segment: lang === 'zh' ? '同弓形角' : 'Same Segment',
            cyclic_quad: lang === 'zh' ? '圆内接四边形' : 'Cyclic Quadrilateral',
            tangent_radius: lang === 'zh' ? '切线与半径' : 'Tangent & Radius',
            tangents_point: lang === 'zh' ? '同点切线' : 'Tangents from Point',
            alternate_segment: lang === 'zh' ? '弦切角' : 'Alternate Segment',
            chord_bisector: lang === 'zh' ? '弦的垂直平分线' : 'Chord Bisector',
            isosceles_triangle: lang === 'zh' ? '等腰三角形' : 'Isosceles Triangle',
            combination: lang === 'zh' ? '定理组合' : 'Combination',
            complex_cyclic: lang === 'zh' ? '复杂圆内接四边形' : 'Complex Cyclic',
            tangent_logic: lang === 'zh' ? '切线逻辑' : 'Tangent Logic',
            arc_logic: lang === 'zh' ? '弧长逻辑' : 'Arc Logic',
            ultimate_challenge: lang === 'zh' ? '终极挑战' : 'Ultimate Challenge'
        };
        
        // 获取当前题目的类别
        const currentCategory = q.category || 'general';
        const categoryName = categories[currentCategory] || currentCategory;
        
        statusCard.innerHTML = `
            <div style="margin-bottom:12px;">
                <strong>${lang === 'zh' ? '知识点：' : 'Topic: '}</strong>
                <span>${categoryName}</span>
            </div>
        `;

        root.appendChild(statusCard);
        
        // 更新AI提示
        const hintContent = document.getElementById('hintContent');
        if (hintContent) {
            // 根据题目类别生成对应的提示
            const hints = {
                center_circumference: {
                    en: "Remember the relationship between the angle at the center and the angle at the circumference subtended by the same arc.",
                    zh: "记住同圆弧所对应的圆心角与圆周角之间的关系。"
                },
                semicircle: {
                    en: "Any angle inscribed in a semicircle is a right angle (90°).",
                    zh: "半圆所对的圆周角恒为直角（90°）。"
                },
                same_segment: {
                    en: "Angles subtended by the same chord (or arc) at the circumference, on the same side of the chord, are equal.",
                    zh: "同弦（或同弧）在圆周同侧所对的圆周角相等。"
                },
                cyclic_quad: {
                    en: "Opposite angles of a cyclic quadrilateral sum to 180°.",
                    zh: "圆内接四边形的对角互补，和为 180°。"
                },
                tangent_radius: {
                    en: "A radius drawn to the point of contact is perpendicular to the tangent: the angle between them is 90°.",
                    zh: "过切点的半径与切线垂直，夹角为 90°。"
                },
                tangents_point: {
                    en: "From an external point, the two tangent segments to a circle have equal lengths.",
                    zh: "从圆外一点向圆引两条切线，两条切线段长度相等。"
                },
                alternate_segment: {
                    en: "The angle between a tangent and a chord through the contact point equals the angle in the alternate segment.",
                    zh: "切线与过切点弦所成的角，等于该弦在对侧弧所对的圆周角。"
                },
                chord_bisector: {
                    en: "A diameter perpendicular to a chord bisects the chord and its arcs.",
                    zh: "垂直于弦的直径平分这条弦，且平分弦所对的两条弧。"
                },
                isosceles_triangle: {
                    en: "In an isosceles triangle, the angles opposite equal sides are equal.",
                    zh: "在等腰三角形中，等边对等角。"
                },
                combination: {
                    en: "Combine multiple circle theorems to solve this problem.",
                    zh: "结合多个圆定理来解决这个问题。"
                },
                complex_cyclic: {
                    en: "Look for cyclic quadrilaterals and their properties in this complex diagram.",
                    zh: "在这个复杂图形中寻找圆内接四边形及其性质。"
                },
                tangent_logic: {
                    en: "Use tangent properties and logical reasoning to solve this problem.",
                    zh: "利用切线性质和逻辑推理来解决这个问题。"
                },
                arc_logic: {
                    en: "Remember the relationship between arcs, angles, and chord lengths.",
                    zh: "记住弧长、角度和弦长之间的关系。"
                },
                ultimate_challenge: {
                    en: "This is a challenging problem that requires applying multiple geometry concepts.",
                    zh: "这是一个具有挑战性的问题，需要应用多个几何概念。"
                }
            };
            
            const currentHint = hints[currentCategory] || {
                en: "Remember the circle theorems to solve this problem.",
                zh: "记住圆定理来解决这个问题。"
            };
            hintContent.textContent = currentHint[lang] || currentHint.en;
        }
        
        root.appendChild(title);

        const opts = document.createElement('div');
        opts.className = 'quiz-options';

        const feedback = document.createElement('div');
        feedback.className = 'quiz-feedback';
        feedback.id = 'quizFeedback';

        const options = lang === 'zh' && q.options_zh ? q.options_zh : q.options;
        
        // 检查是否已经回答过此题
        const previousStatus = QuizState.getQuestionStatus(q.id);
        const hasAnswered = previousStatus.selected !== null;
        
        options.forEach((text, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'quiz-option-btn';
            b.textContent = text;
            
            // 如果已经回答过，显示之前的选择和结果
            if (hasAnswered) {
                b.disabled = true;
                
                // 如果这是用户之前选择的选项
                if (i === previousStatus.selected) {
                    if (previousStatus.correct) {
                        // 答对了，用绿色标记
                        b.style.backgroundColor = '#4CAF50';
                        b.style.color = 'white';
                        b.style.borderColor = '#45a049';
                    } else {
                        // 答错了，用红色标记
                        b.style.backgroundColor = '#f44336';
                        b.style.color = 'white';
                        b.style.borderColor = '#da190b';
                    }
                }
                
                // 如果答错了，还要显示正确答案（绿色）
                if (!previousStatus.correct && i === q.correctIndex) {
                    b.style.backgroundColor = '#4CAF50';
                    b.style.color = 'white';
                    b.style.borderColor = '#45a049';
                }
            } else {
                // 未回答过，可以点击
                b.addEventListener('click', () => {
                    opts.querySelectorAll('button').forEach((btn) => {
                        btn.disabled = true;
                    });

                    const correct = i === q.correctIndex;
                    QuizState.recordAnswer(q.id, i, correct);
                    
                    feedback.classList.add('show');
                    feedback.classList.remove('correct', 'wrong');
                    feedback.classList.add(correct ? 'correct' : 'wrong');
                    
                    const correctText = lang === 'zh' ? '正确！' : 'Correct! ';
                    const wrongText = lang === 'zh' ? '不对哦。' : 'Not quite. ';
                    const explanationText = lang === 'zh' && q.explanation_zh ? q.explanation_zh : q.explanation;

                    // 获取用户选择的选项和正确的选项
                    const selectedOption = options[i];
                    const correctOption = options[q.correctIndex];
                    const selectedText = lang === 'zh' ? '你选择了：' : 'You selected: ';
                    const correctOptionText = lang === 'zh' ? '正确答案是：' : 'Correct answer: ';

                    if (correct) {
                        feedback.textContent = `${correctText} ${explanationText}`;
                    } else {
                        feedback.textContent = `${wrongText}${selectedText}${selectedOption}。${correctOptionText}${correctOption}。${explanationText}`;
                    }

                    const oldNext = root.querySelector('#quizNextBtn');
                    if (oldNext) oldNext.remove();

                    const next = document.createElement('button');
                    next.id = 'quizNextBtn';
                    next.type = 'button';
                    next.className = 'btn btn-primary';
                    next.style.marginTop = '24px';
                    next.textContent = lang === 'zh' ? '下一题' : 'Next question';
                    next.addEventListener('click', () => {
                        renderQuestion();
                    });
                    root.appendChild(next);

                    // 更新侧边栏
                    renderSidebarNavigator();
                    updateUI();
                });
            }
            opts.appendChild(b);
        });
        
        // 如果已经回答过，显示之前的反馈
        if (hasAnswered) {
            feedback.classList.add('show');
            feedback.classList.remove('correct', 'wrong');
            feedback.classList.add(previousStatus.correct ? 'correct' : 'wrong');
            
            const correctText = lang === 'zh' ? '正确！' : 'Correct! ';
            const wrongText = lang === 'zh' ? '不对哦。' : 'Not quite. ';
            const explanationText = lang === 'zh' && q.explanation_zh ? q.explanation_zh : q.explanation;
            const selectedOption = options[previousStatus.selected];
            const correctOption = options[q.correctIndex];
            const selectedText = lang === 'zh' ? '你选择了：' : 'You selected: ';
            const correctOptionText = lang === 'zh' ? '正确答案是：' : 'Correct answer: ';
            
            if (previousStatus.correct) {
                feedback.textContent = `${correctText} ${explanationText}`;
            } else {
                feedback.textContent = `${wrongText}${selectedText}${selectedOption}。${correctOptionText}${correctOption}。${explanationText}`;
            }
        }

        root.appendChild(opts);
        root.appendChild(feedback);
        updateUI();
        renderSidebarNavigator();
    }

    // 监听语言切换事件
    document.addEventListener('circlelearn:langchange', () => {
        // 保存当前状态
        QuizState.save();
        
        // 重新渲染当前题目，保持当前题目不变
        if (QuizState.currentQuestionId) {
            const currentQ = window.getQuestionById(QuizState.currentQuestionId);
            if (currentQ) {
                renderQuestion(currentQ);
            } else {
                renderQuestion();
            }
        } else {
            // 如果没有当前题目，渲染新题目
            renderQuestion();
        }
        
        // 确保侧边栏导航网格也被更新
        renderSidebarNavigator();
    });

    // 切换等级函数
    function changeLevel(level) {
        if (level < 1 || level > 3) return;
        QuizState.currentLevel = level;
        // 确保当前等级的作答记录对象存在
        if (!QuizState.userAnswers[QuizState.currentLevel]) {
            QuizState.userAnswers[QuizState.currentLevel] = {};
        }
        QuizState.correctInARow = 0;
        QuizState.save();
        renderQuestion();
    }
    window.changeLevel = changeLevel;

    // 初始化渲染
    document.addEventListener('DOMContentLoaded', () => {
        renderQuestion();
        // 确保侧边栏导航网格在页面加载时显示
        renderSidebarNavigator();
        
        // 绑定清除按钮
        const clearBtn = document.getElementById('clearDataBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                QuizState.reset();
            });
        }
    });
})();
