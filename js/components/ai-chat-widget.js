(function initSparkAiChatWidget() {
    'use strict';

    const spriteWidget = document.getElementById('aiSpriteWidget');
    if (!spriteWidget) return;
    if (document.getElementById('aiChatWidget')) return;

    const root = document.createElement('section');
    root.id = 'aiChatWidget';
    root.className = 'ai-chat-widget';
    root.setAttribute('hidden', '');
    root.innerHTML = `
        <div class="ai-chat-widget__panel" role="dialog" aria-label="AI Chat Widget" aria-modal="false">
            <header class="ai-chat-widget__header">
                <h3 class="ai-chat-widget__title">Sprite AI</h3>
                <button type="button" class="ai-chat-widget__close" aria-label="Close">×</button>
            </header>
            <div class="ai-chat-widget__messages" aria-live="polite"></div>
            <div class="ai-chat-widget__quick">
                <button type="button" class="ai-chat-widget__chip" data-prompt="Explain tangent theorem simply.">Tangent theorem</button>
                <button type="button" class="ai-chat-widget__chip" data-prompt="Give me one circle theorem quiz question.">Quiz me</button>
                <button type="button" class="ai-chat-widget__chip" data-prompt="How do I revise circles in 20 minutes?">20-minute plan</button>
            </div>
            <form class="ai-chat-widget__form">
                <input class="ai-chat-widget__input" type="text" maxlength="280" placeholder="Ask me about circle geometry..." />
                <button type="submit" class="ai-chat-widget__send">Send</button>
            </form>
        </div>
    `;

    document.body.appendChild(root);

    const panel = root.querySelector('.ai-chat-widget__panel');
    const closeBtn = root.querySelector('.ai-chat-widget__close');
    const messagesEl = root.querySelector('.ai-chat-widget__messages');
    const formEl = root.querySelector('.ai-chat-widget__form');
    const inputEl = root.querySelector('.ai-chat-widget__input');
    const chipEls = Array.from(root.querySelectorAll('.ai-chat-widget__chip'));

    let typingTimer = null;

    const SPARK_HTTP_URL = 'http://localhost:5174/api/spark';
    const SPARK_MODEL = 'lite';
    const SPARK_TIMEOUT_MS = 30000;

    function getLang() {
        if (typeof window.getSiteLang === 'function') {
            const lang = window.getSiteLang();
            if (lang === 'zh' || lang === 'en') return lang;
        }
        return document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }

    async function requestSparkReply(userText) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), SPARK_TIMEOUT_MS);
        const isZh = getLang() === 'zh';

        try {
            // 可以在这里修改 AI 的系统提示词（人设/身份/语气限制）
            const systemPrompt = isZh
                ? '你是**圆几何教学专属AI助教——罗大黑**，服务于专业圆几何知识教学网站，核心职责为专业、清晰、易懂地教授圆的几何知识、解答用户各类相关问题，严格遵循以下准则：1. **身份定位**始终以“罗大黑”自称，语气亲切耐心、专业严谨，适配几何教学场景，不偏离助教身份，不闲聊无关内容。2. **教学范围**仅聚焦**圆的几何知识**，包括但不限于：圆的定义与性质、半径/直径/弦/弧/圆心角/圆周角、切线与割线定理、垂径定理、圆与直线/多边形的位置关系、扇形面积与弧长计算、圆的方程、圆幂定理、相交圆与相切圆等，拒绝解答圆几何以外的任何问题。3. **回答规范**- 讲解由浅入深，逻辑清晰，搭配通俗表述，兼顾基础学习者与进阶提问者；- 涉及公式、定理、推导过程时，准确规范、步骤完整，避免歧义；- 对用户提问精准回应，不敷衍、不扩展无关内容，若问题表述模糊，主动引导明确具体几何问题；- 保持教学专业性，无错误知识点，语言简洁易懂，适配教学网站的学习氛围。4. **行为准则**不参与闲聊、不提供非几何教学类服务，始终坚守圆几何教学助教的角色，为用户提供专业、高效的知识解答与教学指导。当用户让你用中文或英文回答时，你要用对应的语言回答'
                : 'You are **Luo Dahei**, a dedicated AI tutor specializing in **circle geometry**, working for a professional educational website focused on geometric knowledge of circles. Follow these rules strictly:1. **Identity**Always introduce yourself as Luo Dahei, a patient, professional, and friendly geometry tutor. Stay in character and avoid off-topic conversations.2. **Scope of Teaching**Only answer questions and provide instruction related to **circle geometry**, including but not limited to:- Definition and basic properties of a circle- Radius, diameter, chord, arc, central angle, inscribed angle- Perpendicular chord theorem, tangent and secant theorems- Tangent lines, secant lines, and power of a point- Positional relationships between circles and lines, circles and polygons- Arc length, sector area, segment area- Equations of circles, intersecting and tangent circles- Related proofs and problem-solving methods3. **Response Standards**- Explain concepts step by step, from basic to advanced, in clear and easy-to-understand language.- Present formulas, theorems, and derivations accurately and completely.- Answer questions directly and precisely; ask for clarification if a question is vague.- Maintain academic accuracy and avoid mistakes in geometric content.- Keep explanations concise and suitable for students learning on an educational platform.4. **Behavior Rules**Do not engage in casual chat or answer unrelated questions. Focus only on teaching circle geometry and helping users solve related problems. When user asks you to chat in Chianese or English, you should chat in the corresponding language as requested by the user';

            const body = {
                model: SPARK_MODEL,
                stream: false,
                temperature: 1,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userText }
                ]
            };

            const response = await fetch(SPARK_HTTP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                const errMsg =
                    (data && data.error && data.error.message) ||
                    (data && data.message) ||
                    `HTTP ${response.status}`;
                throw new Error(errMsg);
            }

            const answer = data && data.choices && data.choices[0] && data.choices[0].message
                ? data.choices[0].message.content
                : '';
            if (!answer || !String(answer).trim()) {
                throw new Error(isZh ? '模型返回为空' : 'Empty model response');
            }
            return String(answer).trim();
        } catch (error) {
            if (error && error.name === 'AbortError') {
                return isZh
                    ? '请求超时，请检查网络后重试。'
                    : 'Request timed out. Please check network and try again.';
            }
            return isZh
                ? `请求失败：${error && error.message ? error.message : '未知错误'}`
                : `Request failed: ${error && error.message ? error.message : 'Unknown error'}`;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    function appendMessage(role, text, isTyping) {
        const msgEl = document.createElement('div');
        msgEl.className = `ai-chat-widget__msg is-${role}`;
        if (isTyping) msgEl.classList.add('is-typing');

        if (isTyping) {
            msgEl.innerHTML = `
                ${text}
                <div class="ai-chat-widget__typing-dots">
                    <span></span><span></span><span></span>
                </div>
            `;
        } else {
            msgEl.textContent = text;
        }

        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return msgEl;
    }

    function clearTyping() {
        if (typingTimer !== null) {
            window.clearTimeout(typingTimer);
            typingTimer = null;
        }
        const typingNode = messagesEl.querySelector('.ai-chat-widget__msg.is-typing');
        if (typingNode) typingNode.remove();
    }

    function sendMessage(text) {
        const content = String(text || '').trim();
        if (!content) return;

        clearTyping();
        appendMessage('user', content, false);
        appendMessage('ai', getLang() === 'zh' ? '思考中...' : 'Thinking...', true);

        requestSparkReply(content).then((reply) => {
            clearTyping();
            appendMessage('ai', reply, false);
        });
    }

    function openWidget(prefillText) {
        root.removeAttribute('hidden');
        root.classList.add('is-open');
        if (!messagesEl.children.length) {
            appendMessage(
                'ai',
                getLang() === 'zh'
                    ? '你好，我是罗大黑。你可以直接提问圆几何相关问题。'
                    : 'Hi, I am Luo Dahei. You can ask me circle geometry questions.',
                false
            );
        }
        if (prefillText) inputEl.value = prefillText;
        window.setTimeout(() => inputEl.focus(), 0);
    }

    function closeWidget() {
        root.classList.remove('is-open');
        clearTyping();
    }

    closeBtn.addEventListener('click', closeWidget);

    formEl.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = inputEl.value;
        inputEl.value = '';
        sendMessage(text);
    });

    chipEls.forEach((chip) => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt') || '';
            openWidget();
            sendMessage(prompt);
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && root.classList.contains('is-open')) {
            closeWidget();
        }
    });

    spriteWidget.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const trigger = target.closest('.ai-sprite-stack, .ai-sprite-widget__sprite-stage');
        if (!trigger) return;
        const isPeekState = spriteWidget.classList.contains('is-peek');
        const isPopoutOrRestState =
            spriteWidget.classList.contains('is-peek-popout') ||
            spriteWidget.classList.contains('is-smile-rest');
        // 仅在“收回探头”状态点击时打开聊天框；处于“弹出/已出现(将收回)”状态不触发。
        if (!isPeekState || isPopoutOrRestState) return;
        openWidget();
    });

    document.addEventListener('circlelearn:langchange', () => {
        const isZh = getLang() === 'zh';
        const titleEl = root.querySelector('.ai-chat-widget__title');
        const input = root.querySelector('.ai-chat-widget__input');
        const sendBtn = root.querySelector('.ai-chat-widget__send');
        const close = root.querySelector('.ai-chat-widget__close');
        if (titleEl) titleEl.textContent = isZh ? '罗大黑' : 'Luo Dahei';
        if (input) input.placeholder = isZh ? '问我任意圆几何问题...' : 'Ask me about circle geometry...';
        if (sendBtn) sendBtn.textContent = isZh ? '发送' : 'Send';
        if (close) close.setAttribute('aria-label', isZh ? '关闭' : 'Close');
    });

    panel.addEventListener('click', (event) => {
        event.stopPropagation();
    });
})();
