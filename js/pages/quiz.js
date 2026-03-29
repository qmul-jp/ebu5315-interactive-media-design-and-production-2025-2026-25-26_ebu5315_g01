/**
 * 测验页：从 quiz-questions.js 读取题目并判分
 */
(function () {
    const root = document.getElementById('quizRoot');
    if (!root || !window.QUIZ_QUESTIONS || !window.QUIZ_QUESTIONS.length) return;

    let index = 0;

    function renderQuestion() {
        const q = window.QUIZ_QUESTIONS[index];
        if (!q) return;

        root.innerHTML = '';

        const title = document.createElement('p');
        title.className = 'quiz-question';
        title.textContent = `${index + 1}. ${q.question}`;
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
                next.textContent =
                    index < window.QUIZ_QUESTIONS.length - 1 ? 'Next question' : 'Finish';
                next.addEventListener('click', () => {
                    if (index < window.QUIZ_QUESTIONS.length - 1) {
                        index += 1;
                        renderQuestion();
                    } else {
                        alert('Great job! More quiz levels coming in a future update.');
                        index = 0;
                        renderQuestion();
                    }
                });
                root.appendChild(next);
            });
            opts.appendChild(b);
        });

        root.appendChild(opts);
        root.appendChild(feedback);
    }

    renderQuestion();
})();
