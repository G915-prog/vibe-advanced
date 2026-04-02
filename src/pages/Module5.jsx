import { useState } from 'react'
import Header from '../components/Header'
import ComingUp from '../components/ComingUp'
import CodeBlock from '../components/CodeBlock'
import ModuleNav from '../components/ModuleNav'

// ── Component architecture tree ────────────────────────────────────────────
const ARCH_TREE = `QuizApp  (src/pages/QuizApp.jsx)
│  Owns: questions[], currentIndex, score, phase, selectedAnswer
│  Props: none (top-level page)
│
├── CategoryPicker  (src/components/quiz/CategoryPicker.jsx)
│     Renders: category <select>, difficulty <select>, Start button
│     Props: onStart(category, difficulty)
│     State: category (string), difficulty (string)
│     Supabase: none
│
├── QuestionCard  (src/components/quiz/QuestionCard.jsx)
│     Renders: question text, 4 OptionButtons, category badge
│     Props: question (object), selectedAnswer, onAnswer(key)
│     State: none (controlled)
│     Supabase: none
│     │
│     └── OptionButton  (src/components/quiz/OptionButton.jsx)
│           Renders: single answer option, correct/wrong highlight after reveal
│           Props: optionKey, text, selected, correct, revealed, onClick
│           State: none
│           Supabase: none
│
├── Timer  (src/components/quiz/Timer.jsx)
│     Renders: SVG countdown ring, seconds remaining
│     Props: duration (30), onExpire (callback)
│     State: secondsLeft (counts down via setInterval)
│     Supabase: none
│
├── ProgressBar  (src/components/quiz/ProgressBar.jsx)
│     Renders: "Question X of Y" label + filled progress bar
│     Props: current (number), total (number)
│     State: none
│     Supabase: none
│
├── ScoreScreen  (src/components/quiz/ScoreScreen.jsx)
│     Renders: score, percentage, letter grade, Save to leaderboard button
│     Props: score, total, category, difficulty, timeTaken, onSave, onRestart
│     State: saving (boolean), saved (boolean)
│     Supabase: none (calls onSave prop → useLeaderboard)
│
└── Leaderboard  (src/components/quiz/Leaderboard.jsx)
      Renders: top 10 rows — rank, username, score/total, category, time
      Props: none (reads from useLeaderboard)
      State: via useLeaderboard hook
      Supabase: SELECT quiz_scores ORDER BY score DESC LIMIT 10

─────────────────────────────────────────────────────────
Hooks
─────────────────────────────────────────────────────────

useQuiz  (src/hooks/useQuiz.js)
  Manages: questions array, currentIndex, score, phase
           (picking | playing | finished), selectedAnswer,
           timer reset signal
  Exposes: question, currentIndex, total, score, phase,
           selectedAnswer, handleAnswer(), nextQuestion(),
           startQuiz(questions), resetQuiz()

useLeaderboard  (src/hooks/useLeaderboard.js)
  Manages: rows (top 10), loading, error
  Exposes: rows, loading, error, saveScore(entry),
           real-time INSERT subscription (postgres_changes)
  Supabase: INSERT quiz_scores, SELECT top 10,
            subscribe to postgres_changes on quiz_scores`

// ── Supabase schema SQL ────────────────────────────────────────────────────
const SQL_SCHEMA = `-- ─── quiz_scores table ───────────────────────────────────────────
CREATE TABLE quiz_scores (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username            text NOT NULL,
  score               integer NOT NULL,
  total_questions     integer NOT NULL,
  category            text NOT NULL,
  difficulty          text NOT NULL,
  time_taken_seconds  integer NOT NULL,
  created_at          timestamptz DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────
ALTER TABLE quiz_scores ENABLE ROW LEVEL SECURITY;

-- Anyone (including guests) can read the leaderboard
CREATE POLICY "Public leaderboard read"
  ON quiz_scores FOR SELECT
  USING (true);

-- Authenticated users can only insert rows for themselves
CREATE POLICY "Users insert own scores"
  ON quiz_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own rows (score history cleanup)
CREATE POLICY "Users delete own scores"
  ON quiz_scores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── Enable Real-time ────────────────────────────────────────────
-- In the Supabase Dashboard:
--   Database → Replication → Tables → enable quiz_scores
-- This lets your Leaderboard component receive live INSERT events
-- via supabase.channel().on('postgres_changes', ...).subscribe()`

