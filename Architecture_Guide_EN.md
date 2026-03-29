# Circle Geometry Website - Project Structure Guide

## 📌 Overview

This project is a **static front-end website** built using **HTML, CSS, and JavaScript only**.
The architecture is designed to be:

* Clear and maintainable
* Suitable for team collaboration
* Easy to extend across multiple versions (V1 → V4)

---

## 📁 Project Structure

```
project/
├─ index.html
├─ game.html
├─ quiz.html
├─ contact.html
│
├─ css/
│  ├─ reset.css
│  ├─ variables.css
│  ├─ base.css
│  ├─ layout.css
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

## 🧠 Architecture Principles

### 1. Separation of Concerns

* **HTML → structure**
* **CSS → style**
* **JS → behavior**

### 2. Layered CSS Design

* `base` → global rules
* `layout` → page structure
* `components` → reusable styles
* `pages` → page-specific styles

### 3. Minimize Coupling

* Page styles should not affect other pages
* Shared styles must go into `components`

---

## 📄 HTML Files

| File           | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `index.html`   | Homepage (entry point)                         |
| `game.html`    | Interactive game section                       |
| `quiz.html`    | Quiz and assessment section                    |
| `contact.html` | Contact page (optional if already in homepage) |

---

## 🎨 CSS Structure

### Base Layer

| File            | Purpose                                    |
| --------------- | ------------------------------------------ |
| `reset.css`     | Removes browser default styles             |
| `variables.css` | Global variables (colors, spacing, radius) |
| `base.css`      | Global styles (body, typography, links)    |

---

### Layout Layer

| File         | Purpose                                                       |
| ------------ | ------------------------------------------------------------- |
| `layout.css` | Global layout structure (header, footer, sections, container) |

👉 Only layout-related styles belong here.

---

### Components Layer (`css/components/`)

Reusable UI elements across pages.

| File          | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `buttons.css` | Button styles (primary, secondary, outline)            |
| `cards.css`   | Card layouts (feature cards, theorem cards)            |
| `forms.css`   | Form elements (inputs, labels, textarea)               |
| `widgets.css` | Misc components (breadcrumb, banner, chatbot, toggles) |

👉 Rule: If used in multiple pages → put here.

---

### Page-Specific Styles (`css/pages/`)

| File          | Purpose              |
| ------------- | -------------------- |
| `home.css`    | Homepage-only styles |
| `game.css`    | Game-specific styles |
| `quiz.css`    | Quiz-specific styles |
| `contact.css` | Contact page styles  |

👉 Rule: Only styles unique to that page go here.

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
| `home.js`    | Homepage interactions (animations, UI behavior) |
| `game.js`    | Game logic                                      |
| `quiz.js`    | Quiz logic (questions, scoring)                 |
| `contact.js` | Form handling                                   |

👉 Each page manages its own logic independently.

---

### Data Layer (`js/data/`)

| File                | Purpose             |
| ------------------- | ------------------- |
| `circle-rules.js`   | Geometry rules data |
| `quiz-questions.js` | Quiz question bank  |

👉 Keep data separate from logic for easier updates.

---

## 🧩 Assets

| Folder    | Purpose                     |
| --------- | --------------------------- |
| `images/` | Icons, illustrations, logos |
| `videos/` | Hero animations or demos    |
| `audio/`  | Optional sound effects      |

---

## 🔄 Update & Iteration Guidelines

### When adding new features:

| Situation             | Where to modify            |
| --------------------- | -------------------------- |
| New page layout       | `layout.css`               |
| New reusable UI       | `components/`              |
| Page-specific feature | `css/pages/` + `js/pages/` |
| New data              | `js/data/`                 |

---

### When modifying existing features:

* Avoid editing global styles unless necessary
* Prefer overriding styles in `pages/`
* Keep components reusable

---

## 👥 Team Collaboration Guide

Suggested division:

| Role     | Files to focus on                   |
| -------- | ----------------------------------- |
| Homepage | `index.html`, `home.css`, `home.js` |
| Game     | `game.html`, `game.css`, `game.js`  |
| Quiz     | `quiz.html`, `quiz.css`, `quiz.js`  |

Shared files:

* `variables.css`
* `layout.css`
* `components/`
* `main.js`

---

## ⚠️ Best Practices

* Do NOT duplicate styles → reuse components
* Do NOT mix page-specific styles into global files
* Keep commits small and incremental
* Keep naming consistent

---

## ✅ Key Philosophy

> **Stable core, flexible pages**

* Global styles = stable foundation
* Page styles = flexible and evolving

---

## 🚀 Summary

This structure ensures:

* Clean separation of responsibilities
* Easy collaboration
* Smooth iteration across versions
* Maintainable and scalable design

---
