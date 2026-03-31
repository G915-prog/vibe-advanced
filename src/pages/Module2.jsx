import { useState } from 'react';
import Header from '../components/Header';
import CodeBlock from '../components/CodeBlock';
import PromptCard from '../components/PromptCard';
import Quiz from '../components/Quiz';
import ExerciseCard from '../components/ExerciseCard';
import ModuleNav from '../components/ModuleNav';

// ── Quiz data ──────────────────────────────────────────────────────────────
const QUIZ = [
  {
    q: "What is the main benefit of prompt chaining over a single long prompt?",
    opts: [
      "It uses fewer tokens and saves money",
      "Each prompt is focused on one task, making outputs easier to verify and refine",
      "Claude performs better with many short prompts than one long one",
      "It avoids the need to provide context"
    ],
    correct: 1,
    exp: "Prompt chaining breaks complex work into verifiable steps. Each output becomes the input for the next prompt, so you can catch and fix problems early rather than getting one huge output that's hard to debug."
  },
  {
    q: "When debugging with Claude, what should you always include?",
    opts: [
      "A polite greeting before describing the problem",
      "The full error message AND the relevant code, not just one or the other",
      "A description of what you tried before asking Claude",
      "The entire codebase so Claude has full context"
    ],
    correct: 1,
    exp: "Claude needs both the error message (what went wrong) and the code (where it went wrong) to give a precise fix. Without both, it can only guess."
  },
  {
    q: "What does a constraint-based prompt do that a plain request doesn't?",
    opts: [
      "It makes Claude respond faster",
      "It limits Claude to only using certain libraries",
      "It pre-emptively rules out solutions you don't want, narrowing the output space",
      "It forces Claude to ask clarifying questions first"
    ],
    correct: 2,
    exp: "Constraints are negative requirements — they tell Claude what NOT to do. Without them, Claude picks the most common solution, which may not fit your context. Constraints like 'no Tailwind', 'no additional libraries', 'keep it under 50 lines' dramatically focus the output."
  },
  {
    q: "What is the purpose of assigning Claude a role in your prompt?",
    opts: [
      "It unlocks hidden capabilities not available by default",
      "It sets the expertise level, tone, and decision-making frame Claude uses to respond",
      "It makes Claude refuse to answer out-of-scope questions",
      "It is mostly cosmetic and doesn't affect output quality"
    ],
    correct: 1,
    exp: "Role-setting primes Claude's reasoning frame. 'You are a senior React developer reviewing a junior's code' produces very different output than the same question with no role — it gets more opinionated, more precise, and more likely to catch real issues."
  },
  {
    q: "In iterative refinement, what is the best next prompt after Claude gives you an output you partially like?",
    opts: [
      "Start a new conversation and re-describe everything from scratch",
      "Say 'that was wrong, try again' with no further detail",
      "Identify exactly what worked, what didn't, and give a specific instruction for what to change",
      "Ask Claude to rate its own output before improving it"
    ],
    correct: 2,
    exp: "Iterative refinement works by being surgical. Saying 'keep the structure but change X to Y because Z' preserves what's working and gives Claude a precise target. Vague feedback like 'make it better' produces vague improvements."
  }
];