// ── Build guide steps ──────────────────────────────────────────────────────
const BUILD_STEPS = [
  {
    num: '01',
    title: 'Scaffold the Quiz App route and empty page',
    desc: 'Create the QuizApp page component and wire it into the router. This gives you a live URL to navigate to while you build, so you can test each step in the browser immediately.',
    prompt: `I'm adding a new page to my VIBE:ADVANCED React + Vite project (React Router v6, Supabase auth).

Create the following:
1. src/pages/QuizApp.jsx — empty page component that renders <Header variant="module" /> and a placeholder <h1>Quiz App</h1>
2. Add the route /quiz to App.jsx, wrapped in <ProtectedRoute> (same pattern as /module/1–4)
3. Import QuizApp in App.jsx

The project uses Header from ../components/Header, ProtectedRoute from ../components/ProtectedRoute, and BrowserRouter is already in App.jsx.
Do not modify any other files.`,
    doneWhen: 'Navigate to /quiz — you see the header and the h1 without a 404.',
  },
  {
    num: '02',
    title: 'Fetch categories from Open Trivia DB and build CategoryPicker',
    desc: 'The Open Trivia DB API is free and requires no API key. Fetch the category list on mount, then build a form that lets the user pick a category and difficulty before starting.',
    prompt: `In my React + Vite project, create src/components/quiz/CategoryPicker.jsx.

This component should:
- Fetch categories on mount from https://opentdb.com/api_category.php (no key needed)
- Show a loading state while fetching
- Render a <select> for category (map the trivia_categories array: { id, name })
- Render a <select> for difficulty with options: easy / medium / hard
- Render a "Start Quiz" button that calls onStart(categoryId, difficulty)
- Props: onStart(categoryId, difficulty)

Use the existing useFetch hook from src/hooks/useFetch.js.
CSS classes only, no inline styles. No additional libraries.
Match the styling conventions in src/index.css (use existing classes where possible — lesson-section, callout, etc).`,
    doneWhen: 'The picker renders a populated category dropdown and a difficulty select. Clicking Start logs the values to the console.',
  },
  {
    num: '03',
    title: 'Build the useQuiz hook — question index, score, answer handling',
    desc: 'All game logic lives in useQuiz. The hook accepts a questions array and manages the current index, score, selected answer, and game phase. Components stay thin — they just call hook functions.',
    prompt: `Create src/hooks/useQuiz.js in my React + Vite project.

The hook should manage all quiz game logic:

State:
- phase: 'picking' | 'playing' | 'finished'
- questions: array (set by startQuiz)
- currentIndex: integer
- score: integer
- selectedAnswer: string key | null (set on answer, cleared on next question)
- timerKey: integer (increment to reset the Timer component's countdown)

Exposed functions:
- startQuiz(questionsArray) — sets questions and transitions to 'playing'
- handleAnswer(key) — records answer, increments score if correct, sets selectedAnswer
- nextQuestion() — advances index, or transitions to 'finished' if last question
- resetQuiz() — resets all state back to 'picking'

Derived values to expose:
- question (current question object or null)
- total (questions.length)
- isCorrect (boolean — selectedAnswer matches question.correctKey)

Add a JSDoc comment at the top. No Supabase calls in this hook.`,
    doneWhen: 'Import the hook in QuizApp.jsx, call startQuiz([]) from the console — phase changes to "playing".',
  },
  {
    num: '04',
    title: 'Build QuestionCard and OptionButton with correct/wrong reveal',
    desc: 'QuestionCard shows the current question and four answer options. After the user picks, all options reveal correct/wrong styling before advancing to the next question. No guessing which answer was right.',
    prompt: `Create these two components in my VIBE:ADVANCED React project:

1. src/components/quiz/OptionButton.jsx
Props: optionKey (string), text (string), selected (bool), correct (bool), revealed (bool), onClick
- Before reveal: default button styling
- After reveal: green if correct === true, red if selected and not correct, grey otherwise
- Disabled after reveal (no double-clicking)
CSS classes only. No inline styles.

2. src/components/quiz/QuestionCard.jsx
Props: question (object with text, options[], correctKey), selectedAnswer (string|null), onAnswer(key)
- Renders the question text
- Renders 4 OptionButton components
- revealed = selectedAnswer !== null
- Passes correct (optionKey === question.correctKey) and selected (optionKey === selectedAnswer) to each OptionButton

Add CSS classes .question-card, .question-text, .options-grid, .option-btn, .option-btn--correct, .option-btn--wrong, .option-btn--revealed to src/index.css.`,
    doneWhen: 'Render <QuestionCard> with a hardcoded question object — clicking an option highlights it, the correct answer turns green.',
  },
  {
    num: '05',
    title: 'Build the Timer component with countdown and auto-advance',
    desc: 'Each question has 30 seconds. The timer counts down visually using an SVG ring. When it hits zero it calls onExpire, which triggers nextQuestion in the parent — the game auto-advances with no score for that question.',
    prompt: `Create src/components/quiz/Timer.jsx in my React + Vite project.

Props: duration (integer, default 30), onExpire (callback), timerKey (integer — changing this resets the timer)

Implementation:
- Use useState for secondsLeft (initialise to duration)
- Use useEffect with setInterval (1000ms) to count down
- When secondsLeft reaches 0: clear the interval, call onExpire()
- Reset when timerKey changes (add timerKey to the useEffect dependency array, re-initialise secondsLeft to duration)
- Render an SVG ring: circle with stroke-dasharray/stroke-dashoffset to show elapsed time
- Render the seconds remaining in the centre of the ring

SVG ring: cx=24 cy=24 r=20, strokeWidth=4, circumference=125.66
stroke-dashoffset = circumference * (1 - secondsLeft / duration)

Add .timer-ring, .timer-svg, .timer-text CSS classes to src/index.css.
CSS classes only, no inline styles in JSX.`,
    doneWhen: 'Render <Timer duration={10} onExpire={() => console.log("expired")} timerKey={0} /> — it counts down to 0 and logs "expired".',
  },
  {
    num: '06',
    title: 'Build ProgressBar and wire up the full question flow',
    desc: 'Add the progress indicator and connect all the pieces: CategoryPicker fetches questions from the API, hands them to useQuiz, QuestionCard displays them, Timer auto-advances, and the flow runs end-to-end.',
    prompt: `In my VIBE:ADVANCED React project:

1. Create src/components/quiz/ProgressBar.jsx
Props: current (1-based integer), total (integer)
Renders: "Question {current} of {total}" label + a <div> progress bar filled to current/total %
CSS: .progress-bar-wrap, .progress-bar-track, .progress-bar-fill, .progress-label

2. Update src/pages/QuizApp.jsx to wire up the full question flow:
- Import useQuiz, CategoryPicker, QuestionCard, Timer, ProgressBar
- When phase === 'picking': fetch questions from Open Trivia DB on startQuiz(categoryId, difficulty)
  URL: https://opentdb.com/api.php?amount=10&category={categoryId}&difficulty={difficulty}&type=multiple
  Decode HTML entities in question/answer text using a helper (DOMParser or he library — use DOMParser, no extra libs)
  Shuffle answers and attach a correctKey before calling startQuiz(processedQuestions)
- When phase === 'playing': render ProgressBar, Timer, QuestionCard
  Timer onExpire calls nextQuestion(); answer selection calls handleAnswer(key) then after 1200ms calls nextQuestion()
- When phase === 'finished': render a placeholder <p>Game over — score: {score}/{total}</p> for now

No Supabase calls yet. CSS classes only.`,
    doneWhen: 'Play through a full 10-question quiz from start to finish — Timer auto-advances, score increments, "Game over" shows at the end.',
  },
  {
    num: '07',
    title: 'Build ScoreScreen — score, percentage, grade, and save button',
    desc: 'Replace the placeholder end screen with a proper ScoreScreen. It shows the user their score, a letter grade, and — if they are signed in — a button to save their score to the leaderboard.',
    prompt: `Create src/components/quiz/ScoreScreen.jsx in my VIBE:ADVANCED React project.

Props:
- score (integer), total (integer), category (string), difficulty (string)
- timeTaken (integer, seconds), onSave (async function), onRestart (function)
- user (from useAuth — null if guest)

Renders:
- Score: "{score} / {total}"
- Percentage: "{Math.round(score/total*100)}%"
- Letter grade: A (90%+), B (75%+), C (60%+), D (45%+), F (below 45)
- Category and difficulty badges
- Time taken: "{Math.floor(timeTaken/60)}m {timeTaken%60}s"
- If user is signed in: a username input (pre-filled with user.email split at @) + "Save to leaderboard" button
  - On save: call onSave({ username, score, total, category, difficulty, timeTaken })
  - Show "Saved!" after success, show error message on failure
- If guest: "Sign in to save your score" message with a link to /login
- "Play again" button calls onRestart

Import useAuth from ../context/AuthContext.
Add .score-screen, .score-display, .score-grade, .score-badges, .score-badge, .score-actions CSS classes to src/index.css.
CSS classes only, no inline styles.`,
    doneWhen: 'Finish a quiz — ScoreScreen shows the grade. If signed in, enter a username and click Save — no errors in the console.',
  },
  {
    num: '08',
    title: 'Create the Supabase quiz_scores table and RLS policies',
    desc: 'Set up the backend before wiring up the leaderboard. Run the SQL in the Supabase Dashboard, verify RLS is enabled, and confirm a test insert works from the SQL editor.',
    prompt: `I need to set up the quiz_scores table in my Supabase project.

Write the complete SQL to run in the Supabase SQL Editor:

1. CREATE TABLE quiz_scores with columns:
   id (uuid PK), user_id (uuid FK → auth.users nullable),
   username (text), score (integer), total_questions (integer),
   category (text), difficulty (text),
   time_taken_seconds (integer), created_at (timestamptz DEFAULT now())

2. Enable RLS on the table

3. Three RLS policies:
   - Anyone can SELECT (public leaderboard)
   - Authenticated users can INSERT where auth.uid() = user_id
   - Authenticated users can DELETE their own rows

4. A comment showing how to enable real-time on quiz_scores in the Supabase Dashboard

After the SQL, write a test INSERT I can run in the SQL editor to confirm the table works
(use a hardcoded UUID for user_id and dummy values for the other columns).`,
    doneWhen: 'quiz_scores appears in the Supabase Table Editor, RLS is on (shown with a lock icon), and the test INSERT creates a visible row.',
  },
  {
    num: '09',
    title: 'Build useLeaderboard — save scores, fetch top 10, real-time',
    desc: 'The leaderboard hook owns all Supabase interaction: saving a score after a game, fetching the top 10, and subscribing to real-time inserts so the leaderboard updates live when someone else saves.',
    prompt: `Create src/hooks/useLeaderboard.js in my VIBE:ADVANCED React project.

The Supabase client is at src/lib/supabase.js (named export: supabase).
The quiz_scores table has: id, user_id, username, score, total_questions, category, difficulty, time_taken_seconds, created_at.

The hook should:
1. Fetch top 10 rows on mount:
   SELECT * FROM quiz_scores ORDER BY score DESC, time_taken_seconds ASC LIMIT 10
   Expose: rows (array), loading (boolean), error (string|null)

2. Expose saveScore(entry) async function:
   entry = { userId, username, score, totalQuestions, category, difficulty, timeTakenSeconds }
   INSERT a row into quiz_scores
   Returns { error } — let the caller handle error display

3. Subscribe to real-time INSERT events on quiz_scores:
   When a new row is inserted, append it and re-sort the rows array (score DESC, time_taken_seconds ASC), then trim to 10
   Unsubscribe on unmount via supabase.removeChannel(channel)

Add a JSDoc comment at the top.
No additional libraries. Follow the same pattern as useProgress in src/hooks/useProgress.js.`,
    doneWhen: 'Import the hook in QuizApp — rows logs the top 10 from Supabase. Save a score, refresh — the row appears in the leaderboard.',
  },
  {
    num: '10',
    title: 'Build the Leaderboard component and wire everything together',
    desc: 'Build the final component, connect useLeaderboard to ScoreScreen\'s onSave prop, and do a full end-to-end test: play a game, save a score, watch the leaderboard update in real time in a second tab.',
    prompt: `In my VIBE:ADVANCED React project, do the following:

1. Create src/components/quiz/Leaderboard.jsx
   Uses useLeaderboard hook (src/hooks/useLeaderboard.js)
   Renders:
   - "Top 10" section title
   - Loading skeleton while loading
   - Error message if error
   - A table with columns: Rank, Player, Score, Category, Difficulty, Time
   - Highlight the current user's row if their username matches
   CSS: .leaderboard, .leaderboard-row, .leaderboard-rank, .leaderboard-score, .leaderboard-mine

2. Update src/pages/QuizApp.jsx:
   - Import useLeaderboard and pass saveScore to ScoreScreen's onSave prop
   - Render <Leaderboard /> below the ScoreScreen when phase === 'finished'
   - Also render <Leaderboard /> when phase === 'picking' (so users see scores before they play)
   - Track timeTaken in seconds: start a ref timer when phase changes to 'playing',
     stop it when phase changes to 'finished'

3. Final wiring check — confirm these all work:
   - Guest play (no save button shown)
   - Signed-in save (score appears in leaderboard immediately via real-time)
   - Timer auto-advance
   - Category and difficulty selection

CSS classes only, no inline styles.`,
    doneWhen: 'Open two tabs. Play and save a score in tab 1 — the leaderboard in tab 2 updates within 1 second without refreshing.',
  },
]

