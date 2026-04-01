import { useState } from 'react'
import Header from '../components/Header'
import ComingUp from '../components/ComingUp'
import { useProgress } from '../hooks/useProgress'
import CodeBlock from '../components/CodeBlock'
import PromptCard from '../components/PromptCard'
import Quiz from '../components/Quiz'
import ModuleNav from '../components/ModuleNav'
import ExerciseCard from '../components/ExerciseCard'

// ── Quiz data ──────────────────────────────────────────────────────────────
const SCORE_MSGS = [
  "Supabase has a lot of new concepts — revisit the lessons and try the exercises before moving on.",
  "Getting there. Re-read the sections on the questions you missed, especially RLS.",
  "Solid foundation. The exercises will make these concepts concrete.",
  "Strong. You clearly understand the backend mental model. Now wire it up.",
  "Perfect. You're ready to build real database-backed features.",
]

const QUESTIONS = [
  {
    id: 'q1', num: '01', total: '05', correctKey: 'b',
    text: "What is Supabase, in one sentence?",
    options: [
      { key: 'a', text: "A JavaScript framework for building React backends" },
      { key: 'b', text: "An open-source Firebase alternative that gives you a Postgres database, auth, and APIs instantly" },
      { key: 'c', text: "A cloud hosting service like Vercel, but for databases" },
      { key: 'd', text: "A NoSQL document database similar to MongoDB" },
    ],
    explanation: "<strong>Correct — B.</strong> Supabase wraps a real Postgres database with auto-generated REST and realtime APIs, built-in auth, and a dashboard UI. You get a full backend without writing any server code.",
  },
  {
    id: 'q2', num: '02', total: '05', correctKey: 'c',
    text: "What does the Supabase JS client's .from('table').select('*') do?",
    options: [
      { key: 'a', text: "Creates a new table called 'table' in your database" },
      { key: 'b', text: "Deletes all rows from the specified table" },
      { key: 'c', text: "Fetches all rows from the specified table and returns them as an array" },
      { key: 'd', text: "Opens a real-time subscription to the table" },
    ],
    explanation: "<strong>Correct — C.</strong> .from() targets a table, .select('*') fetches all columns. The result is { data, error } — always destructure both and handle the error case.",
  },
  {
    id: 'q3', num: '03', total: '05', correctKey: 'b',
    text: "What is Row Level Security (RLS) and why does it matter?",
    options: [
      { key: 'a', text: "A way to limit how many rows a table can store" },
      { key: 'b', text: "A Postgres feature that controls which rows a user can read or write, enforced at the database level" },
      { key: 'c', text: "A Supabase dashboard setting that hides certain columns from the UI" },
      { key: 'd', text: "A JavaScript library for validating data before inserting it" },
    ],
    explanation: "<strong>Correct — B.</strong> RLS policies run inside Postgres, not your app. Even if someone bypasses your frontend, they can't read or write rows they're not allowed to. Always enable RLS on tables that store user data.",
  },
  {
    id: 'q4', num: '04', total: '05', correctKey: 'c',
    text: "Where should your Supabase URL and anon key live in a React + Vite project?",
    options: [
      { key: 'a', text: "Hardcoded directly in the component that uses them" },
      { key: 'b', text: "In a config.js file in src/ that you import everywhere" },
      { key: 'c', text: "In a .env file at the project root, accessed via import.meta.env" },
      { key: 'd', text: "In localStorage so the browser can access them" },
    ],
    explanation: "<strong>Correct — C.</strong> Vite exposes env variables prefixed with VITE_ via import.meta.env. Store them in .env.local (never commit this file). The anon key is safe to expose — it's designed to be public. Never expose your service_role key.",
  },
  {
    id: 'q5', num: '05', total: '05', correctKey: 'b',
    text: "What is the correct way to listen to real-time changes on a Supabase table?",
    options: [
      { key: 'a', text: "Poll the table every second with setInterval" },
      { key: 'b', text: "Use supabase.channel().on('postgres_changes', ...).subscribe() inside a useEffect" },
      { key: 'c', text: "Add an event listener to the supabase client object" },
      { key: 'd', text: "Real-time requires a paid Supabase plan and is not available on free tier" },
    ],
    explanation: "<strong>Correct — B.</strong> Supabase Realtime uses WebSockets under the hood. You subscribe to postgres_changes events on a channel. Always clean up by calling channel.unsubscribe() in the useEffect return function, or you'll leak connections.",
  },
]

