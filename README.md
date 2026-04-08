# vibe-advanced
Advanced vibecoding course

---

## Changelog

### v7.0.1 — 2026-04-08 — Optimistic progress ring on Home
- `useProgress.js` — seeds `rows` from `localStorage('vibe-progress-cache')` on mount so the ProgressRing shows instantly on page load; overwrites cache after every successful Supabase fetch (stale-while-revalidate pattern)

### v7.0.0 — 2026-04-07 — Module 7: Cloudflare Hosting
- Created `src/pages/Module7.jsx` — single-scroll deployment guide; sections: hero (Module 07, 6–8 hrs, Intermediate, Cloudflare Pages + Workers + React), objectives, project overview (2 deliverables: vibe-hub + /showcase), 14-step build guide with embedded lessons at first point of need (CF vs Vercel comparison table → step 01, portfolio hub design → step 02, build config + _redirects → step 03, env var auto-redeploy gotcha → step 04, Workers + V8 isolates concept → step 05, outbound fetch + HEAD requests + Promise.all → step 06, wrangler.toml + secrets → step 07, CORS concept → step 09, DNS + SSL → step 10, edge caching + Lighthouse → step 11, migration process → step 12), 14-item deployment checklist (localStorage `vibe-m7-deploy`), 8-criterion self-assessment rubric (localStorage `vibe-m7-rubric`), 6 prompt templates, Module 08 capstone teaser, bottom nav; calls `markComplete(7)` when all 14 deploy items are checked
- Created `src/pages/Showcase.jsx` — placeholder page; built out in Module 7 Step 8; includes hero, placeholder message linking to /module/7, and ModuleNav
- `App.jsx` — added `/module/7` route (ProtectedRoute + Module7) and `/showcase` route (ProtectedRoute + Showcase); imported both components
- `Home.jsx` — Module 7 card (`id: 7`) updated from `'#'` to `'/module/7'`
- `Header.jsx` — added `07 Cloudflare` NavLink to `/module/7` and `Showcase` NavLink to `/showcase`

### v6.0.2 — 2026-04-06 — Module 6: restructure lessons into build guide
- `src/pages/Module6.jsx` — removed standalone 4-tab lesson section; lessons now live inline within the build step where their concept is first needed: dynamic routing concept → step 04 (ProfilePage), QR code concept → step 07 (QRCode component), CRUD + optimistic updates concept → step 10 (useLinks hook), drag-to-reorder concept → step 11 (DraggableLinkItem); PromptCards follow the same placement (theme → step 05, click tracking → step 06); ExerciseCards appear immediately after their relevant step; removed `activeLesson` state and `lessonTitles` array; project brief, component architecture, and Supabase schema sections remain before the build guide

