# 圆几何学习网站 - 项目结构说明

## 📌 项目概述

本项目为一个基于 **HTML + CSS + JavaScript（纯原生）** 实现的静态前端网站。

该结构设计目标：

* 结构清晰、易维护
* 支持团队协作开发
* 方便版本迭代（V1 → V4）

---

## 📁 项目结构（与当前仓库一致）

> 下列树形结构反映仓库内**实际存在的**主要文件与目录；子页面 HTML 位于独立文件夹，通过相对路径引用根目录下的 `css/`、`js/`、`assets/`。

```
project/
├─ index.html                 # 首页（站点入口）
├─ README.md
├─ Architecture_Guide_CN.md # 本文件（中文架构说明）
├─ Architecture_Guide_EN.md   # 英文架构说明（若存在）
│
├─ game/
│  └─ game.html               # 游戏模块页面
│
├─ quiz/
│  └─ quiz.html               # 测验模块页面（独立布局，与全站样式复用）
│
├─ contact/
│  └─ contact.html            # 联系页面
│
├─ css/
│  ├─ reset.css               # 清除浏览器默认样式
│  ├─ variables.css           # 全局变量：颜色、灰阶、深色模式等
│  ├─ base.css                # 基础样式：body、容器等
│  ├─ layout.css              # 页面骨架：header、footer、nav、section 等
│  ├─ components/
│  │  ├─ buttons.css          # 按钮
│  │  ├─ cards.css            # 卡片相关（含部分专题样式）
│  │  ├─ forms.css            # 表单
│  │  └─ widgets.css          # 杂项组件（聊天浮标、横幅等）
│  └─ pages/
│     ├─ home.css             # 首页专属
│     ├─ game.css             # 游戏页专属
│     ├─ quiz.css             # 测验页专属（含测验仪表盘补充样式）
│     └─ contact.css          # 联系页专属
│
├─ js/
│  ├─ main.js                 # 全局初始化（设置菜单、主题、语言等）
│  ├─ utils.js                # 工具函数（主题、语言、锚点、涟漪等）
│  ├─ data/
│  │  ├─ circle-rules.js      # 圆几何规则数据
│  │  ├─ quiz-questions.js    # 测验题库（供 quiz.js 等使用）
│  │  ├─ game-i18n.js         # 游戏内文案/国际化数据（若使用）
│  │  └─ game-audio.js        # 游戏音效相关数据/配置（若使用）
│  └─ pages/
│     ├─ home.js              # 首页交互
│     ├─ game.js              # 游戏主逻辑
│     ├─ pi-sniper.js         # 游戏子模块（与 game 配合）
│     ├─ gravity-slingshot.js  # 游戏子模块（与 game 配合）
│     ├─ quiz.js              # 测验逻辑（挂载 #quizRoot 时渲染题库）
│     └─ contact.js           # 联系页表单等
│
└─ assets/
   └─ images/
      └─ homepage/            # 首页与展示用图片资源（定理示意图、装饰图等）
      # videos/、audio/ 可按需在仓库中补充，当前以 images 为主
```

### 测验模块说明（易混点）

| 入口 | 说明 |
| ---- | ---- |
| `quiz/quiz.html` | 独立测验页 HTML，引用全站 `css/`、`js/main.js`、`js/utils.js`，测验 UI 与样式主要在页面与 `css/pages/quiz.css` 中维护。 |
| `js/pages/quiz.js` + `js/data/quiz-questions.js` | 在**存在** `id="quizRoot"` 的页面中注入题目与判分；若某 HTML 未放置该节点或未引入脚本，则不会执行。 |

新增题目时优先改 **`js/data/quiz-questions.js`**，并保证与 `quiz.js` 所期望的数据结构一致。

---

## 🧠 架构设计原则

### 1️⃣ 职责分离

* HTML：页面结构
* CSS：样式与布局
* JS：交互与逻辑

---

### 2️⃣ 分层设计（CSS）

| 层级         | 作用     |
| ---------- | ------ |
| base       | 全局基础样式 |
| layout     | 页面整体布局 |
| components | 可复用组件  |
| pages      | 页面专属样式 |

---

### 3️⃣ 低耦合

* 页面之间互不影响
* 公共样式集中管理
* 避免重复代码

---

## 📄 HTML 文件说明

| 路径 | 作用 |
| ---- | ---- |
| `index.html` | 首页（入口） |
| `game/game.html` | 游戏模块 |
| `quiz/quiz.html` | 测验模块 |
| `contact/contact.html` | 联系页面 |

