# SPEC — Eisenhower Matrix MVP

## Goal
A fast, no-login, single-page Eisenhower Matrix tool that helps users sort tasks by urgency and importance. Tasks persist locally in the browser.

## Pages
- `index.html` (interactive tool homepage)
- `quadrants.html` (4 quadrants explainer)
- `urgent-vs-important.html` (concept page + FAQ)
- `examples.html` (sample matrices)
- `about.html` (short about page)
- `privacy.html` (privacy summary page)

## Features

### 1. Matrix UI
- 2x2 grid on desktop/tablet.
- Each quadrant has a title + subtitle:
  - Do First — Urgent + Important
  - Schedule — Not Urgent + Important
  - Delegate — Urgent + Not Important
  - Eliminate — Not Urgent + Not Important

### 2. Tasks
- Add task:
  - User can add a task into a specific quadrant quickly.
- Edit task:
  - Click task text to edit inline.
  - Enter saves, Esc cancels.
- Delete task:
  - Small delete control per task.
- Move task:
  - Drag-and-drop between quadrants.

### 3. Persistence
- Save state on every change (debounced).
- Restore state on page load.
- “Clear all tasks” button with confirmation.

### 4. Mobile
- At narrow widths, quadrants stack vertically in this order:
  1) Do First
  2) Schedule
  3) Delegate
  4) Eliminate

### 5. SEO + copy (minimal)
- Title: includes “Eisenhower Matrix”
- H1: “Eisenhower Matrix”
- Short description below the tool (a few paragraphs max).
- Supporting pages include unique title, meta description, canonical, and WebPage JSON-LD.
- `urgent-vs-important.html` includes on-page FAQ + FAQPage JSON-LD.
- Shared internal links connect homepage and supporting pages.

## Non-goals (explicitly out of scope)
- Accounts / login
- Cloud sync
- Collaboration
- Reminders / notifications
- Complex tagging, due dates, or scheduling system
- Multi-board support (unless trivially added without complexity)

## Acceptance criteria
- Open `index.html` locally: tool works.
- Add/edit/delete/move tasks works with no console errors.
- Refresh page: tasks persist.
- Mobile width ~390px: layout is usable and touch-friendly.
