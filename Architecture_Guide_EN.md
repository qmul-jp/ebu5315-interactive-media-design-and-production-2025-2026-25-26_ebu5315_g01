# Circle Geometry Website - Project Structure Guide

## 📌 Overview

This project is a **static front-end website** built using **plain HTML, CSS, and JavaScript**.

The architecture is designed to be:

* Clear and maintainable
* Suitable for team collaboration
* Easy to extend across multiple versions (V1 → V4)

---

## 📁 Project Structure (aligned with the current repository)

> The tree below reflects the **actual** main files and folders in the repo. Subpages live in their own folders and reference shared `css/`, `js/`, and `assets/` via relative paths.

```
project/
├─ index.html                    # Homepage (site entry)
├─ README.md
├─ Architecture_Guide_CN.md      # Architecture guide (Chinese)
├─ Architecture_Guide_EN.md      # This file (English)
│
├─ game/
│  └─ game.html                  # Game module page
│
├─ quiz/
│  └─ quiz.html                  # Quiz module page (standalone layout, shared site styles)
│
├─ contact/
│  └─ contact.html               # Contact page
│
├─ css/
│  ├─ reset.css                  # Browser reset
│  ├─ variables.css              # Global variables (colors, grayscale, dark mode)
│  ├─ base.css                   # Base styles (body, container, etc.)
│  ├─ layout.css                 # Shell layout (header, footer, nav, sections)
│  ├─ components/
│  │  ├─ buttons.css             # Buttons
│  │  ├─ cards.css               # Cards / themed blocks
│  │  ├─ forms.css               # Forms
│  │  └─ widgets.css             # Misc (floating chat, banners, etc.)
│  └─ pages/
│     ├─ home.css                # Homepage only
│     ├─ game.css                # Game page only
│     ├─ quiz.css                # Quiz page only (includes dashboard extras)
│     └─ contact.css             # Contact page only
│
├─ js/
│  ├─ main.js                    # Global init (settings menu, theme, language, etc.)
│  ├─ utils.js                   # Helpers (theme, language, anchors, ripples, etc.)
│  ├─ data/
│  │  ├─ circle-rules.js         # Circle geometry rules data
│  │  ├─ quiz-questions.js       # Quiz bank (used by quiz.js and related code)
│  │  ├─ game-i18n.js            # Game copy / i18n data (when used)
│  │  └─ game-audio.js           # Game audio mapping / config (when used)
│  └─ pages/
│     ├─ home.js                 # Homepage interactions
│     ├─ game.js                 # Main game logic
│     ├─ pi-sniper.js            # Game sub-module (used with game)
│     ├─ gravity-slingshot.js    # Game sub-module (used with game)
│     ├─ quiz.js                 # Quiz logic (renders when #quizRoot exists)
│     └─ contact.js              # Contact form, etc.
│
└─ assets/
   └─ images/
      └─ homepage/               # Images for homepage and content (theorems, decorations)
      # videos/ and audio/ can be added as needed; images are the main asset type today
```

### Quiz module (easy to confuse)

| Entry | Description |
| ----- | ----------- |
| `quiz/quiz.html` | Standalone quiz HTML; loads site-wide `css/`, `js/main.js`, `js/utils.js`; UI is mainly defined in the page plus `css/pages/quiz.css`. |
| `js/pages/quiz.js` + `js/data/quiz-questions.js` | Injects questions and scoring **only when** the page contains `id="quizRoot"` and loads these scripts; otherwise it does nothing. |

When adding questions, prefer editing **`js/data/quiz-questions.js`** and keep the object shape compatible with `quiz.js`.

---

## 🧠 Architecture Principles

### 1. Separation of Concerns

* **HTML** → structure
* **CSS** → presentation and layout
* **JS** → behavior and logic

---

### 2. Layered CSS

| Layer      | Role |
| ---------- | ---- |
| `base`     | Global foundation |
| `layout`   | Page shell |
| `components` | Reusable UI |
| `pages`    | Page-specific overrides |

---

### 3. Low Coupling

* Pages should not depend on each other’s markup
* Shared styling lives in `components/` and global layers
* Avoid copy-paste across pages

---

## 📄 HTML Files