### v6.0.1 — 2026-04-05 — Favicon
- `public/favicon.svg` — created SVG favicon: dark background (#111), white V-mark path, red accent underline (#c84b2f); matches the site's editorial aesthetic
- `index.html` — added `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`

### v6.0.0 — 2026-04-05 — Module 6: Project II — Link-in-Bio
- Created `src/pages/Module6.jsx` — combined lessons + project-guide module; sections: hero (Module 06, 10–14 hrs, Advanced, React + Supabase + Vercel), objectives, 4-lesson tab nav (dynamic routing, CRUD with Supabase, drag-to-reorder, client-side QR code), project brief, component architecture tree, Supabase schema (profiles + links tables, 5 RLS policies + increment_click_count RPC function), 12-step build guide, 14-item deployment checklist, 8-criterion self-assessment rubric, 6 prompt templates, Module 07 capstone teaser, bottom nav; exercise completion persists in localStorage under `vibe-m6-ex`, checklist under `vibe-m6-deploy`, rubric under `vibe-m6-rubric`; calls `markComplete(6)` when all 14 deploy items are checked
- `App.jsx` — added `/module/6` route wrapped in `ProtectedRoute`; imported `Module6`
- `Home.jsx` — Module 6 card (`id: 6`) updated from `'#'` to `'/module/6'`
- `Module5.jsx` — updated ModuleNav `next` link from `'#'` to `'/module/6'`
- `Header.jsx` — added `06 Link-in-Bio` NavLink pointing to `/module/6`

### v5.0.1 — 2026-04-05 — Module 5: wire up homepage progress ring

- `Module5.jsx` — added `useProgress` + `useEffect`; calls `markComplete(5)` when all 12 deploy checklist items are checked, updating the homepage progress ring

### v5.0.0 — 2026-04-02 — Module 5: Project I — The Quiz App
- Created `src/pages/Module5.jsx` — project-guide module (no lesson tabs); sections: hero, project brief, component architecture, Supabase schema, 10-step build guide, 12-item deployment checklist, 8-criterion self-assessment rubric, capstone teaser, bottom nav; all 10 build-step prompts target a brand new standalone Vite + React project — the Quiz App is built as its own repo and deployment, completely separate from the VIBE:ADVANCED course site
- `App.jsx` — added `/module/5` route wrapped in `ProtectedRoute`; imported `Module5`
- `Home.jsx` — Module 5 card (`id: 5`) updated to link to `/module/5`
- `Header.jsx` — added `05 Quiz App` NavLink pointing to `/module/5`
- `index.css` — added `/* ─── MODULE 5: BUILD GUIDE ─── */` (`.build-guide`, `.build-step`, `.build-step-header`, `.build-step-num`, `.build-step-title`, `.build-step-desc`, `.build-step-prompt-label`, `.build-step-done`), `/* ─── MODULE 5: DEPLOY CHECKLIST ─── */` (`.deploy-progress`, `.deploy-count`, `.deploy-track`, `.deploy-fill`, `.deploy-checklist`, `.deploy-item`, `.deploy-checkbox`, `.deploy-label`), `/* ─── MODULE 5: RUBRIC ─── */` (`.rubric`, `.rubric-header`, `.rubric-row`, `.rubric-criterion`, `.rubric-name`, `.rubric-desc`, `.rubric-levels`, `.rubric-btn`, `.rubric-footer`, `.rubric-total`, `.rubric-score`, `.rubric-out-of`, `.rubric-grade-badge`, `.rubric-grade-msg`); checklist and rubric state persisted in localStorage under `vibe-m5-deploy` and `vibe-m5-rubric`

### v4.2.2 — 2026-04-02 — useFetch: 300ms visibility delay
- `useFetch.js` — fetch is now deferred by 300ms via `setTimeout`; cleanup cancels both the timer (`clearTimeout`) and any in-flight request (`controller.abort()`); navigating away before 300ms fires no network request at all; cache hits still resolve instantly with no delay

### v4.2.1 — 2026-04-02 — useFetch: 5-minute module-level cache
- `useFetch.js` — added module-level `Map` cache with 5-minute TTL; cache is checked before every fetch and populated on success; `refetch()` busts the cache entry so manual retries always hit the network; initial `data`/`loading` state is seeded from cache so remounted components render instantly with no flicker

### v4.2.0 — 2026-04-02 — RandomFact widget on home page
- Created `src/components/RandomFact.jsx` — fetches a random fact from the Useless Facts API on mount via `useFetch`; shows a shimmer skeleton while loading, an error state with retry button on failure, and a friendly empty state; "New fact" button calls `refetch` for a fresh fact; source link opens in new tab when present
- `Home.jsx` — added `RandomFact` widget below the stack section
- `index.css` — added `.fact-card`, `.fact-kicker`, `.fact-text`, `.fact-footer`, `.fact-source`, `.fact-btn`, `.fact-skeleton`, `.fact-skeleton-line` (with `.fact-skeleton-wide`/`.fact-skeleton-narrow` variants), `.fact-error`, `.fact-empty`; added `@keyframes shimmer` for the loading skeleton

### v4.1.1 — 2026-04-02 — Fix HTML entities in trivia category
- `TriviaDemo.jsx` — category span switched to `dangerouslySetInnerHTML` so `&amp;` and similar entities render correctly (same treatment as question and answer text)

### v4.1.0 — 2026-04-02 — Extract useFetch hook
- Created `src/hooks/useFetch.js` — reusable hook accepting a `url` string; returns `{ data, loading, error, refetch }`; handles AbortController cleanup, `res.ok` check, and retry via internal `retryCount`
- `TriviaDemo.jsx` — removed all fetch `useState`/`useEffect` code; replaced with `useFetch(TRIVIA_URL)`; API response validation and answer shuffling moved into a separate `useEffect` watching `data`; retry button now calls `refetch` from the hook

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
