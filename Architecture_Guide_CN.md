# 圆几何学习网站 - 项目结构说明

## 📌 项目概述

本项目为一个基于 **HTML + CSS + JavaScript（纯原生）** 实现的静态前端网站。

该结构设计目标：

* 结构清晰、易维护
* 支持团队协作开发
* 方便版本迭代（V1 → V4）

---

## 📁 项目结构

```id="z3k29p"
project/
├─ index.html
│  ├─ game/
│  │  ├─ game.html
│  ├─ quiz/
│  │  ├─ quiz.html  
├─ ├─ contact/
│  │  ├─ contact.html
│
├─ css/
│  ├─ reset.css   清除浏览器默认样式
│  ├─ variables.css  全局变量：颜色、字体、圆角...
│  ├─ base.css    基础样式：body...
│  ├─ layout.css  页面骨架：header、footer...
│  ├─ components/
│  │  ├─ buttons.css
│  │  ├─ cards.css
│  │  ├─ forms.css
│  │  └─ widgets.css
│  └─ pages/
│     ├─ home.css
│     ├─ game.css
│     ├─ quiz.css
│     └─ contact.css
│
├─ js/
│  ├─ main.js
│  ├─ utils.js
│  ├─ data/
│  │  ├─ circle-rules.js
│  │  └─ quiz-questions.js
│  └─ pages/
│     ├─ home.js
│     ├─ game.js
│     ├─ quiz.js
│     └─ contact.js
│
└─ assets/
   ├─ images/
   ├─ videos/
   └─ audio/
```

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

| 文件             | 作用       |
| -------------- | -------- |
| `index.html`   | 首页（入口）   |
| `game.html`    | 游戏模块     |
| `quiz.html`    | 测验模块     |
| `contact.html` | 联系页面（可选） |

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
| `cards.css`   | 卡片组件                             |
| `forms.css`   | 表单组件                             |
| `widgets.css` | 其他组件（面包屑、banner、chatbot、toggle等） |

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
| `game.js`    | 游戏逻辑 |
| `quiz.js`    | 测验逻辑 |
| `contact.js` | 表单处理 |

👉 每个页面逻辑独立，避免互相影响

---

### 🔹 数据层（data）

| 文件                  | 作用      |
| ------------------- | ------- |
| `circle-rules.js`   | 圆几何规则数据 |
| `quiz-questions.js` | 题库      |

👉 数据与逻辑分离，方便修改

---

## 🧩 资源文件（assets）

| 文件夹       | 内容    |
| --------- | ----- |
| `images/` | 图片、图标 |
| `videos/` | 视频    |
| `audio/`  | 音效    |

---

## 🔄 迭代开发规范（重点）

### 📌 新功能添加

| 情况   | 修改位置                           |
| ---- | ------------------------------ |
| 新页面  | 新建 HTML + pages.css + pages.js |
| 新组件  | `components/`                  |
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