// ── Prompt templates ───────────────────────────────────────────────────────
const PROMPTS = [
  {
    label: "Set up Supabase client",
    technique: "Setup",
    text: `I'm setting up Supabase in a React 18 + Vite project. Do the following:

1. Install the Supabase JS client: npm install @supabase/supabase-js
2. Create src/lib/supabase.js that initialises the client using environment variables
3. Show me exactly what to put in .env.local (with placeholder values)
4. Show me how to import and use the client in a component

Hard constraints:
- Use import.meta.env for env variables (this is Vite, not Create React App)
- Export the client as a named export called supabase
- Add a comment explaining what each env variable is for`,
  },
  {
    label: "Design a table schema",
    technique: "Schema",
    text: `I need to design a Supabase table for the following feature:

Feature: [describe what you're building]
Data it needs to store: [list the fields and what they represent]
Relationships: [describe any links to other tables or to auth.users]

Please:
1. Write the SQL CREATE TABLE statement with appropriate column types
2. Add a primary key, created_at timestamp, and updated_at timestamp
3. Link to auth.users via a user_id foreign key if the data is user-specific
4. Write the RLS policies needed: users can only read/write their own rows
5. Explain each decision you made`,
  },
  {
    label: "Read and write data",
    technique: "CRUD",
    text: `Write a React custom hook called use[Feature] that handles all Supabase data operations for [describe the feature].

The hook should:
- Fetch data on mount using useEffect
- Expose: data, loading, error state
- Expose functions for: insert, update, delete
- Handle errors gracefully (set error state, don't crash)
- Clean up any subscriptions on unmount

Use the supabase client from src/lib/supabase.js.
No additional libraries. Plain async/await with try/catch.
Add a JSDoc comment at the top explaining what the hook does.`,
  },
  {
    label: "Add RLS policies",
    technique: "Security",
    text: `I have a Supabase table called [table_name] with these columns: [list columns].

Users should be able to:
- [describe read permissions — e.g. "read only their own rows"]
- [describe write permissions — e.g. "insert rows where user_id matches their auth.uid()"]
- [describe any public access — e.g. "anyone can read rows where is_public = true"]

Write the SQL RLS policies for each permission. For each policy:
1. Write the SQL
2. Explain in plain English what it allows
3. Explain what it prevents`,
  },
  {
    label: "Set up real-time subscription",
    technique: "Realtime",
    text: `Add a real-time subscription to my React component that listens for changes to the [table_name] table in Supabase.

Requirements:
- Subscribe inside a useEffect
- Listen for INSERT, UPDATE, and DELETE events
- Update local React state when each event fires (don't re-fetch — update the array in place)
- Unsubscribe cleanly when the component unmounts
- Add a comment explaining the cleanup

Current component state: [paste your current useState setup]`,
  },
  {
    label: "Implement Supabase Auth",
    technique: "Auth",
    text: `Add Supabase email/password authentication to my React app.

I need:
1. A sign-up function that creates a new user
2. A sign-in function
3. A sign-out function
4. A way to get the current user session on app load
5. A protected route pattern — redirect to /login if not authenticated

Constraints:
- Store auth state in React context (create an AuthContext)
- Use supabase.auth.onAuthStateChange to keep state in sync
- No additional auth libraries
- Show me how to use the context in a child component with useContext`,
  },
]

