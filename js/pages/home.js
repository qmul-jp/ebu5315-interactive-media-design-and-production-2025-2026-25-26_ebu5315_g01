/**
 * 首页：悬浮聊天、AI 输入区、滚动显现
 */
(function () {
    const floatingChatBtn = document.getElementById('floatingChatBtn');
    if (floatingChatBtn) {
        floatingChatBtn.addEventListener('click', () => {
            alert('Chat feature coming soon! This would open a chat window with our AI assistant.');
        });
    }

    const quickQuestionBtns = document.querySelectorAll('.quick-question-btn');
    const chatInput = document.querySelector('.chat-input');
    const btnSend = document.querySelector('.btn-send');

    quickQuestionBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (chatInput) {
                chatInput.value = btn.textContent;
                chatInput.focus();
            }
        });
    });

    if (btnSend && chatInput) {
        btnSend.addEventListener('click', () => {
            const message = chatInput.value.trim();
            if (message) {
                alert(
                    `You asked: "${message}"\n\nOur AI assistant would respond here with detailed information about circle theorems!`
                );
                chatInput.value = '';
            }
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                btnSend.click();
            }
        });
    }

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.theorem-card, .feature-card, .usp-item').forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
})();