// ── Prompt templates ───────────────────────────────────────────────────────
const PROMPTS = [
  {
    label: "Prompt chain — step 1 of 3",
    technique: "Chaining",
    text: `You are working on step 1 of a 3-step task. Do ONLY this step and stop.

Step 1: Analyse the following React component and list every potential problem you can find — bugs, performance issues, accessibility problems, and code style issues. Do not fix anything yet. Just list the problems clearly, numbered, with a one-line explanation for each.

Component:
[paste your component here]`
  },
  {
    label: "Prompt chain — step 2 of 3",
    technique: "Chaining",
    text: `You are working on step 2 of a 3-step task. Here are the problems identified in step 1:

[paste the numbered list from step 1]

Now fix ONLY the bugs (not the style issues, not the performance issues). Show me the corrected code with a comment next to each fix explaining what you changed and why. Do not refactor anything else.`
  },
  {
    label: "Debug with full context",
    technique: "Debugging",
    text: `I have a bug in my React app. Here is everything you need:

ERROR MESSAGE:
[paste the full error from the console]

FILE WHERE THE ERROR OCCURS:
[paste the file name and relevant code]

WHAT I EXPECTED TO HAPPEN:
[describe expected behaviour]

WHAT ACTUALLY HAPPENED:
[describe actual behaviour]

WHAT I ALREADY TRIED:
[list anything you already attempted]

Explain the root cause in plain English, then show me the fix with comments.`
  },
  {
    label: "Constraint-based build",
    technique: "Constraints",
    text: `Build me a [describe the component or feature].

Hard constraints — do not violate these:
- No additional npm packages (use only what's already installed)
- No inline styles — use CSS classes only
- No TypeScript — plain JSX only
- Under 80 lines total
- Must work without any backend or API calls

Soft preferences:
- Functional components with hooks
- Descriptive variable names
- A comment at the top explaining what the component does`
  },
  {
    label: "Role + context setup",
    technique: "Role setting",
    text: `You are a senior React developer with 10 years of experience, currently doing a code review for a developer who is learning React through AI-assisted development.

Your job is to:
1. Review the code below for correctness, performance, and React best practices
2. Explain any issues as if teaching, not just correcting
3. Suggest one improvement that goes beyond fixing bugs — something that would make this code genuinely better
4. Rate the code 1–5 for readability and explain the rating

Be direct and specific. Don't soften feedback.

Code to review:
[paste your code]`
  },
  {
    label: "Iterative refinement",
    technique: "Refinement",
    text: `Here is the output you gave me in the last message:

[paste Claude's previous output]

Here is my feedback:
- KEEP: [what you want to preserve exactly]
- CHANGE: [what specifically needs to change]
- REASON: [why — this helps Claude make better decisions]
- NEW REQUIREMENT: [anything you forgot to mention before]

Please produce a revised version that incorporates this feedback. Only change what I've asked you to change.`
  }
];

// ── Exercises ──────────────────────────────────────────────────────────────
const EXERCISES = [
  {
    id: 'ex1',
    lesson: 1,
    title: "Chain a 3-step refactor",
    duration: "15 min",
    desc: "Take any component from your VIBE:ADVANCED React app. Run the 3-step chain: first ask Claude to analyse only, then fix only bugs, then improve only style. Notice how much more useful each response is when it has one job.",
    steps: [
      "Pick a component from your project (Navbar, a module card, the progress bar)",
      "Run Prompt Chain Step 1 — analysis only. Read the output carefully.",
      "Run Prompt Chain Step 2 — paste the problem list, ask for bug fixes only",
      "Write your own Step 3 prompt: ask Claude to improve code style based on the now-fixed code",
      "Compare the final result to your original. What changed?"
    ],
    reflection: "Could you have gotten the same result in one prompt? Why or why not?"
  },
  {
    id: 'ex2',
    lesson: 2,
    title: "Break something and fix it by prompting",
    duration: "10 min",
    desc: "Deliberately introduce a bug into a component, copy the error message, and practice writing a precise debug prompt. The goal is to fix it without touching the code yourself — only through prompting.",
    steps: [
      "Open any working component in your project",
      "Introduce a bug: remove a closing tag, misspell a hook, delete a dependency from useEffect",
      "Copy the full error from the browser console",
      "Use the 'Debug with full context' prompt template — fill in every field",
      "Apply Claude's fix and verify it works"
    ],
    reflection: "What part of the debug prompt made the biggest difference to Claude's answer?"
  },
  {
    id: 'ex3',
    lesson: 3,
    title: "Build with constraints",
    duration: "20 min",
    desc: "Ask Claude to build a dark mode toggle for VIBE:ADVANCED — but with strict constraints. No new packages, CSS variables only, under 60 lines, must persist across page refresh using localStorage.",
    steps: [
      "Use the constraint-based prompt template",
      "Describe the feature: a toggle button that switches between light and dark mode",
      "Add your hard constraints explicitly in the prompt",
      "If Claude violates a constraint, call it out specifically: 'You used an inline style on line 12, please move it to a CSS class'",
      "Integrate the working toggle into your app"
    ],
    reflection: "Which constraint did Claude struggle with most? How did you correct it?"
  },
  {
    id: 'ex4',
    lesson: 4,
    title: "Role-play a code review",
    duration: "15 min",
    desc: "Use the role-setting prompt to get a senior developer review of your Module1.jsx or Home.jsx. The goal is to get feedback that's genuinely useful, not just 'looks good'.",
    steps: [
      "Use the 'Role + context setup' prompt template",
      "Paste your Home.jsx or Module1.jsx as the code to review",
      "Read the feedback — do you agree with the rating?",
      "Pick one suggestion and implement it",
      "Ask Claude to re-review only the changed section"
    ],
    reflection: "Did the role framing change the quality of feedback compared to just asking 'review my code'?"
  },
  {
    id: 'ex5',
    lesson: 5,
    title: "Refine a bad output into a good one",
    duration: "15 min",
    desc: "Ask Claude to build something with a vague prompt on purpose. Then use iterative refinement to get to the output you actually want — in 3 rounds or fewer.",
    steps: [
      "Give Claude this vague prompt: 'Add a progress indicator to my course site'",
      "Note what it builds — it will make assumptions you probably don't agree with",
      "Use the iterative refinement template: KEEP what works, CHANGE what doesn't, explain WHY",
      "Refine again if needed — be even more specific in round 2",
      "Count how many rounds it took to get what you wanted"
    ],
    reflection: "What would a better first prompt have looked like? Write it out."
  }
];

