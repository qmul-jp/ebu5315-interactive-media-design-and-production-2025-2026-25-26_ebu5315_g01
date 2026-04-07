/**
 * 测验页：从 quiz-questions.js 读取题目并判分
 */
(function () {
    const root = document.getElementById('quizRoot');
    if (!root || !window.QUIZ_QUESTIONS || !window.QUIZ_QUESTIONS.length) return;

    // 1. 初始化状态
    let gameState = {
        currentLevel: 1,
        correctInARow: 0,
        usedIds: new Set(), // 使用 Set 处理去重效率更高
        wrongCategories: {} // 记录错误分布，实现简单的 AI 分析
    };

    let currentQuestion = null;
    let answeredCount = 0;
    let totalCorrect = 0;

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
        statusCard.innerHTML = `
            <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span><strong>Current Level:</strong> <span id="currentLevel">L1</span></span>
                <span><strong>Streak:</strong> <span id="correctStreak">0</span>/3</span>
                <span><strong>Accuracy:</strong> <span id="accuracyRate">0%</span></span>
            </div>
            <div style="height:8px;background:var(--gray-200);border-radius:999px;overflow:hidden;margin-bottom:8px;">
                <div id="levelProgressBar" style="width:0%;height:100%;background:var(--primary);transition:width .25s ease;"></div>
            </div>
            <div><strong>Weak topics:</strong> <span id="weakTags">None</span></div>
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
                feedback.textContent = correct
                    ? `Correct! ${q.explanation}`
                    : `Not quite. ${q.explanation}`;

                const oldNext = root.querySelector('#quizNextBtn');
                if (oldNext) oldNext.remove();

                const next = document.createElement('button');
                next.id = 'quizNextBtn';
                next.type = 'button';
                next.className = 'btn btn-primary';
                next.style.marginTop = '24px';
                next.textContent = 'Next question';
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

    renderQuestion();
})();