子页面通过 `../css/...`、`../js/...` 引用公共资源；站内链接需注意相对路径层级（例如在 `quiz/` 内指向首页用 `../index.html`）。

---

## 🎨 CSS 文件说明

### 🔹 基础层（base）

| 文件              | 作用                |
| --------------- | ----------------- |
| `reset.css`     | 清除浏览器默认样式         |
| `variables.css` | 全局变量（颜色、间距、圆角等）   |
| `base.css`      | 基础样式（body、字体、链接等） |

---

### 🔹 布局层（layout）

| 文件           | 作用                                    |
| ------------ | ------------------------------------- |
| `layout.css` | 页面骨架（header、footer、section、container） |

👉 只放“结构布局”，不放具体组件样式

---

### 🔹 组件层（components）

> 用于存放可复用样式（本项目必须保留）

| 文件            | 作用                               |
| ------------- | -------------------------------- |
| `buttons.css` | 按钮样式                             |
| `cards.css`   | 卡片与专题卡片相关样式                       |
| `forms.css`   | 表单组件                             |
| `widgets.css` | 其他组件（聊天浮标、横幅、快捷问题等） |

👉 原则：多个页面使用 → 放这里

---

### 🔹 页面层（pages）

| 文件            | 作用     |
| ------------- | ------ |
| `home.css`    | 首页样式   |
| `game.css`    | 游戏页面样式 |
| `quiz.css`    | 测验页面样式 |
| `contact.css` | 联系页面样式 |

👉 原则：只写该页面特有样式

---

## ⚙️ JavaScript 文件说明

### 🔹 核心文件

| 文件         | 作用    |
| ---------- | ----- |
| `main.js`  | 全局初始化 |
| `utils.js` | 工具函数  |

---

### 🔹 页面逻辑（pages）

| 文件           | 作用   |
| ------------ | ---- |
| `home.js`    | 首页交互 |
| `game.js`    | 游戏主逻辑 |
| `pi-sniper.js` | 游戏子模块 |
| `gravity-slingshot.js` | 游戏子模块 |
| `quiz.js`    | 测验逻辑（依赖 `quiz-questions.js` 与页面中的挂载点） |
| `contact.js` | 表单处理 |

👉 每个页面逻辑独立，避免互相影响；游戏相关脚本由 `game.html` 按需引入。

---

### 🔹 数据层（data）

| 文件                  | 作用      |
| ------------------- | ------- |
| `circle-rules.js`   | 圆几何规则数据 |
| `quiz-questions.js` | 测验题库      |
| `game-i18n.js`      | 游戏国际化/文案数据 |
| `game-audio.js`     | 游戏音效配置或映射 |

👉 数据与逻辑分离，方便修改与扩展

---

## 🧩 资源文件（assets）

| 路径 | 内容 |
| ---- | ---- |
| `assets/images/homepage/` | 首页与内容展示用图片（定理图、装饰图等） |
| `assets/videos/`、`assets/audio/` | 可按项目需要增补；当前仓库以图片资源为主 |

---

## 🔄 迭代开发规范（重点）

### 📌 新功能添加

| 情况   | 修改位置                           |
| ---- | ------------------------------ |
| 新页面  | 新建 HTML + `css/pages/` + `js/pages/` |
| 新组件  | `css/components/`                  |
| 页面功能 | `js/pages/`                    |
| 新数据  | `js/data/`                     |

---

### 📌 修改已有功能

* 优先修改 `pages/` 层
* 避免直接修改全局样式
* 公共组件修改需谨慎

---

## 👥 团队协作建议

推荐分工：

| 成员 | 负责内容      |
| -- | --------- |
| A  | 首页（index） |
| B  | Game      |
| C  | Quiz      |

各自主要修改：

* HTML 页面
* `css/pages/`
* `js/pages/`

公共文件需统一规范：

* `layout.css`
* `components/`
* `variables.css`

---

## ⚠️ 开发规范（必须遵守）

* 不重复写样式（优先复用组件）
* 不把页面样式写到全局文件
* 提交记录清晰（Git）

---

## 🧠 核心设计思想

> 稳定核心 + 灵活页面

* 全局样式稳定
* 页面样式可快速迭代

---

## 🚀 总结

该结构保证：

* 清晰的模块划分
* 高效团队协作
* 易扩展的版本迭代
* 良好的代码可维护性

---
