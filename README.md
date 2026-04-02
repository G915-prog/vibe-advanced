# vibe-advanced
Advanced vibecoding course

---

## Changelog

### v4.0.2 — 2026-04-02 — TriviaDemo: retry on fetch error
- Added `retryCount` state; "Try again" button shown in error state increments it; `retryCount` added to `useEffect` dependency array so the fetch re-runs on each retry

### v4.0.1 — 2026-04-02 — Extract TriviaDemo to component
- Created `src/components/TriviaDemo.jsx` — moved inline `TriviaDemo` and `shuffle` out of `Module4.jsx` into a standalone exported component
- `Module4.jsx` — removed inline component and `useEffect` import; added `import TriviaDemo from '../components/TriviaDemo'`

### v4.0.0 — 2026-04-02 — Module 4: API Integration
- Created `src/pages/Module4.jsx` — 6 lessons (REST APIs, env vars, async patterns, calling a public API, defensive response handling, useFetch hook), 6 exercises, 5-question quiz, 6 prompt templates, two-part capstone, live TriviaDemo widget
- `App.jsx` — added `/module/4` route wrapped in `ProtectedRoute`; imported `Module4`
- `Home.jsx` — Module 4 card (`id: 4`) already linked to `/module/4`
- `Module3.jsx` — updated ModuleNav `next` to point to `/module/4` instead of `#`

### v3.2.1 — 2026-04-02 — Remove window.supabase debug leak
- Removed `window.supabase = supabase` from `src/lib/supabase.js` — debug line that exposed the Supabase client on the global object, allowing anyone with DevTools access to query the database directly

### v3.2.0 — 2026-04-01 — Supabase Auth
- Created `src/context/AuthContext.jsx` — `AuthProvider` wraps the app; `useAuth()` hook exposes `user`, `loading`, `signUp`, `signIn`, `signOut`; uses `getSession()` on mount + `onAuthStateChange` to stay in sync
- Created `src/components/ProtectedRoute.jsx` — renders `null` while loading (no flash), redirects to `/login` with `replace` if no session
- Created `src/pages/Login.jsx` — email/password form with separate Sign in / Create account buttons; shows inline error and success messages; matches existing design system
- `App.jsx` — wrapped with `AuthProvider`; added `/login` route; module routes (`/module/1–3`) wrapped with `ProtectedRoute`
- `Header.jsx` — added `useAuth`; shows "Sign out" button when authenticated, "Sign in" link when not; wrapped in `.header-actions` flex container
- `index.css` — added `.header-actions`, `.auth-btn`, `.login-page`, `.login-form`, `.form-field`, `.form-input`, `.btn-primary`, `.btn-secondary`, `.auth-error`, `.auth-message` CSS blocks; dark mode override for `.form-input`

### v3.1.1 — 2026-04-01 — useProgress: realtime in-place state updates
- Replaced re-fetch-on-change realtime callback with in-place state updates for INSERT, UPDATE, DELETE events — no round-trip on each change
- INSERT appends `payload.new` to rows; UPDATE replaces by `id`; DELETE filters out by `payload.old.id`
- Cleanup comment added explaining why `removeChannel` is required on unmount

### v3.1.0 — 2026-04-01 — Supabase client + useProgress rewrite
- Installed `@supabase/supabase-js`
- Created `src/lib/supabase.js` — initialises client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars; exports named `supabase` client
- `useProgress` now fetches `module_progress` rows from Supabase on mount for the current authenticated user
- Exposes `data` (raw rows), `loading`, `error` alongside the existing `progress` map — backward-compatible with all current components
- `markComplete(moduleNum)` upserts a row (`completed=true`, sets `completed_at`) using the `user_id,module_num` unique constraint
- `markIncomplete(moduleNum)` updates the row to `completed=false`, clears `completed_at`
- Exposes low-level `insert`, `update`, `deleteRow` helpers for direct row operations
- Subscribes to realtime `postgres_changes` on `module_progress` and re-fetches on any change; unsubscribes on unmount via `useEffect` cleanup

### v3.0.2 — 2026-04-01 — Fix Header nav: wire 03 Supabase to /module/3
- `Header.jsx` — `03 Supabase` NavLink changed from `#` to `/module/3`; fixes breadcrumb navigation and active styling on all module pages

### v3.0.1 — 2026-04-01 — Module 3: merge parallel lesson arrays into single LESSONS array
- Merged `LESSON_TITLES`, `LESSON_CONTENT`, and `EXERCISES` into a single `LESSONS` array — each object now owns its `title`, content fields, and `exercise` together, making it impossible to desync them by reordering
- Removed the now-redundant standalone `EXERCISES` array
- Updated lesson tab render, `current` lookup, and `ExerciseCard` props to read from `LESSONS`

### v3.0.0 — 2026-04-01 — Module 3: Supabase Database
- Created `src/pages/Module3.jsx` using shared components throughout
- Replaced custom header with `<Header variant="module" />`
- Replaced custom quiz implementation with shared `<Quiz>` component — normalized QUIZ data to match shared format (`id`, `num`, `total`, `correctKey`, `options[{key,text}]`, `explanation`)
- Replaced inline prompt cards with shared `<PromptCard>` — passes `technique` as `tag` prop
- Replaced local `ExerciseCard` function with shared `ExerciseCard` component
- Replaced coming-up teaser with `<ComingUp kicker title desc />`
- Replaced custom bottom nav with `<ModuleNav>`
- Replaced inline code blocks with `<CodeBlock lang={...}>`
- Added `useProgress` hook + `onComplete={() => markComplete(3)}` on Quiz for completion tracking
- Removed all inline styles — all layout now uses CSS classes