| Path | Purpose |
| ---- | ------- |
| `index.html` | Homepage (entry) |
| `game/game.html` | Game module |
| `quiz/quiz.html` | Quiz module |
| `contact/contact.html` | Contact page |

Subpages use paths like `../css/...` and `../js/...`. From `quiz/`, link to the homepage with `../index.html` (and `#home` anchors if needed).

---

## 🎨 CSS Structure

### Base Layer

| File            | Purpose                                    |
| --------------- | ------------------------------------------ |
| `reset.css`     | Removes browser default styles             |
| `variables.css` | Global variables (colors, spacing, etc.) |
| `base.css`      | Global styles (body, typography, links)    |

---

### Layout Layer

| File         | Purpose                                                       |
| ------------ | ------------------------------------------------------------- |
| `layout.css` | Shell layout (header, footer, sections, container) |

👉 Only structural layout belongs here.

---

### Components Layer (`css/components/`)

Reusable UI across pages.

| File          | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `buttons.css` | Button styles                                          |
| `cards.css`   | Card / themed layouts                                  |
| `forms.css`   | Form elements                                          |
| `widgets.css` | Misc (floating chat, banners, quick questions, etc.)     |

👉 Rule: if used on multiple pages → put it here.

---

### Page-Specific Styles (`css/pages/`)

| File          | Purpose              |
| ------------- | -------------------- |
| `home.css`    | Homepage-only styles |
| `game.css`    | Game-specific styles |
| `quiz.css`    | Quiz-specific styles |
| `contact.css` | Contact page styles  |

👉 Rule: only styles unique to that page go here.

---

## ⚙️ JavaScript Structure

### Core Files

| File       | Purpose            |
| ---------- | ------------------ |
| `main.js`  | App initialization |
| `utils.js` | Helper functions   |

---

### Page Logic (`js/pages/`)

| File         | Purpose                                         |
| ------------ | ----------------------------------------------- |
| `home.js`    | Homepage interactions                           |
| `game.js`    | Main game logic                                 |
| `pi-sniper.js` | Game sub-module                               |
| `gravity-slingshot.js` | Game sub-module                               |
| `quiz.js`    | Quiz logic (depends on `quiz-questions.js` and a mount point) |
| `contact.js` | Form handling                                   |

👉 Each page manages its own logic; game scripts are loaded from `game.html` as needed.

---

### Data Layer (`js/data/`)

| File                | Purpose             |
| ------------------- | ------------------- |
| `circle-rules.js`   | Geometry rules data |
| `quiz-questions.js` | Quiz question bank  |
| `game-i18n.js`      | Game i18n / copy data |
| `game-audio.js`     | Game audio mapping / config |

👉 Keep data separate from logic for easier updates.

---

## 🧩 Assets

| Path | Purpose |
| ---- | ------- |
| `assets/images/homepage/` | Images for the homepage and content (theorem diagrams, decorations) |
| `assets/videos/`, `assets/audio/` | Optional; add when the project needs them |

---

## 🔄 Update & Iteration Guidelines

### When adding new features

| Situation        | Where to modify |
| ---------------- | --------------- |
| New page         | New HTML + `css/pages/` + `js/pages/` |
| New reusable UI  | `css/components/` |
| Page feature     | `js/pages/` |
| New data         | `js/data/` |

---

### When modifying existing features

* Prefer editing `pages/` layers first
* Avoid changing global styles unless necessary
* Shared components must stay reusable

---

## 👥 Team Collaboration Guide

Suggested division:

| Role     | Area |
| -------- | ---- |
| A        | Homepage (`index`) |
| B        | Game |
| C        | Quiz |

Typical ownership:

* HTML in each section
* `css/pages/`
* `js/pages/`

Shared files (coordinate changes):

* `layout.css`
* `components/`
* `variables.css`

---

## ⚠️ Best Practices

* Do NOT duplicate styles → reuse components
* Do NOT put page-only styles into global files
* Keep commits small and messages clear
* Keep naming consistent

---

## ✅ Key Philosophy

> **Stable core, flexible pages**

* Global styles = stable foundation
* Page styles = flexible and evolving

---

## 🚀 Summary

This structure ensures:

* Clear separation of responsibilities
* Easy collaboration
* Smooth iteration across versions
* Maintainable and scalable design

---
