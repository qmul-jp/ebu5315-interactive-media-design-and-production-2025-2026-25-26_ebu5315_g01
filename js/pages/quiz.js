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
        userAnswers: {}, // { questionId: { selected: index, correct: boolean } }
        score: 0,
        correctInARow: 0,
        answeredCount: 0,
        totalCorrect: 0,
        wrongCategories: {},
        usedIds: new Set(),

        // 加载状态
        load() {
            try {
                const saved = localStorage.getItem('quizGameState');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.currentLevel = parsed.currentLevel || 1;
                    this.correctInARow = parsed.correctInARow || 0;
                    this.usedIds = new Set(parsed.usedIds || []);
                    this.wrongCategories = parsed.wrongCategories || {};
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
                    usedIds: Array.from(this.usedIds),
                    wrongCategories: this.wrongCategories
                };
                localStorage.setItem('quizGameState', JSON.stringify(stateToSave));
                localStorage.setItem('quizAnsweredCount', this.answeredCount.toString());
                localStorage.setItem('quizTotalCorrect', this.totalCorrect.toString());
                localStorage.setItem('quizScore', this.score.toString());
            } catch (e) {
                console.error('Failed to save game state:', e);
            }
        },

        // 获取当前等级的题目
        getCurrentLevelQuestions() {
            return window.getQuestionsByLevel(this.currentLevel);
        },

        // 获取题目状态
        getQuestionStatus(questionId) {
            return this.userAnswers[questionId] || { selected: null, correct: null };
        },

        // 记录答案
        recordAnswer(questionId, selectedIndex, correct) {
            this.userAnswers[questionId] = { selected: selectedIndex, correct };
            this.answeredCount++;
            
            const question = window.getQuestionById(questionId);
            if (question) {
                if (correct) {
                    this.totalCorrect++;
                    this.score += question.points || 0;
                    this.correctInARow++;
                    // 晋升机制：连对 3 题且等级未满
                    if (this.correctInARow >= 3 && this.currentLevel < 3) {
                        this.currentLevel++;
                        this.correctInARow = 0;
                        this.notifyLevelUp();
                    }
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
        }
    };

    // 初始化状态
    QuizState.load();

    // 智能抽题逻辑 (AI: Avoid Repetitions)
    function getNextSmartQuestion() {
        // 筛选：符合当前等级 且 没做过
        const pool = QuizState.getCurrentLevelQuestions().filter((q) =>
            !QuizState.usedIds.has(q.id)
        );

        // 如果当前等级题抽完了
        if (pool.length === 0) {
            if (QuizState.currentLevel < 3) {
                // 自动提升等级 (AI: Progress Levels)
                QuizState.currentLevel++;
                return getNextSmartQuestion();
            }
            // 所有题都做完了，重置已做题目记录
            QuizState.usedIds.clear();
            return getNextSmartQuestion();
        }

        const randomIndex = Math.floor(Math.random() * pool.length);
        const selected = pool[randomIndex];
        QuizState.usedIds.add(selected.id); // 记录已使用
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

        const progressBarEl = root.querySelector('#levelProgressBar');
        const weakTagEl = root.querySelector('#weakTags');
        const scoreEl = root.querySelector('#currentScore');

        if (progressBarEl) {
            const pct = Math.min(100, Math.round((QuizState.correctInARow / 3) * 100));
            progressBarEl.style.width = `${pct}%`;
        }
        if (scoreEl) {
            scoreEl.textContent = QuizState.score.toString();
        }
        if (weakTagEl) {
            const sortedWeakness = Object.entries(QuizState.wrongCategories)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, cnt]) => `${name}(${cnt})`);
            weakTagEl.textContent = sortedWeakness.length
                ? sortedWeakness.join(' / ')
                : 'None';
        }

        // 更新面包屑等级显示
        const breadcrumbLevel = document.getElementById('breadcrumbLevel');
        if (breadcrumbLevel) {
            const lang = getCurrentLang();
            const levelText = lang === 'zh' ? `等级 ${QuizState.currentLevel}` : `Level ${QuizState.currentLevel}`;
            breadcrumbLevel.textContent = levelText;
        }

        // 更新标题等级显示
        const levelDisplay = document.getElementById('levelDisplay');
        if (levelDisplay) {
            levelDisplay.textContent = `Level ${QuizState.currentLevel}`;
        }

        // 更新进度条
        updateProgressBar();
    }

    // 更新进度条
    function updateProgressBar() {
        const progress = QuizState.getProgress();
        const progressBar = document.getElementById('quizProgressBar');
        const progressText = document.getElementById('quizProgressText');

        if (progressBar) {
            progressBar.style.width = `${progress.percentage}%`;
        }
        if (progressText) {
            const lang = getCurrentLang();
            const progressLabel = lang === 'zh' ? '进度：' : 'Progress: ';
            progressText.textContent = `${progressLabel} ${progress.answered}/${progress.total} (${progress.percentage}%)`;
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

        // 清空侧边栏内容
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

        const title = document.createElement('p');
        title.className = 'quiz-question';
        title.textContent = `${QuizState.answeredCount + 1}. ${q.question}`;

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
        
        const lang = getCurrentLang();
        const levelText = lang === 'zh' ? '当前等级：' : 'Current Level: ';
        const streakText = lang === 'zh' ? '连对：' : 'Streak: ';
        const accuracyText = lang === 'zh' ? '正确率：' : 'Accuracy: ';
        const weakText = lang === 'zh' ? '薄弱知识点：' : 'Weak topics: ';
        const scoreText = lang === 'zh' ? '得分：' : 'Score: ';

        statusCard.innerHTML = `
            <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span><strong>${scoreText}</strong> <span id="currentScore">0</span></span>
            </div>
            <div style="height:8px;background:var(--gray-200);border-radius:999px;overflow:hidden;margin-bottom:8px;">
                <div id="levelProgressBar" style="width:0%;height:100%;background:var(--primary);transition:width .25s ease;"></div>
            </div>
            <div style="height:8px;background:var(--gray-200);border-radius:999px;overflow:hidden;margin-bottom:8px;">
                <div id="quizProgressBar" style="width:0%;height:100%;background:var(--secondary);transition:width .25s ease;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div><strong>${weakText}</strong> <span id="weakTags">None</span></div>
                <div id="quizProgressText" style="font-size:0.875rem;color:var(--text-muted);"></div>
            </div>
        `;

        root.appendChild(statusCard);
        root.appendChild(title);

        const opts = document.createElement('div');
        opts.className = 'quiz-options';

        const feedback = document.createElement('div');
        feedback.className = 'quiz-feedback';
        feedback.id = 'quizFeedback';

        q.options.forEach((text, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'quiz-option-btn';
            b.textContent = text;
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
                feedback.textContent = correct
                    ? `${correctText} ${q.explanation}`
                    : `${wrongText} ${q.explanation}`;

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
            opts.appendChild(b);
        });

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
    });

    // 初始化渲染
    renderQuestion();
})();