// ── Deployment checklist items ─────────────────────────────────────────────
const DEPLOY_ITEMS = [
  { key: 'env_vars',    label: 'Supabase env vars set in Vercel Dashboard → Settings → Environment Variables (not just .env.local)' },
  { key: 'rls',         label: 'RLS enabled and tested on quiz_scores — unauthenticated SELECT works, unauthenticated INSERT is blocked' },
  { key: 'guest_play',  label: 'Guest play works without auth — score shown at end, no save button, no console errors' },
  { key: 'save_score',  label: 'Score saves correctly for signed-in users — row visible in Supabase Table Editor after saving' },
  { key: 'realtime',    label: 'Leaderboard updates in real time — tested with two browser tabs open simultaneously' },
  { key: 'timer',       label: 'Timer auto-advances when it hits zero — question skips with no score awarded' },
  { key: 'mobile',      label: 'App works on mobile — tested in Chrome DevTools device mode at 375px width' },
  { key: 'no_errors',   label: 'No console errors in the production build (check with npm run build then npm run preview)' },
  { key: 'api_errors',  label: 'API error states handled — tested with network throttled to Offline in DevTools' },
  { key: 'build',       label: 'npm run build completes locally with zero errors and zero warnings' },
  { key: 'incognito',   label: 'Deployed URL tested in an incognito window — auth flow works from a clean session' },
  { key: 'live_url',    label: 'Live Vercel URL saved somewhere you can find it (bookmark, README, notes)' },
]

