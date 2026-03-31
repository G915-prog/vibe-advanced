# vibe-advanced
Advanced vibecoding course

---

## Changelog

### 2026-03-31 — Added Module 2 and Vercel SPA fix
- Created `src/pages/Module2.jsx` page component
- Added `/module/2` route in `App.jsx`
- Added `vercel.json` with rewrite rule to fix 404 on page reload for all SPA routes

### 2026-03-31 — React Router cleanup
- Refactored `App.jsx` to be router-only (`BrowserRouter` + `Routes` + `Route`, nothing else)
- Moved theme init out of `App.jsx` `useEffect` into a plain script line in `main.jsx`
- Removed `BrowserRouter` from `main.jsx` (now lives in `App.jsx`)
- Updated module route from `/module-1` to `/module/1`
- Replaced all remaining `<a href>` tags with React Router `<Link to>` in `Header.jsx` and `Module1.jsx`
- No page now causes a full browser reload on internal navigation

### 2026-03-30 — Fix Vercel build (Permission denied)
- Added `.gitignore` to exclude `node_modules/`, `dist/`, and `.env` files
- Removed `node_modules` from git tracking (`git rm --cached`) — it was committed from Windows, stripping Linux execute permissions from the vite binary

### 2026-03-30 — Converted to Vite + React app
- Scaffolded full Vite + React project (`package.json`, `vite.config.js`, `src/`)
- Set up React Router v6 — `/` for Home, `/module-1` for Module 1
- Shared `Header` component with `variant` prop (home vs module layout)
- `useTheme` hook centralises dark mode logic across all pages
- `Home.jsx` — progress bar, module grid, flow diagram, projects and stack all in React state
- `Module1.jsx` — lessons, quiz and prompt cards converted to React components
- `PromptCard` component with working clipboard copy button
- `CodeBlock` component preserving syntax-highlighted HTML
- Quiz fully in React state (no more DOM manipulation)
- All styles merged into a single `src/index.css`

### 2026-03-29 — Dark mode (`index.html`, `module-1.html`)
- Added warm dark theme (`#1e1c18` background, not pure black) to both pages
- Toggle button in each header (`☽ dark` / `☀ light`)
- Theme preference shared between pages via `localStorage`
- Code blocks in module-1 stay dark regardless of theme
