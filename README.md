# vibe-advanced
Advanced vibecoding course

---

## Changelog

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