### v2.2.1 — 2026-04-01 — Bug fixes: ExerciseCard styling + Fragment key warning
- Rewrote `ExerciseCard` to use CSS classes instead of 40+ inline styles — consistent with every other component
- Added `.exercise-card`, `.exercise-header`, `.exercise-status`, `.exercise-arrow`, `.exercise-done-btn` (and modifier classes `.completed`, `.open`) to `index.css`
- Fixed React key warning in `Home.jsx` flow diagram — replaced `<>` shorthand with `<Fragment key={...}>` so the key is on the outer wrapper, not the children
- Fixed `Header.jsx` bugs: `variant` default changed from `'module'` to `'home'`; `03 Supabase` changed from `<Link>` to `<NavLink>` for consistent active styling

### v2.2.0 — 2026-04-01 — Progress ring + completion tracking
- Created `src/hooks/useProgress.js` — shared hook for reading/writing `vibe-progress` to localStorage; replaces inline state in `Home.jsx`
- Created `src/components/ProgressRing.jsx` — animated SVG ring with accent-to-accent2 gradient, percentage and module count in center
- `Home.jsx` — replaced progress bar with `ProgressRing` in hero; hero layout updated to flex row (text left, ring right); `markActive` removed (completion now fires from quiz)
- `Quiz.jsx` — added optional `onComplete` callback prop; fires via `useEffect` when all questions are answered
- `Module1.jsx` and `Module2.jsx` — import `useProgress`, pass `onComplete={() => markComplete(id)}` to `Quiz`
- Progress now reflects actual module completion (quiz finished) rather than card click
- Responsive: hero stacks vertically on mobile, ring centres below text

### v2.1.3 — 2026-04-01 — Fix hardcoded quiz question count
- `Quiz.jsx` intro text now uses `{questions.length}` instead of hardcoded "Five questions"

### v2.1.2 — 2026-04-01 — Fix Module 2 dark mode white-on-white in teaser
- "Coming up — Module 3" teaser was using inline styles; swapped to `.conversion-teaser` + `.teaser-kicker` CSS classes which already have correct dark mode overrides

### v2.1.1 — 2026-04-01 — Extract ComingUp component
- Created `src/components/ComingUp.jsx` — shared teaser for the next module, used at the bottom of every module page
- Replaced inline `.conversion-teaser` blocks in Module1 and Module2 with `<ComingUp kicker title desc />`

### v2.1.0 — 2026-03-31 — Component extraction
- Extracted 6 shared components into `src/components/`: `CodeBlock`, `ModuleNav`, `Quiz`, `ModuleCard`, `PromptCard`, `ExerciseCard`
- `CodeBlock` unified from two different implementations (Module1 used CSS classes + `dangerouslySetInnerHTML`, Module2 used inline styles + `children`) — now supports both via `html` and `children` props
- `Quiz` unified with normalised question format — Module2's QUIZ data converted to match; `correctKey` added inline to Module1's questions
- `ModuleNav` replaces inline prev/next nav in both module pages
- `ModuleCard` extracted from Home's modules grid
- `PromptCard` and `ExerciseCard` moved from page-local functions to shared components
- Removed all duplicate local function definitions from Module1, Module2, and Home

### v2.0.3 — 2026-03-31 — Module 2 theme fixes
- Replaced Module 2's custom inline header with the shared `Header` component — adds dark/light toggle
- Fixed `CodeBlock` background from `var(--ink)` to `#141210` (always dark) — was white-on-white in light mode

### v2.0.2 — 2026-03-31 — Navigation and progress fixes
- Linked module 2 card on homepage to `/module/2`
- Fixed progress tracking — modules only mark done once, never toggle back; empty modules (`#`) don't affect progress
- Updated Header navbar: `02 Prompting` now points to `/module/2` with active styling
- Module 1 bottom nav `→` button now points to `/module/2`
- Fixed all `<a href>` tags in `Module2.jsx` — converted to `<Link to>`, added `react-router-dom` import
- `vercel.json` rewrite rule added to fix 404 on page reload for all SPA routes

### v2.0.1 — 2026-03-31 — React Router cleanup
- Refactored `App.jsx` to be router-only (`BrowserRouter` + `Routes` + `Route`, nothing else)
- Moved theme init out of `App.jsx` `useEffect` into a plain script line in `main.jsx`
- Removed `BrowserRouter` from `main.jsx` (now lives in `App.jsx`)
- Updated module route from `/module-1` to `/module/1`
- Replaced all remaining `<a href>` tags with React Router `<Link to>` in `Header.jsx` and `Module1.jsx`
- No page now causes a full browser reload on internal navigation

### v2.0.0 — 2026-03-31 — Module 2: Advanced Prompting
- Created `src/pages/Module2.jsx` page component
- Added `/module/2` route in `App.jsx`
- Added `vercel.json` with rewrite rule to fix 404 on page reload for all SPA routes

### v1.0.1 — 2026-03-30 — Fix Vercel build (Permission denied)
- Added `.gitignore` to exclude `node_modules/`, `dist/`, and `.env` files
- Removed `node_modules` from git tracking (`git rm --cached`) — it was committed from Windows, stripping Linux execute permissions from the vite binary

### v1.0.0 — 2026-03-30 — Module 1: React Foundations
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

### v0.1.0 — 2026-03-29 — Dark mode
- Added warm dark theme (`#1e1c18` background, not pure black) to both pages
- Toggle button in each header (`☽ dark` / `☀ light`)
- Theme preference shared between pages via `localStorage`
- Code blocks in module-1 stay dark regardless of theme
