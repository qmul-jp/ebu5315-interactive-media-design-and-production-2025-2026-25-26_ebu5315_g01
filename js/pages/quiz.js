/**
 * 测验页：从 quiz-questions.js 读取题目并判分
 */
(function () {
    const root = document.getElementById('quizRoot');
    if (!root || !window.QUIZ_QUESTIONS || !window.QUIZ_QUESTIONS.length) return;

    // 1. 从localStorage加载状态
    function loadGameState() {
        try {
            const saved = localStorage.getItem('quizGameState');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    currentLevel: parsed.currentLevel || 1,
                    correctInARow: parsed.correctInARow || 0,
                    usedIds: new Set(parsed.usedIds || []),
                    wrongCategories: parsed.wrongCategories || {}
                };
            }
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
        return {
            currentLevel: 1,
            correctInARow: 0,
            usedIds: new Set(),
            wrongCategories: {}
        };
    }

    // 2. 保存状态到localStorage
    function saveGameState() {
        try {
            const stateToSave = {
                currentLevel: gameState.currentLevel,
                correctInARow: gameState.correctInARow,
                usedIds: Array.from(gameState.usedIds),
                wrongCategories: gameState.wrongCategories
            };
            localStorage.setItem('quizGameState', JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save game state:', e);
        }
    }

    // 3. 初始化状态
    let gameState = loadGameState();

    let currentQuestion = null;
    let answeredCount = localStorage.getItem('quizAnsweredCount') ? parseInt(localStorage.getItem('quizAnsweredCount')) : 0;
    let totalCorrect = localStorage.getItem('quizTotalCorrect') ? parseInt(localStorage.getItem('quizTotalCorrect')) : 0;

    // 2. 智能抽题逻辑 (AI: Avoid Repetitions)
    function getNextSmartQuestion() {
        // 筛选：符合当前等级 且 没做过
        let pool = window.QUIZ_QUESTIONS.filter((q) =>
            (q.level || 1) === gameState.currentLevel && !gameState.usedIds.has(q.id)
        );

        // 如果当前等级题抽完了
        if (pool.length === 0) {
            if (gameState.currentLevel < 3) {
                // 自动提升等级 (AI: Progress Levels)
                gameState.currentLevel++;
                return getNextSmartQuestion();
            }
            // 所有题都做完了，重置已做题目记录
            gameState.usedIds.clear();
            return getNextSmartQuestion();
        }

        const randomIndex = Math.floor(Math.random() * pool.length);
        const selected = pool[randomIndex];
        gameState.usedIds.add(selected.id); // 记录已使用
        return selected;
    }

    // 3. 结果处理与晋升逻辑 (AI: Progress Levels)
    function handleUserAnswer(userChoice, correctIndex, category) {
        const isCorrect = userChoice === correctIndex;

        if (isCorrect) {
            totalCorrect++;
            gameState.correctInARow++;
            // 晋升机制：连对 3 题且等级未满
            if (gameState.correctInARow >= 3 && gameState.currentLevel < 3) {
                gameState.currentLevel++;
                gameState.correctInARow = 0;
                notifyLevelUp(); // 调用 UI 通知
            }
        } else {
            gameState.correctInARow = 0;
            // 记录弱点
            gameState.wrongCategories[category] = (gameState.wrongCategories[category] || 0) + 1;
        }

        // 保存状态
        saveGameState();
        localStorage.setItem('quizAnsweredCount', answeredCount.toString());
        localStorage.setItem('quizTotalCorrect', totalCorrect.toString());

        updateUI(); // 更新等级显示、进度条等
        return isCorrect;
    }

    function notifyLevelUp() {
        // 轻量提示，避免影响现有页面结构
        if (typeof window !== 'undefined' && window.console) {
            console.log(`[Quiz] Level up to ${gameState.currentLevel}`);
        }
    }

    function updateUI() {
        if (!root) return;

        const levelEl = root.querySelector('#currentLevel');
        const streakEl = root.querySelector('#correctStreak');
        const progressBarEl = root.querySelector('#levelProgressBar');
        const weakTagEl = root.querySelector('#weakTags');
        const accuracyEl = root.querySelector('#accuracyRate');

        if (levelEl) {
            levelEl.textContent = `L${gameState.currentLevel}`;
        }
        if (streakEl) {
            streakEl.textContent = String(gameState.correctInARow);
        }
        if (progressBarEl) {
            const pct = Math.min(100, Math.round((gameState.correctInARow / 3) * 100));
            progressBarEl.style.width = `${pct}%`;
        }
        if (accuracyEl) {
            const rate = answeredCount > 0 ? Math.round((totalCorrect / answeredCount) * 100) : 0;
            accuracyEl.textContent = `${rate}%`;
        }
        if (weakTagEl) {
            const sortedWeakness = Object.entries(gameState.wrongCategories)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, cnt]) => `${name}(${cnt})`);
            weakTagEl.textContent = sortedWeakness.length
                ? sortedWeakness.join(' / ')
                : 'None';
        }
    }

    // 4. 获取当前语言
    function getCurrentLang() {
        const lang = localStorage.getItem('lang');
        return lang === 'zh' ? 'zh' : 'en';
    }

    // 5. 渲染题目
    function renderQuestion() {
        const q = getNextSmartQuestion();
        if (!q) return;
        currentQuestion = q;

        root.innerHTML = '';

        const title = document.createElement('p');
        title.className = 'quiz-question';
        answeredCount += 1;
        title.textContent = `${answeredCount}. ${q.question}`;

        const statusCard = document.createElement('div');
        statusCard.style.marginBottom = '16px';
        statusCard.style.padding = '12px';
        statusCard.style.borderRadius = '12px';
        statusCard.style.border = '1px solid var(--gray-200)';
        statusCard.style.background = 'var(--gray-50)';
        
        const lang = getCurrentLang();
        const levelText = lang === 'zh' ? '当前等级：' : 'Current Level: ';
        const streakText = lang === 'zh' ? '连对：' : 'Streak: ';
        const accuracyText = lang === 'zh' ? '正确率：' : 'Accuracy: ';
        const weakText = lang === 'zh' ? '薄弱知识点：' : 'Weak topics: ';

        statusCard.innerHTML = `
            <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span><strong>${levelText}</strong> <span id="currentLevel">L1</span></span>
                <span><strong>${streakText}</strong> <span id="correctStreak">0</span>/3</span>
                <span><strong>${accuracyText}</strong> <span id="accuracyRate">0%</span></span>
            </div>
            <div style="height:8px;background:var(--gray-200);border-radius:999px;overflow:hidden;margin-bottom:8px;">
                <div id="levelProgressBar" style="width:0%;height:100%;background:var(--primary);transition:width .25s ease;"></div>
            </div>
            <div><strong>${weakText}</strong> <span id="weakTags">None</span></div>
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

                const correct = handleUserAnswer(i, q.correctIndex, q.category || 'general');
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
            });
            opts.appendChild(b);
        });

        root.appendChild(opts);
        root.appendChild(feedback);
        updateUI();
    }

    // 6. 监听语言切换事件
    document.addEventListener('circlelearn:langchange', () => {
        // 保存当前状态
        saveGameState();
        localStorage.setItem('quizAnsweredCount', answeredCount.toString());
        localStorage.setItem('quizTotalCorrect', totalCorrect.toString());
        
        // 重新渲染当前题目，保持当前题目不变
        if (currentQuestion) {
            // 保存当前题目信息
            const currentQ = currentQuestion;
            const currentAnsweredCount = answeredCount;
            
            // 重新渲染
            root.innerHTML = '';
            
            const title = document.createElement('p');
            title.className = 'quiz-question';
            title.textContent = `${currentAnsweredCount}. ${currentQ.question}`;

            const statusCard = document.createElement('div');
            statusCard.style.marginBottom = '16px';
            statusCard.style.padding = '12px';
            statusCard.style.borderRadius = '12px';
            statusCard.style.border = '1px solid var(--gray-200)';
            statusCard.style.background = 'var(--gray-50)';
            
            const lang = getCurrentLang();
            const levelText = lang === 'zh' ? '当前等级：' : 'Current Level: ';
            const streakText = lang === 'zh' ? '连对：' : 'Streak: ';
            const accuracyText = lang === 'zh' ? '正确率：' : 'Accuracy: ';
            const weakText = lang === 'zh' ? '薄弱知识点：' : 'Weak topics: ';

            statusCard.innerHTML = `
                <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span><strong>${levelText}</strong> <span id="currentLevel">L1</span></span>
                    <span><strong>${streakText}</strong> <span id="correctStreak">0</span>/3</span>
                    <span><strong>${accuracyText}</strong> <span id="accuracyRate">0%</span></span>
                </div>
                <div style="height:8px;background:var(--gray-200);border-radius:999px;overflow:hidden;margin-bottom:8px;">
                    <div id="levelProgressBar" style="width:0%;height:100%;background:var(--primary);transition:width .25s ease;"></div>
                </div>
                <div><strong>${weakText}</strong> <span id="weakTags">None</span></div>
            `;

            root.appendChild(statusCard);
            root.appendChild(title);

            const opts = document.createElement('div');
            opts.className = 'quiz-options';

            const feedback = document.createElement('div');
            feedback.className = 'quiz-feedback';
            feedback.id = 'quizFeedback';

            currentQ.options.forEach((text, i) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'quiz-option-btn';
                b.textContent = text;
                b.addEventListener('click', () => {
                    opts.querySelectorAll('button').forEach((btn) => {
                        btn.disabled = true;
                    });

                    const correct = handleUserAnswer(i, currentQ.correctIndex, currentQ.category || 'general');
                    feedback.classList.add('show');
                    feedback.classList.remove('correct', 'wrong');
                    feedback.classList.add(correct ? 'correct' : 'wrong');
                    
                    const correctText = lang === 'zh' ? '正确！' : 'Correct! ';
                    const wrongText = lang === 'zh' ? '不对哦。' : 'Not quite. ';
                    feedback.textContent = correct
                        ? `${correctText} ${currentQ.explanation}`
                        : `${wrongText} ${currentQ.explanation}`;

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
                });
                opts.appendChild(b);
            });

            root.appendChild(opts);
            root.appendChild(feedback);
            updateUI();
        } else {
            // 如果没有当前题目，渲染新题目
            renderQuestion();
        }
    });

    renderQuestion();
})();
