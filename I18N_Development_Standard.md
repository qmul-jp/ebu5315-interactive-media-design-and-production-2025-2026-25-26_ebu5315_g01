# CircleLearn 多语言开发规范（中英切换）

本规范用于团队协作时，确保页面文案改动不会破坏中英切换功能。

适用范围：`index`、`game`、`learn_more`、`contact`、`quiz` 等页面。

---

## 1. 核心原则

1. **页面不直接写死文案**  
   页面中的可见文本应使用 `data-i18n`（或输入框 `data-i18n-placeholder`）绑定 key。

2. **词典是唯一文案来源（SSOT）**  
   - 站点通用文案：`js/data/site-i18n.js`
   - 游戏模块文案：`js/data/game-i18n.js`

3. **每个 key 必须同时有 `en` 和 `zh`**  
   禁止只补一种语言。

4. **统一语言状态来源**  
   全站使用 `localStorage.lang`（`en` / `zh`）。

5. **统一切换事件**  
   文案切换依赖 `circlelearn:langchange`，不要自建重复机制。

---

## 2. 团队成员修改页面文案时必须做什么

以下以“成员修改 `game` 页面文案”为例。

### 步骤 A：修改 HTML，改成 key 绑定

在 `game/game.html` 中：

- 对可见文本元素加 `data-i18n="xxx"`。
- 对 placeholder 文本加 `data-i18n-placeholder="xxx"`。
- 不要把中文或英文硬编码在页面里（保留英文默认值仅用于首屏兜底可接受）。

示例：

```html
<h3 data-i18n="game.slingshot.name">Gravity Slingshot</h3>
<input data-i18n-placeholder="contact.form.placeholder.name" placeholder="Your name">
```

### 步骤 B：同步更新词典文件

根据文案类型更新对应文件：

- 游戏玩法/分数/提示等：`js/data/game-i18n.js`
- 导航、设置、页脚、通用页面文案：`js/data/site-i18n.js`

新增 key 时必须同时补齐：

```js
'some.key': { zh: '中文文案', en: 'English text' }
```

或（site-i18n）：

```js
en: { 'some.key': 'English text' },
zh: { 'some.key': '中文文案' }
```

### 步骤 C：确认脚本已接入（新页面时）

新页面必须包含：

```html
<script src="../js/data/site-i18n.js"></script>
<script src="../js/utils.js"></script>
<script src="../js/main.js"></script>
```

若是 game 页，还应保留：

```html
<script src="../js/data/game-i18n.js"></script>
```

### 步骤 D：手动测试（提交前）

至少验证以下场景：

1. 在当前页点击设置中的语言开关，文案立即切换。
2. 跳转到其他页面，语言保持不变。
3. 刷新页面后语言保持不变。
4. 深色模式值（On/Off 或 开/关）与当前语言一致。
5. 页面上没有出现“key 原文”（例如 `home.hero.title`）暴露。

---

## 3. key 命名规范

统一采用：`页面.模块.语义`（小写 + 点分层）

示例：

- `nav.home`
- `settings.language`
- `home.hero.title`
- `game.slingshot.desc`
- `contact.form.message`

禁止：

- `title1`、`abc` 这类无语义命名
- 同义重复 key（如 `home.title` 和 `home.hero.title` 同时存在且含义一样）

---

## 4. 不允许的做法（高风险）

1. 在页面 JS 里再写一套独立语言存储键（如仅用 `pref_lang`）。  
2. 文案只改英文，不补中文。  
3. 在 HTML 里直接写死中文/英文且不加 `data-i18n`。  
4. 不经过词典，直接在业务脚本里 `el.textContent = 'xxx'`（除动态数值和运行态提示外）。  
5. 修改 `utils.js` 的语言事件协议但不通知团队。

---

## 5. Game 页面专用注意事项

1. `game/game.html` 中 `data-game-i18n` 由 `GameI18N.translatePage()` 负责。  
2. 画布内运行时文本（如命中反馈）通过 `GameI18N.t('key')` 获取。  
3. 如果新增游戏提示语：
   - 在 `js/data/game-i18n.js` 新增 key（中英都加）
   - 在 `js/pages/pi-sniper.js` / `js/pages/gravity-slingshot.js` 使用 `GameI18N.t(key)` 调用

---

## 6. 代码评审（PR）检查清单

- [ ] 新增/修改文案是否全部使用 `data-i18n` 或 `data-game-i18n`
- [ ] 对应 key 是否在词典中存在
- [ ] `en` / `zh` 是否都已补齐
- [ ] 是否复用 `localStorage.lang`
- [ ] 是否未破坏 `circlelearn:langchange` 事件链路
- [ ] 页面切换/刷新后的语言状态是否正确

---

## 7. 推荐提交流程（简版）

1. 改 HTML（加 key）  
2. 改词典（补中英）  
3. 本地切语言自测  
4. 提交 PR 并附测试截图（中英各一张）  
5. reviewer 按“PR 检查清单”验收

---

## 8. 维护建议

- 每次迭代结束后，清理未使用 key。  
- 后续可增加脚本自动校验：  
  - HTML 中出现的 key 在词典中是否存在  
  - 词典中 `en/zh` 是否缺失  
  - CI 中不通过则禁止合并

