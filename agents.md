# agents.md

## Project
A static Eisenhower Matrix tool (Urgent vs Important) with local-only persistence (no backend), plus supporting SEO/content pages.

## Non-negotiables
- Static site only: HTML/CSS/Vanilla JS.
- No accounts, logins, backend, database, analytics, or tracking by default.
- Must work by opening `index.html` locally (no build step required).
- Keep the tool above the fold on desktop; immediate usability.
- Keep scope tight. Prefer shipping a clean MVP over adding features.

## Core features
- 2x2 matrix with four quadrants:
  - Do First (Urgent + Important)
  - Schedule (Not Urgent + Important)
  - Delegate (Urgent + Not Important)
  - Eliminate (Not Urgent + Not Important)
- Tasks:
  - Add
  - Edit inline (Enter saves, Esc cancels)
  - Delete
  - Mark as done (button and 1-second hold shortcut)
  - Move between quadrants (drag-and-drop preferred; must have non-drag fallback)
- Persistence:
  - Save tasks in localStorage
  - Restore on load
  - “Clear all” with confirmation

## Libraries
- Prefer no dependencies.
- If drag-and-drop is needed, SortableJS via CDN is allowed.
- If SortableJS is used, ensure a fallback “Move to…” option exists.

## Data model (suggested)
Store a single JSON object in localStorage:
- key: `eisenhower_matrix_v1`
- value:
  - `version`
  - `updatedAt`
  - `tasks`: array of `{ id, text, quadrant, completed, createdAt, updatedAt }`

Quadrant IDs:
- `do_first`, `schedule`, `delegate`, `eliminate`

## UX rules
- No onboarding screens.
- No long explanations above the tool.
- Use simple, direct labels.
- Mobile: stack quadrants vertically in order: Do First, Schedule, Delegate, Eliminate.

## File structure (current)
- `index.html` (tool)
- `quadrants.html`
- `urgent-vs-important.html`
- `examples.html`
- `about.html`
- `privacy.html`
- `styles.css`
- `app.js`

## Changes
If you change architecture, file structure, or storage format:
- Update SPEC.md
- Update README.md
- Update this agents.md