// ── Lesson data (title + content + exercise colocated) ─────────────────────
const LESSONS = [
  {
    title: "What is Supabase",
    heading: "What is", accent: "Supabase?",
    body: [
      "Supabase is an open-source backend platform built on top of Postgres — the most battle-tested relational database in the world. It gives you a real database, auto-generated APIs, authentication, file storage, and real-time subscriptions, all without writing a single line of server code.",
      "For vibe coders, this is the missing piece between a React frontend and a real production app. Instead of building and hosting your own API, you describe your data in a table, turn on the API, and start reading and writing from your React app in minutes.",
      "The free tier is genuinely generous: 500MB database, 50,000 monthly active users, 2GB file storage, and unlimited API requests. It's enough to ship real projects without spending a cent.",
    ],
    callout: { label: "The mental model", text: "Think of Supabase as three things in one: a Postgres database you can see and edit in a dashboard, an auto-generated REST API that wraps every table, and a JavaScript client that makes calling that API feel like writing local code." },
    exercise: {
      id: 'ex1',
      title: "Create your first Supabase project",
      duration: "10 min",
      desc: "Sign up for Supabase, create a project, and connect it to your VIBE:ADVANCED React app. By the end of this exercise your app will have a live Postgres database it can talk to.",
      steps: [
        "Go to supabase.com and sign up with GitHub (free, no credit card)",
        "Create a new project — name it 'vibe-advanced', choose a region close to you",
        "Once the project spins up, go to Project Settings → API",
        "Copy your Project URL and anon public key",
        "In your VIBE:ADVANCED project, create .env.local in the root with: VITE_SUPABASE_URL=your_url and VITE_SUPABASE_ANON_KEY=your_key",
        "Run the 'Set up Supabase client' prompt to create src/lib/supabase.js",
        "Import the client in App.jsx and console.log(supabase) — if you see the client object, you're connected",
      ],
      reflection: "What is the difference between the anon key and the service_role key? When would you never use the service_role key in a frontend app?",
    },
  },
  {
    title: "Tables + schema",
    heading: "Tables +", accent: "Schema Design",
    lang: "sql",
    body: [
      "Every piece of data in Supabase lives in a table — rows and columns, like a spreadsheet, but with types, constraints, and relationships. Designing your schema upfront is one of the highest-leverage things you can do. A well-designed schema makes every query simple. A poorly-designed one creates pain that compounds over time.",
      "The core rules: every table needs a primary key (use uuid, not integer — Supabase generates these automatically). User-specific data needs a user_id column that references auth.users. Every table benefits from created_at and updated_at timestamps. Column types matter — use text for strings, integer or numeric for numbers, boolean for flags, timestamptz for times.",
    ],
    code: `-- Example: module_progress table
CREATE TABLE module_progress (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  module_num  integer NOT NULL CHECK (module_num BETWEEN 1 AND 8),
  completed   boolean DEFAULT false,
  completed_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, module_num)  -- one row per user per module
);`,
    callout: { label: "Vibe coder tip", text: "Use the 'Design a table schema' prompt and describe your feature in plain English. Claude will write the SQL, the RLS policies, and explain every decision. You review and run it in the Supabase SQL editor." },
    exercise: {
      id: 'ex2',
      title: "Design and create the progress table",
      duration: "20 min",
      desc: "Design the database table that will store your module progress. Use the schema design prompt to get Claude to write the SQL, then run it in the Supabase SQL editor.",
      steps: [
        "Use the 'Design a table schema' prompt — describe: a table that stores which modules a user has completed",
        "Fields needed: user_id (linked to auth), module_number (integer), completed (boolean), completed_at (timestamp)",
        "Copy the SQL Claude generates and paste it into Supabase Dashboard → SQL Editor → New Query",
        "Run the query — check the Table Editor to confirm the table was created",
        "Also run the RLS policies Claude wrote — confirm RLS is enabled on the table",
        "In the Table Editor, manually insert a test row to confirm everything works",
      ],
      reflection: "Why do we link progress rows to auth.users instead of just storing a username string? What problems does the foreign key solve?",
    },
  },
  {
    title: "Reading + writing",
    heading: "Reading +", accent: "Writing Data",
    lang: "jsx",
    body: [
      "The Supabase JS client makes database operations feel like calling a local function. Every operation returns { data, error } — always destructure both. Never assume success.",
      "The four operations you'll use constantly: select (fetch rows), insert (add a row), update (change a row), upsert (insert or update — use this for progress tracking), and delete (remove a row). Chain .eq(), .match(), .order(), and .limit() to filter and shape your results.",
    ],
    code: `import { supabase } from '../lib/supabase';

// Fetch all progress for current user
const { data, error } = await supabase
  .from('module_progress')
  .select('*')
  .eq('user_id', userId)
  .order('module_num');

// Upsert progress (insert or update)
const { error } = await supabase
  .from('module_progress')
  .upsert({
    user_id: userId,
    module_num: 3,
    completed: true,
    completed_at: new Date().toISOString()
  }, { onConflict: 'user_id,module_num' });

// Always handle errors
if (error) {
  console.error('Supabase error:', error.message);
  return;
}`,
    callout: { label: "Custom hook pattern", text: "Wrap all your Supabase calls in a custom hook (e.g. useModuleProgress). The component just calls markComplete(3) — it doesn't know or care how the database works. This separation makes testing, debugging, and refactoring dramatically easier." },
    exercise: {
      id: 'ex3',
      title: "Read and write progress data",
      duration: "25 min",
      desc: "Build a custom React hook that reads and writes module progress to Supabase. This will eventually replace your localStorage implementation.",
      steps: [
        "Use the 'Read and write data' prompt to generate a useModuleProgress hook",
        "The hook should fetch all progress rows for the current user on mount",
        "Expose a markComplete(moduleNumber) function that upserts a row",
        "Expose a markIncomplete(moduleNumber) function that deletes or updates the row",
        "Test by calling markComplete(1) from the browser console via a temporary button",
        "Check the Supabase Table Editor — you should see the row appear in real time",
      ],
      reflection: "What is an upsert and why is it more useful than a plain insert for this use case?",
    },
  },
  {
    title: "Row Level Security",
    heading: "Row Level", accent: "Security",
    lang: "sql",
    body: [
      "RLS is Postgres's built-in access control system. Without it, anyone with your anon key can read or write every row in every table — even other users' data. With RLS enabled, you write policies that run inside the database on every query, regardless of where the query comes from.",
      "The golden rule: enable RLS on every table that stores user data, immediately after creating it. Don't wait. The default when RLS is enabled is deny-all — nothing gets through until you write a policy that explicitly allows it.",
    ],
    code: `-- Enable RLS on the table first
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

-- Policy: users can only read their own rows
CREATE POLICY "Users read own progress"
  ON module_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can only insert rows for themselves
CREATE POLICY "Users insert own progress"
  ON module_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can only update their own rows
CREATE POLICY "Users update own progress"
  ON module_progress FOR UPDATE
  USING (auth.uid() = user_id);`,
    callout: { label: "Security mindset", text: "auth.uid() is a Supabase function that returns the ID of the currently authenticated user. It can't be spoofed from the client. If auth.uid() = user_id is false, the row is invisible to that user — at the database level, not the JavaScript level." },
    exercise: {
      id: 'ex4',
      title: "Lock down your table with RLS",
      duration: "15 min",
      desc: "Write and test RLS policies that ensure users can only read and write their own progress rows — even if someone tries to query the table directly.",
      steps: [
        "Use the 'Add RLS policies' prompt for your module_progress table",
        "Apply the policies in Supabase Dashboard → Authentication → Policies",
        "Test: try to fetch rows without being authenticated — you should get an empty array",
        "Test: sign in as a user, insert a row, then try to fetch rows as a different user — you should only see your own",
        "Use the Supabase Policy Editor to verify each policy reads as you intended",
      ],
      reflection: "What would happen if you forgot to enable RLS on a table that stores user data? How would an attacker exploit that?",
    },
  },
  {
    title: "Real-time",
    heading: "Real-Time", accent: "Subscriptions",
    lang: "jsx",
    body: [
      "Supabase Realtime uses WebSockets to push database changes to your app the moment they happen. Instead of polling the database every few seconds, you subscribe to a table and React immediately when rows are inserted, updated, or deleted.",
      "The pattern: subscribe in useEffect, update local state when events fire (don't re-fetch — just splice the array), and always unsubscribe on cleanup. A subscription that isn't cleaned up leaks a WebSocket connection every time the component mounts.",
    ],
    code: `useEffect(() => {
  const channel = supabase
    .channel('module_progress_changes')
    .on(
      'postgres_changes',
      {
        event: '*',           // INSERT | UPDATE | DELETE
        schema: 'public',
        table: 'module_progress',
        filter: \`user_id=eq.\${userId}\`
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setProgress(prev => [...prev, payload.new]);
        }
        if (payload.eventType === 'DELETE') {
          setProgress(prev =>
            prev.filter(p => p.id !== payload.old.id)
          );
        }
      }
    )
    .subscribe();

  // Cleanup — always unsubscribe
  return () => supabase.removeChannel(channel);
}, [userId]);`,
    callout: { label: "Real-time gotcha", text: "Real-time only fires for changes made after you subscribed. It doesn't give you the initial data. Always fetch the current state first (in a separate useEffect or same effect before subscribing), then use real-time to keep it updated." },
    exercise: {
      id: 'ex5',
      title: "Add real-time sync",
      duration: "20 min",
      desc: "Make your progress update in real time across browser tabs. Open two tabs of your course site — mark a module complete in one and watch the other update without refreshing.",
      steps: [
        "Use the 'Set up real-time subscription' prompt on your useModuleProgress hook",
        "Subscribe to INSERT and DELETE events on the module_progress table",
        "When an INSERT fires, add the new row to local state",
        "When a DELETE fires, remove the matching row from local state",
        "Open two browser tabs of your course site",
        "Mark a module complete in tab 1 — it should appear in tab 2 within a second",
      ],
      reflection: "What happens to your subscription if the user's internet drops and reconnects? How would you handle that edge case?",
    },
  },
  {
    title: "Auth",
    heading: "Supabase", accent: "Auth",
    lang: "jsx",
    body: [
      "Supabase Auth handles user accounts, sessions, and tokens. It supports email/password, magic links, and OAuth providers (GitHub, Google, etc.). The session is automatically persisted in localStorage and refreshed — you don't manage tokens manually.",
      "The architecture for React: create an AuthContext that wraps your app, listen to auth state changes with onAuthStateChange, and expose the current user and auth functions (signIn, signUp, signOut) to any component that needs them via useContext.",
    ],
    code: `// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    signUp: (email, password) =>
      supabase.auth.signUp({ email, password }),
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut()
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);`,
    callout: { label: "Auth + RLS together", text: "Auth and RLS are designed to work together. Once a user is signed in, every Supabase query automatically includes their JWT token. Your RLS policies use auth.uid() to check it. You don't wire this up manually — it just works." },
    exercise: {
      id: 'ex6',
      title: "Add Supabase Auth",
      duration: "30 min",
      desc: "Add email/password authentication so progress is tied to a real user account. This is the prerequisite for the capstone — you need auth before you can move progress out of localStorage.",
      steps: [
        "Use the 'Implement Supabase Auth' prompt to generate an AuthContext",
        "Wrap your App with the AuthProvider",
        "Create a simple Login page with email + password fields and sign in / sign up buttons",
        "Add a sign-out button to your Navbar",
        "Protect the module pages — redirect to /login if no session",
        "Test the full flow: sign up → see modules → sign out → redirected to login → sign in → back to modules",
      ],
      reflection: "What is the difference between authentication (who are you?) and authorisation (what are you allowed to do?)? Where does each one live in this stack?",
    },
  },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function Module3() {
  const { markComplete } = useProgress()
  const [completedEx, setCompletedEx] = useState(
    () => JSON.parse(localStorage.getItem('vibe-m3-ex') || '{}')
  )
  const [activeLesson, setActiveLesson] = useState(1)

  function toggleExercise(id) {
    const next = { ...completedEx, [id]: !completedEx[id] }
    setCompletedEx(next)
    localStorage.setItem('vibe-m3-ex', JSON.stringify(next))
  }

  const current = LESSONS[activeLesson - 1]

  return (
    <div className="wrap">
      <Header variant="module" />

      {/* HERO */}
      <div className="module-hero">
        <div className="module-kicker">Module 03 — Data</div>
        <h1>Supabase<br /><em>Database</em></h1>
        <div className="hero-meta">
          <div className="meta-item"><strong>Estimated time</strong>5–6 hours</div>
          <div className="meta-item"><strong>Difficulty</strong>Intermediate</div>
          <div className="meta-item"><strong>Exercises</strong>6 + capstone</div>
          <div className="meta-item"><strong>Outcome</strong>Real database-backed app</div>
        </div>
      </div>

      {/* OBJECTIVES */}
      <div className="objectives">
        <div className="obj-title">// learning objectives</div>
        <ul className="obj-list">
          <li>Understand what Supabase is and how it replaces a custom backend for most use cases</li>
          <li>Create a Supabase project and connect it to your React app using environment variables</li>
          <li>Design a database schema — tables, types, relationships, constraints</li>
          <li>Read and write data from React using the Supabase JS client</li>
          <li>Secure your data with Row Level Security policies that run at the database level</li>
          <li>Subscribe to real-time changes and keep your UI in sync without polling</li>
          <li>Add email/password authentication and tie user identity to database rows</li>
          <li>Capstone: replace localStorage progress tracking with a real Supabase database</li>
        </ul>
      </div>

      {/* LESSON TABS */}
      <div className="lesson-tabs">
        {LESSONS.map((lesson, i) => (
          <button
            key={lesson.title}
            className={`lesson-tab${activeLesson === i + 1 ? ' active' : ''}`}
            onClick={() => setActiveLesson(i + 1)}
          >
            {String(i + 1).padStart(2, '0')} {lesson.title}
          </button>
        ))}
      </div>

      {/* LESSON CONTENT */}
      <div className="lesson-section">
        <div className="section-label">Lesson {activeLesson} of 6</div>
        <h2>
          {current.heading}<br />
          <em>{current.accent}</em>
        </h2>

        {current.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}

        {current.code && (
          <CodeBlock lang={current.lang}>{current.code}</CodeBlock>
        )}

        {current.callout && (
          <div className="callout">
            <p><strong>{current.callout.label}:</strong> {current.callout.text}</p>
          </div>
        )}

        <ExerciseCard
          ex={current.exercise}
          completed={!!completedEx[current.exercise.id]}
          onToggle={() => toggleExercise(current.exercise.id)}
        />
      </div>

      {/* PROMPT LIBRARY */}
      <div className="lesson-section">
        <div className="section-label">Prompt template library</div>
        <h2>Supabase <em>prompts</em></h2>
        <p>Six prompts covering every Supabase operation you'll need.</p>
        {PROMPTS.map((p, i) => (
          <PromptCard key={i} label={p.label} text={p.text} tag={p.technique} />
        ))}
      </div>

      {/* QUIZ */}
      <Quiz
        title="Supabase"
        questions={QUESTIONS}
        scoreMessages={SCORE_MSGS}
        onComplete={() => markComplete(3)}
      />

      {/* CAPSTONE */}
      <div className="challenge-section">
        <div className="section-label">Module capstone</div>
        <div className="capstone-card">
          <h2>Move progress tracking<br />from localStorage to Supabase</h2>
          <p className="desc">
            Right now your module progress lives in localStorage — it's local to one browser and disappears if the user clears their storage. In this capstone you'll migrate it to Supabase, so progress is tied to a real user account and syncs across devices.
          </p>
          <ol className="challenge-steps">
            {[
              ["Schema", "Create the module_progress table with the SQL from Exercise 2. Enable RLS immediately."],
              ["Auth", "Implement Supabase Auth (Exercise 6). Users must sign in before their progress is saved."],
              ["Hook", "Build the useModuleProgress hook (Exercise 3) that reads and writes to Supabase."],
              ["Migrate", "Replace all localStorage.getItem/setItem calls for progress with your new hook."],
              ["Real-time", "Add a real-time subscription so progress syncs instantly across tabs (Exercise 5)."],
              ["Deploy", "Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as environment variables in Vercel dashboard → Settings → Environment Variables. Push and verify the live site works."],
            ].map(([badge, text], i) => (
              <li key={i}>
                <span className="step-badge">{badge}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <div className="deliverables">
            <div className="deliverables-label">// done when you have</div>
            <ul className="deliverable-list">
              <li>Sign up, sign in, and sign out working on the live Vercel URL</li>
              <li>Module progress saved to Supabase and visible in the Table Editor</li>
              <li>Progress persists after closing and reopening the browser</li>
              <li>Progress syncs in real time across two open tabs</li>
              <li>RLS policies confirmed — you cannot read another user's progress</li>
              <li>Supabase env variables set in Vercel (not hardcoded, not committed to Git)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* COMING UP */}
      <ComingUp
        kicker="module 4"
        title="API Integration"
        desc="REST APIs, fetch(), environment variables, loading and error states. You'll pull live data from external APIs into your React app — and build a feature for VIBE:ADVANCED that shows live data from the web."
      />

      {/* MODULE NAV */}
      <ModuleNav
        prev={{ to: '/module/2', label: '02 Advanced Prompting' }}
        next={{ to: '/module/4', label: '04 API Integration' }}
      />
    </div>
  )
}