// ── Self-assessment rubric ─────────────────────────────────────────────────
const RUBRIC_CRITERIA = [
  { key: 'functionality',  label: 'Functionality',       desc: 'All features work without bugs — quiz flow, timer, score, leaderboard' },
  { key: 'components',     label: 'Component structure', desc: 'Clean separation of concerns — each component does one thing' },
  { key: 'state',          label: 'State management',    desc: 'State lives in the right place — hooks own logic, components stay thin' },
  { key: 'supabase',       label: 'Supabase integration',desc: 'Data reads and writes correctly — scores save, leaderboard loads' },
  { key: 'rls_security',   label: 'RLS + security',      desc: 'Policies tested, no secrets in the codebase, anon key only in env vars' },
  { key: 'errors',         label: 'Error handling',      desc: 'Loading, error, and empty states everywhere — nothing crashes silently' },
  { key: 'code_quality',   label: 'Code quality',        desc: 'Readable, commented where needed, no dead code or console.logs left behind' },
  { key: 'deployment',     label: 'Deployment',          desc: 'Live on Vercel, works in incognito, env vars set in Vercel dashboard' },
]

const RUBRIC_LEVELS = [
  { value: 0, label: 'Not yet' },
  { value: 1, label: 'Partially' },
  { value: 2, label: 'Fully' },
]