// ── Normalised quiz data for shared Quiz component ─────────────────────────
const QUIZ_QUESTIONS = QUIZ.map((q, i) => ({
  id: `q${i + 1}`,
  num: String(i + 1).padStart(2, '0'),
  total: String(QUIZ.length).padStart(2, '0'),
  text: q.q,
  options: q.opts.map((text, j) => ({ key: String.fromCharCode(97 + j), text })),
  correctKey: String.fromCharCode(97 + q.correct),
  explanation: q.exp,
}))

const SCORE_MSGS = [
  "Review the lessons again — focus on the techniques you got wrong.",
  "Getting there. Re-read the sections on the questions you missed.",
  "Solid. You understand the core concepts. Now the exercises will cement them.",
  "Strong grasp. You're ready to use these techniques on real problems.",
  "Perfect. Go build something hard.",
]

// ── Component ──────────────────────────────────────────────────────────────
export default function Module2() {
  const [completedEx, setCompletedEx] = useState(() =>
    JSON.parse(localStorage.getItem('vibe-m2-ex') || '{}')
  );
  const [activeLesson, setActiveLesson] = useState(1);

  function toggleExercise(id) {
    const next = { ...completedEx, [id]: !completedEx[id] };
    setCompletedEx(next);
    localStorage.setItem('vibe-m2-ex', JSON.stringify(next));
  }

  const lessonTitles = [
    "Prompt chaining",
    "Debugging by prompting",
    "Constraint-based prompts",
    "Role + context setting",
    "Iterative refinement"
  ];

  return (
    <div style={{ backgroundColor: 'var(--paper)', minHeight: '100vh', fontFamily: 'var(--mono)' }}>

      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--rule) 1px, transparent 1px), linear-gradient(90deg, var(--rule) 1px, transparent 1px)',
        backgroundSize: '40px 40px', opacity: 0.45
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto', padding: '0 32px' }}>

        <Header variant="module" />

        {/* HERO */}
        <div style={{ padding: '64px 0 48px', borderBottom: '1px solid var(--rule)', marginBottom: 64 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'var(--accent)' }} />
            Module 02 — Technique
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(44px, 7vw, 80px)', lineHeight: 0.95, marginBottom: 28 }}>
            Advanced<br /><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Prompting</em>
          </h1>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[['Estimated time', '4–5 hours'], ['Difficulty', 'Intermediate'], ['Exercises', '5 + capstone'], ['Outcome', 'Sharper prompts, better apps']].map(([k, v]) => (
              <div key={k} style={{ fontSize: 11, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: 2, fontWeight: 500 }}>{k}</strong>{v}
              </div>
            ))}
          </div>
        </div>

        {/* OBJECTIVES */}
        <div style={{ border: '1px solid var(--rule)', padding: '28px 32px', marginBottom: 64 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 20 }}>// learning objectives</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              "Break complex problems into focused prompt chains that are easier to verify",
              "Write debug prompts that give Claude everything it needs to fix an error precisely",
              "Use constraints to rule out solutions you don't want before Claude starts",
              "Set roles and context to get expert-level feedback instead of generic answers",
              "Refine outputs iteratively — surgically changing what's wrong while keeping what's right",
              "Apply all five techniques to improve the VIBE:ADVANCED site itself (capstone)"
            ].map((o, i) => (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.6, display: 'flex', gap: 14 }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>→</span>{o}
              </li>
            ))}
          </ul>
        </div>

        {/* LESSON NAV */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 48, flexWrap: 'wrap' }}>
          {lessonTitles.map((t, i) => (
            <button key={i} onClick={() => setActiveLesson(i + 1)}
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em',
                padding: '8px 16px', border: '1px solid',
                borderColor: activeLesson === i + 1 ? 'var(--ink)' : 'var(--rule)',
                background: activeLesson === i + 1 ? 'var(--ink)' : 'transparent',
                color: activeLesson === i + 1 ? 'var(--paper)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 0.15s'
              }}>
              {String(i + 1).padStart(2, '0')} {t}
            </button>
          ))}
        </div>

        {/* ── LESSON 1: PROMPT CHAINING ── */}
        {activeLesson === 1 && (
          <div style={{ marginBottom: 72 }}>
            <SectionLabel text="Lesson 1 of 5" />
            <LessonHeading main="Prompt" accent="Chaining" />
            <LessonText>
              A single prompt asking Claude to "build me a full feature" works — until it doesn't. The output is hard to verify, bugs are buried inside a wall of code, and when something's wrong you have to re-describe everything. Prompt chaining fixes this by breaking the work into a sequence of focused steps, where each output feeds the next prompt.
            </LessonText>
            <LessonText>
              Think of it like a production line: <strong>analyse → fix → refine</strong>. Each station does one job and passes a checked result forward. You stay in control at every step.
            </LessonText>
            <CodeBlock lang="prompt">{`// Bad: one huge prompt
"Build me a complete quiz app with React, Supabase auth,
a leaderboard, timer, categories, and dark mode."

// Good: chained prompts
Prompt 1: "Analyse my current Quiz component and list all problems."
Prompt 2: "Here are the problems. Fix only the bugs."
Prompt 3: "Now refactor for performance — don't change the logic."
Prompt 4: "Add dark mode support using the existing CSS variable system."`}
            </CodeBlock>
            <LessonText>
              The key rule: <strong>one job per prompt</strong>. If you find yourself writing "and also" in a prompt, that's a signal to split it.
            </LessonText>
            <Callout>
              <strong>Claude Code tip:</strong> In Claude Code, you can literally continue a chain in the same conversation — each response builds context for the next prompt automatically. In Claude.ai, paste the previous output explicitly.
            </Callout>
            <ExerciseCard ex={EXERCISES[0]} completed={completedEx['ex1']} onToggle={() => toggleExercise('ex1')} />
          </div>
        )}

        {/* ── LESSON 2: DEBUGGING ── */}
        {activeLesson === 2 && (
          <div style={{ marginBottom: 72 }}>
            <SectionLabel text="Lesson 2 of 5" />
            <LessonHeading main="Debugging by" accent="Prompting" />
            <LessonText>
              Most developers paste an error into Claude and get back a generic answer. The problem is missing context. Claude is pattern-matching on incomplete information. The fix is simple: give it everything — the error, the code, what you expected, what happened, and what you already tried.
            </LessonText>
            <CodeBlock lang="prompt">{`// Weak debug prompt
"Why is my component not working?"

// Strong debug prompt
"I'm getting this error: Cannot read properties of undefined (reading 'map')
It happens in ModuleList.jsx at line 34.
Here is the component: [code]
I expect the list to render when modules is an empty array.
Instead I get the error on first load before data fetches.
I already tried adding a loading state but the error persists."
`}
            </CodeBlock>
            <LessonText>
              Notice the structure: error → location → code → expected → actual → already tried. This is a repeatable template. The more precisely you describe the gap between expected and actual behaviour, the more surgical Claude's fix will be.
            </LessonText>
            <Callout>
              <strong>Pro pattern:</strong> After Claude fixes a bug, always ask "explain why this happened" as a follow-up. Understanding the root cause prevents the same class of bug from appearing elsewhere in your code.
            </Callout>
            <ExerciseCard ex={EXERCISES[1]} completed={completedEx['ex2']} onToggle={() => toggleExercise('ex2')} />
          </div>
        )}

        {/* ── LESSON 3: CONSTRAINTS ── */}
        {activeLesson === 3 && (
          <div style={{ marginBottom: 72 }}>
            <SectionLabel text="Lesson 3 of 5" />
            <LessonHeading main="Constraint-Based" accent="Prompts" />
            <LessonText>
              Without constraints, Claude picks the most common solution. That's often fine — but sometimes you don't want Tailwind, or a new library, or a TypeScript rewrite, or 200 lines when 40 would do. Constraints are pre-emptive requirements that rule out solutions before Claude starts.
            </LessonText>
            <LessonText>
              There are two types: <strong>hard constraints</strong> (never violate these) and <strong>soft preferences</strong> (prefer these, but use judgment). Being explicit about which is which helps Claude make better tradeoffs.
            </LessonText>
            <CodeBlock lang="prompt">{`// No constraints — Claude goes wide
"Add a search feature to my module list."
// Result: might install Fuse.js, use Tailwind, add TypeScript types...

// With constraints — Claude goes precise
"Add a search feature to my module list.
Hard constraints:
- No new npm packages
- CSS classes only, no inline styles
- Under 50 lines
- Must work with the existing moduleData array structure

Soft preferences:
- Case-insensitive matching
- Clear variable names"`}
            </CodeBlock>
            <LessonText>
              When Claude violates a constraint, don't restart — correct it precisely. "You used an inline style on the input element on line 8. Move it to the existing styles.css file under a .search-input class."
            </LessonText>
            <ExerciseCard ex={EXERCISES[2]} completed={completedEx['ex3']} onToggle={() => toggleExercise('ex3')} />
          </div>
        )}

        {/* ── LESSON 4: ROLE SETTING ── */}
        {activeLesson === 4 && (
          <div style={{ marginBottom: 72 }}>
            <SectionLabel text="Lesson 4 of 5" />
            <LessonHeading main="Role + Context" accent="Setting" />
            <LessonText>
              Claude is a generalist by default. Role-setting shifts it into a specialist. When you say "you are a senior React developer doing a code review", you're not just changing the tone — you're changing the decision-making frame. Claude becomes more opinionated, more willing to say "this is wrong", and more likely to catch subtle issues.
            </LessonText>
            <CodeBlock lang="prompt">{`// No role — generic response
"Review my component."
// Gets: "Looks good! Here are some minor suggestions..."

// With role — specialist response
"You are a senior React developer reviewing code
for a junior developer learning through AI-assisted development.
Be direct. Don't soften feedback. Rate readability 1–5.
Suggest one improvement beyond fixing bugs.
Code: [paste component]"
// Gets: specific issues, a real rating, a genuine improvement`}
            </CodeBlock>
            <LessonText>
              Context is equally important. Tell Claude about your project, your constraints, and your level. "I'm building a personal course site, using React 18 and plain CSS, and I'm comfortable reading code but still learning to write it independently" completely changes what kind of answer is useful.
            </LessonText>
            <Callout>
              <strong>Compound roles:</strong> You can stack roles and contexts. "You are a senior React developer AND a technical writer. Review this component and then write a one-paragraph explanation of what it does for a beginner." Claude handles both frames simultaneously.
            </Callout>
            <ExerciseCard ex={EXERCISES[3]} completed={completedEx['ex4']} onToggle={() => toggleExercise('ex4')} />
          </div>
        )}

        {/* ── LESSON 5: ITERATIVE REFINEMENT ── */}
        {activeLesson === 5 && (
          <div style={{ marginBottom: 72 }}>
            <SectionLabel text="Lesson 5 of 5" />
            <LessonHeading main="Iterative" accent="Refinement" />
            <LessonText>
              The first output is rarely the final output. Iterative refinement is the skill of getting from "close" to "exactly right" in the fewest rounds possible. The key is being surgical: identify precisely what to keep, what to change, and why.
            </LessonText>
            <CodeBlock lang="prompt">{`// Weak refinement — vague
"That's not quite right. Can you improve it?"
// Claude: makes random changes, may break what worked

// Strong refinement — surgical
"KEEP: the component structure and the useEffect logic
CHANGE: the loading state — use a spinner instead of the text 'Loading...'
REASON: the text shifts layout when it disappears
NEW REQUIREMENT: the spinner should use the existing --accent CSS variable"
// Claude: changes exactly one thing, correctly`}
            </CodeBlock>
            <LessonText>
              The KEEP / CHANGE / REASON / NEW REQUIREMENT structure forces you to think precisely before prompting. Half the time, writing it out makes you realise you already know the fix — the prompt is just communicating it to Claude.
            </LessonText>
            <LessonText>
              A good rule of thumb: <strong>if you need more than 3 refinement rounds, your first prompt was too vague.</strong> After a frustrating iteration, write out what the ideal first prompt would have looked like. You'll write better prompts next time.
            </LessonText>
            <ExerciseCard ex={EXERCISES[4]} completed={completedEx['ex5']} onToggle={() => toggleExercise('ex5')} />
          </div>
        )}

        {/* PROMPT LIBRARY */}
        <div style={{ marginBottom: 72 }}>
          <SectionLabel text="Prompt template library" />
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 12 }}>
            Copy-paste <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>prompts</em>
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.7 }}>
            All six prompts from across this module, in one place.
          </p>
          {PROMPTS.map((p, i) => (
            <PromptCard key={i} label={p.label} text={p.text} tag={p.technique} />
          ))}
        </div>

        {/* QUIZ */}
        <Quiz title="Prompting" questions={QUIZ_QUESTIONS} scoreMessages={SCORE_MSGS} />

        {/* CAPSTONE */}
        <div style={{ marginBottom: 72 }}>
          <SectionLabel text="Module capstone" />
          <div style={{ border: '2px solid var(--ink)', padding: '36px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 18, right: 20, fontSize: 9, letterSpacing: '0.25em', color: 'var(--faint)', textTransform: 'uppercase' }}>Capstone</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 12 }}>Improve VIBE:ADVANCED<br />using all 5 techniques</h2>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--muted)', marginBottom: 28, maxWidth: 600 }}>
              You're going to use prompt chaining, debugging, constraints, role-setting, and iterative refinement to add a real feature to this course site — a module completion tracker with local persistence and a visual progress ring on the home page.
            </p>
            <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
              {[
                ["Chain", "Use a 3-step chain: first ask Claude to plan the feature architecture, then implement it, then review the implementation for bugs"],
                ["Constrain", "Hard constraints: no new packages, CSS variables only for colours, must persist in localStorage"],
                ["Role", "Ask Claude (as a senior React developer) to review the implementation before you integrate it"],
                ["Debug", "Intentionally break one part of the feature. Practice writing a full debug prompt to fix it"],
                ["Refine", "Use iterative refinement to get the progress ring's visual style to match VIBE:ADVANCED's aesthetic exactly"]
              ].map(([badge, text], i) => (
                <li key={i} style={{ display: 'flex', gap: 16, fontSize: 12, lineHeight: 1.6, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, width: 64, height: 22, background: 'var(--ink)', color: 'var(--paper)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.1em' }}>{badge}</span>
                  <span style={{ color: 'var(--muted)', paddingTop: 2 }}>{text}</span>
                </li>
              ))}
            </ol>
            <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 12 }}>// done when you have</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  "A working progress ring on the home page that fills as you complete modules",
                  "Completion state persists across browser refreshes",
                  "Feature built using all 5 prompting techniques in sequence",
                  "At least one bug found, debugged, and fixed entirely through prompting",
                  "Pushed to GitHub and live on Vercel"
                ].map((d, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 10 }}>
                    <span style={{ color: 'var(--green)' }}>✓</span>{d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* NEXT MODULE TEASER */}
        <div style={{ border: '1px solid var(--rule)', padding: 32, marginBottom: 64, background: 'var(--ink)', color: 'var(--paper)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>// coming up — module 3</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 12 }}>Supabase Database</h2>
          <p style={{ fontSize: 12, lineHeight: 1.8, color: 'rgba(244,240,232,0.55)', maxWidth: 560 }}>
            Postgres + Auth + real-time subscriptions — all without writing backend code. You'll connect your React app to a live database and store your course progress in Supabase instead of localStorage.
          </p>
        </div>

        {/* NAV */}
        <ModuleNav prev={{ to: '/module/1', label: '01 React Foundations' }} next={{ to: '#', label: '03 Supabase' }} />

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function SectionLabel({ text }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
      {text}
      <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
    </div>
  );
}

function LessonHeading({ main, accent }) {
  return (
    <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1.1, marginBottom: 16 }}>
      {main}<br /><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{accent}</em>
    </h2>
  );
}

function LessonText({ children }) {
  return (
    <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--muted)', marginBottom: 16, maxWidth: 680 }}>
      {children}
    </p>
  );
}

function Callout({ children }) {
  return (
    <div style={{ borderLeft: '3px solid var(--accent)', padding: '16px 20px', margin: '24px 0', background: 'rgba(200,75,47,0.04)' }}>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, color: 'var(--muted)' }}>{children}</p>
    </div>
  );
}

