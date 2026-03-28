# ✦ Weekly Planner

A beautiful, feature-rich weekly planner web app — runs entirely in the browser with no backend or dependencies required.

![Weekly Planner](https://img.shields.io/badge/HTML%20%2B%20CSS%20%2B%20JS-pure%20vanilla-blue?style=flat-square)
![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen?style=flat-square)
![localStorage](https://img.shields.io/badge/storage-localStorage-orange?style=flat-square)

---

## ✨ Features

### 🗓️ Weekly Calendar View
- 7-day grid (Mon–Sun) with hourly time slots from 5 AM to 11 PM
- Sticky day headers with per-day goal inputs
- Current-time red indicator line (updates every minute)
- Week navigation with keyboard shortcuts

### ➕ Task Management
- **Click any empty slot** to create a task at that exact time
- **Drag & drop** tasks to reschedule across days and time slots (snaps to 30-min intervals)
- **Single-click** a task to cycle status: `Planned → In Progress → Done`
- **Double-click** to edit task details
- Color-coded categories: 💼 Work · 🏠 Personal · 💪 Health · ✨ Other
- Priority stars (⭐) for high-importance tasks
- **Subtasks** with progress bar shown on the task card
- **Notes** field for extra context

### ⚡ Quick Capture (Inbox)
- Natural language input: type `"dentist tomorrow 3pm 1h"` and the date/time/duration are auto-parsed
- Unscheduled tasks land in the **Inbox** tray
- Drag tasks from Inbox onto the calendar, or click **Schedule**

### 🍅 Pomodoro Timer
- Floating circular timer widget (bottom-right corner)
- 25-min focus / 5-min break cycle
- Animated SVG progress ring
- Browser notifications when sessions end
- Collapsible to a small icon

### 🔥 Habit Tracker
- Add daily habits and check them off each day of the week
- Streak counter (🔥 N) for consecutive days
- Per-week tracking stored automatically

### 📊 Weekly Analytics
- **Donut chart** — time breakdown by category
- **Bar chart** — daily task completion rates
- **Insight cards** — peak productive hour, completion %, day streak

### 🎨 Themes & Dark Mode
5 built-in color themes (one click to switch):
| Theme | Vibe |
|---|---|
| ✦ Nebula | Cool blue-purple (default) |
| 🌿 Forest | Deep emerald greens |
| 🌅 Sunset | Warm coral-orange |
| 🌙 Midnight | Dark with electric cyan |
| 🌸 Rose Gold | Warm pink-gold |

Plus a **🌙 dark mode** toggle that works on top of any theme.

### 📝 Weekly Goals & Summary
- Editable **Week Goals** and **Weekly Summary** text areas
- Content saved per-week — switches automatically when you navigate weeks

---

## 🚀 Getting Started

1. **Clone or download** this repository
2. **Open `index.html`** in any modern browser (Chrome, Safari, Firefox, Edge)
3. That's it — no installation, no server needed

```bash
git clone https://github.com/hl3750/my-todo-app.git
cd my-todo-app
open index.html   # macOS
# or just double-click index.html in your file explorer
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `N` | Open New Task modal |
| `←` / `→` | Previous / next week |
| `T` | Jump to current week |
| `Esc` | Close any open modal |

---

## 📁 File Structure

```
my-todo-app/
├── index.html    # App structure, all modals, Pomodoro widget
├── style.css     # Design system: themes, glassmorphism, animations
├── app.js        # Core logic: state, rendering, tasks, drag-drop
├── features.js   # Modules: Pomodoro timer, Habit tracker, Analytics
└── README.md     # This file
```

---

## 💾 Data Storage

All data is saved to **localStorage** in your browser — nothing is sent to any server. Data persists across page refreshes and browser restarts. Clearing browser data will erase your tasks.

---

## 🛠️ Tech Stack

- **Pure HTML + CSS + JavaScript** — zero frameworks, zero dependencies
- **CSS custom properties** for theming
- **CSS backdrop-filter** for glassmorphism effects
- **HTML5 Drag and Drop API** for rescheduling
- **Web Notifications API** for Pomodoro alerts
- **localStorage** for persistence
- [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) (Google Fonts) for typography

---

## 📸 How to Use

### Adding a task
1. Click **＋ New Task** in the header, OR
2. Click any empty time slot on the calendar

### Quick capture
Type in the sidebar's quick-add box using natural language:
- `"meeting tomorrow 2pm 1h"` → schedules for tomorrow at 14:00 for 1 hour
- `"gym friday 7am 45min"` → schedules for Friday at 07:00 for 45 minutes
- `"dentist"` (no time) → goes to Inbox for later scheduling

### Rescheduling
Drag any task card to a new time slot or different day.

### Tracking progress
Click a task once to cycle through: **Planned → In Progress → Done**.
When all tasks on a day are marked Done → 🎉 confetti!

---

## 🤝 Contributing

Feel free to open issues or pull requests. This is a personal project but improvements are welcome!

---

*Built with ❤️ — runs in your browser, stores in your browser, stays yours.*