function getGrade(score) {
  if (score === 16) return { grade: 'A+', msg: 'Ship it.' }
  if (score >= 13)  return { grade: 'A',  msg: 'Production ready.' }
  if (score >= 10)  return { grade: 'B',  msg: 'Solid. Fix the gaps.' }
  if (score >= 7)   return { grade: 'C',  msg: 'Working but needs polish.' }
  return                   { grade: 'D',  msg: 'Go back and close the open items.' }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Module5() {
  const [checks, setChecks] = useState(
    () => JSON.parse(localStorage.getItem('vibe-m5-deploy') || '{}')
  )
  const [rubric, setRubric] = useState(
    () => JSON.parse(localStorage.getItem('vibe-m5-rubric') || '{}')
  )

  function toggleCheck(key) {
    const next = { ...checks, [key]: !checks[key] }
    setChecks(next)
    localStorage.setItem('vibe-m5-deploy', JSON.stringify(next))
  }

  function setLevel(key, value) {
    const next = { ...rubric, [key]: value }
    setRubric(next)
    localStorage.setItem('vibe-m5-rubric', JSON.stringify(next))
  }

  const checkedCount = Object.values(checks).filter(Boolean).length
  const rubricTotal  = RUBRIC_CRITERIA.reduce((sum, c) => sum + (rubric[c.key] ?? 0), 0)
  const gradeInfo    = getGrade(rubricTotal)

  return (
    <div className="wrap">
      <Header variant="module" />

      {/* HERO */}
      <div className="module-hero">
        <div className="module-kicker">Module 05 — Project I</div>
        <h1>Build: The<br /><em>Quiz App</em></h1>
        <div className="hero-meta">
          <div className="meta-item"><strong>Estimated time</strong>8–12 hours</div>
          <div className="meta-item"><strong>Difficulty</strong>Intermediate–Advanced</div>
          <div className="meta-item"><strong>Stack</strong>React + Supabase + Vercel</div>
          <div className="meta-item"><strong>Type</strong>Full-stack project</div>
        </div>
      </div>

      {/* PROJECT BRIEF */}
      <div className="lesson-section">
        <div className="section-label">Project brief</div>
        <h2>What you're<br /><em>building</em></h2>
        <p>
          A full-stack quiz app powered by the Open Trivia DB — free, no API key required. Users pick a
          category and difficulty, answer 10 questions against a 30-second countdown timer, and see their
          score at the end. Signed-in users can save their score to a live leaderboard backed by Supabase.
        </p>

        <div className="callout">
          <p><strong>Why this project:</strong> The Quiz App hits every skill from Modules 1–4 at once —
          React state, async data fetching, Supabase CRUD, RLS, real-time subscriptions, and auth.
          It's complex enough to be a real challenge, simple enough that the scope is clear.</p>
        </div>

        <h2>Features<br /><em>to ship</em></h2>
        <ul className="obj-list">
          <li>Question categories fetched live from the Open Trivia DB API — free, no key needed</li>
          <li>30-second countdown timer per question — auto-advances with no score on expiry</li>
          <li>Score tracking across the current session with a letter grade at the end</li>
          <li>Auth-gated leaderboard — only signed-in users can save and view top scores</li>
          <li>Score history — signed-in users can see their past results</li>
          <li>Guest mode — play without signing in, score shown but not saved</li>
          <li>Category and difficulty selection before each game</li>
          <li>Live leaderboard showing top 10 scores, updated in real time</li>
          <li>Fully responsive — works on mobile without horizontal scrolling</li>
          <li>Deployed to Vercel with Supabase env vars configured in the dashboard</li>
        </ul>
      </div>

      {/* COMPONENT ARCHITECTURE */}
      <div className="lesson-section">
        <div className="section-label">Component architecture</div>
        <h2>The full<br /><em>component tree</em></h2>
        <p>
          Every component owns exactly one responsibility. Game logic lives in hooks, not components.
          Supabase calls are isolated to <code>useLeaderboard</code> — nothing else touches the database directly.
        </p>
        <CodeBlock lang="tree">{ARCH_TREE}</CodeBlock>
      </div>

      {/* SUPABASE SCHEMA */}
      <div className="lesson-section">
        <div className="section-label">Supabase schema</div>
        <h2>Database<br /><em>setup</em></h2>
        <p>
          One table. Three RLS policies. Run this SQL in the Supabase Dashboard → SQL Editor, then enable
          real-time in Database → Replication. You'll do this in Step 8 of the build guide below.
        </p>
        <CodeBlock lang="sql">{SQL_SCHEMA}</CodeBlock>
        <div className="callout">
          <p><strong>user_id is nullable:</strong> Guests don't have a Supabase user ID. The column allows
          NULL so a guest score can still be stored if you decide to support that — but the INSERT policy
          only permits authenticated users, so guest scores are intentionally blocked at the database level.</p>
        </div>
      </div>

      {/* STEP-BY-STEP BUILD GUIDE */}
      <div className="challenge-section">
        <div className="section-label">Step-by-step build guide</div>
        <div className="build-guide">
          {BUILD_STEPS.map(step => (
            <div key={step.num} className="build-step">
              <div className="build-step-header">
                <span className="build-step-num">{step.num}</span>
                <span className="build-step-title">{step.title}</span>
              </div>
              <p className="build-step-desc">{step.desc}</p>
              <div className="build-step-prompt-label">// claude code prompt</div>
              <CodeBlock lang="prompt">{step.prompt}</CodeBlock>
              <div className="build-step-done">
                <span className="step-badge">Done when</span>
                <span>{step.doneWhen}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DEPLOYMENT CHECKLIST */}
      <div className="challenge-section">
        <div className="section-label">Deployment checklist</div>
        <div className="capstone-card">
          <h2>Before you call<br />it <em>done</em></h2>
          <p className="desc">
            Run through every item below before sharing your live URL. These are the things that look
            fine in dev but break in production — or expose a security gap you didn't notice.
          </p>
          <div className="deploy-progress">
            <span className="deploy-count">{checkedCount} / {DEPLOY_ITEMS.length}</span>
            <div className="deploy-track">
              <div
                className="deploy-fill"
                style={{ width: `${(checkedCount / DEPLOY_ITEMS.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="deploy-checklist">
            {DEPLOY_ITEMS.map(item => (
              <label key={item.key} className={`deploy-item${checks[item.key] ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  className="deploy-checkbox"
                  checked={!!checks[item.key]}
                  onChange={() => toggleCheck(item.key)}
                />
                <span className="deploy-label">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* SELF-ASSESSMENT RUBRIC */}
      <div className="challenge-section">
        <div className="section-label">Self-assessment rubric</div>
        <div className="capstone-card">
          <h2>How good<br />is it <em>really?</em></h2>
          <p className="desc">
            Be honest. Click the level that reflects your actual implementation, not the one you aimed for.
            The point is to identify gaps, not to feel good.
          </p>
          <div className="rubric">
            <div className="rubric-header">
              <span className="rubric-col-criterion">Criterion</span>
              <span className="rubric-col-levels">Not yet · Partially · Fully</span>
            </div>
            {RUBRIC_CRITERIA.map(criterion => (
              <div key={criterion.key} className="rubric-row">
                <div className="rubric-criterion">
                  <span className="rubric-name">{criterion.label}</span>
                  <span className="rubric-desc">{criterion.desc}</span>
                </div>
                <div className="rubric-levels">
                  {RUBRIC_LEVELS.map(level => (
                    <button
                      key={level.value}
                      className={`rubric-btn${(rubric[criterion.key] ?? -1) === level.value ? ' active' : ''}`}
                      onClick={() => setLevel(criterion.key, level.value)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="rubric-footer">
              <div className="rubric-total">
                <span className="rubric-score">{rubricTotal}</span>
                <span className="rubric-out-of">/ 16</span>
              </div>
              {Object.keys(rubric).length > 0 && (
                <div className="rubric-grade-block">
                  <span className="rubric-grade-badge">{gradeInfo.grade}</span>
                  <span className="rubric-grade-msg">{gradeInfo.msg}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CAPSTONE TEASER */}
      <ComingUp
        kicker="project II"
        title="Build: Link-in-Bio"
        desc="Custom profile pages, link management, click tracking, public URLs. Like Linktree — but built by you, owned by you, deployed by you."
      />

      {/* MODULE NAV */}
      <ModuleNav
        prev={{ to: '/module/4', label: '04 API Integration' }}
        next={{ to: '#', label: '06 Link-in-Bio' }}
      />
    </div>
  )
}
