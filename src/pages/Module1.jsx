import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'

// ─── Code block helper (preserves syntax-highlighted HTML) ───
function CodeBlock({ lang, html }) {
  return (
    <div className="code-block">
      <span className="lang-tag">{lang}</span>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

// ─── Prompt card with copy button ───
function PromptCard({ label, text }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="prompt-card">
      <div className="prompt-header">
        <span className="prompt-label">{label}</span>
        <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="prompt-body">{text}</div>
    </div>
  )
}

// ─── Quiz ───
const CORRECT = { q1: 'b', q2: 'b', q3: 'c', q4: 'b', q5: 'c' }
const SCORE_MSGS = [
  'Keep going — re-read the sections where you got tripped up and try rephrasing those concepts in your own words.',
  'Solid foundation. Review the questions you missed, then move on to the mini-challenge.',
  'Good work. You\'ve got the core concepts. The mini-challenge will cement them.',
  'Strong. You\'re ready for the counter app challenge — go build it.',
  'Perfect. You clearly get the fundamentals. Time to build.',
]

const QUESTIONS = [
  {
    id: 'q1', num: '01', total: '05',
    text: 'What is the main reason to use React over plain HTML for a dynamic app?',
    options: [
      { key: 'a', text: 'React loads faster than plain HTML in all cases' },
      { key: 'b', text: 'React lets you describe UI as a function of state, so the DOM updates automatically when data changes' },
      { key: 'c', text: 'React is required by Vercel and Cloudflare to deploy apps' },
      { key: 'd', text: 'React replaces CSS and removes the need for styling' },
    ],
    explanation: '<strong>Correct — B.</strong> React\'s core value is its declarative model: you describe what the UI should look like for any given state, and React figures out the minimal DOM updates needed. This makes complex, dynamic UIs far easier to reason about than manual DOM manipulation.',
  },
  {
    id: 'q2', num: '02', total: '05',
    text: 'In JSX, how do you write a CSS class on an element?',
    options: [
      { key: 'a', text: null, html: '<code>class="my-class"</code>' },
      { key: 'b', text: null, html: '<code>className="my-class"</code>' },
      { key: 'c', text: null, html: '<code>cssClass="my-class"</code>' },
      { key: 'd', text: null, html: '<code>style="class: my-class"</code>' },
    ],
    explanation: '<strong>Correct — B.</strong> JSX is JavaScript, and <code>class</code> is a reserved keyword in JS. React uses <code>className</code> instead. Similarly, <code>for</code> becomes <code>htmlFor</code> on label elements.',
  },
  {
    id: 'q3', num: '03', total: '05',
    text: 'What does useState return?',
    options: [
      { key: 'a', text: 'A single value that updates automatically' },
      { key: 'b', text: 'An object with get and set methods' },
      { key: 'c', text: 'An array with the current state value and a function to update it' },
      { key: 'd', text: 'A Promise that resolves to the state value' },
    ],
    explanation: '<strong>Correct — C.</strong> <code>const [count, setCount] = useState(0)</code> — the array destructuring pattern gives you the current value and a setter. Calling the setter triggers a re-render with the new value.',
  },
  {
    id: 'q4', num: '04', total: '05',
    text: 'When should you use useEffect with an empty dependency array []?',
    options: [
      { key: 'a', text: 'When you want the effect to run after every render' },
      { key: 'b', text: 'When you want the effect to run only once, when the component first mounts' },
      { key: 'c', text: 'When you want the effect to never run' },
      { key: 'd', text: 'When the effect depends on all state variables' },
    ],
    explanation: '<strong>Correct — B.</strong> An empty <code>[]</code> tells React "this effect has no dependencies, so only run it once when the component mounts." This is the standard pattern for initial data fetching.',
  },
  {
    id: 'q5', num: '05', total: '05',
    text: 'What is the correct way to pass a value from a parent component to a child?',
    options: [
      { key: 'a', text: 'Store it in localStorage and read it in the child' },
      { key: 'b', text: 'Use a global variable declared outside both components' },
      { key: 'c', text: 'Pass it as a prop when rendering the child component' },
      { key: 'd', text: 'Call the child component as a regular function' },
    ],
    explanation: '<strong>Correct — C.</strong> Props are React\'s way of passing data down the component tree. <code>&lt;Child value={myValue} /&gt;</code> — the child receives it as <code>function Child({ value })</code>. Data flows one way: parent → child.',
  },
]

function Quiz() {
  const [answers, setAnswers] = useState({})  // { q1: 'b', ... }

  function answer(qid, chosen) {
    if (answers[qid] !== undefined) return
    setAnswers(prev => ({ ...prev, [qid]: chosen }))
  }

  const answered = Object.keys(answers)
  const allDone = answered.length === QUESTIONS.length
  const score = answered.filter(qid => answers[qid] === CORRECT[qid]).length

  return (
    <div className="quiz-section">
      <div className="section-label">Knowledge check</div>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 12 }}>
        React Foundations <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Quiz</em>
      </h2>
      <p className="quiz-intro">
        Five questions. Click an option to answer — you'll see the explanation immediately. No pressure, this is just for you.
      </p>

      {QUESTIONS.map(q => {
        const chosen = answers[q.id]
        const isAnswered = chosen !== undefined

        return (
          <div key={q.id} className="quiz-q">
            <div className="quiz-q-header">
              <div className="quiz-q-num">Question {q.num} / {q.total}</div>
              {q.text}
            </div>
            <div className="options">
              {q.options.map(opt => {
                let cls = 'option'
                if (isAnswered) {
                  cls += ' disabled'
                  if (opt.key === CORRECT[q.id]) cls += ' correct'
                  else if (opt.key === chosen) cls += ' wrong'
                }
                return (
                  <div
                    key={opt.key}
                    className={cls}
                    onClick={() => answer(q.id, opt.key)}
                  >
                    <span className="opt-key">{opt.key.toUpperCase()}</span>
                    {opt.html
                      ? <span dangerouslySetInnerHTML={{ __html: opt.html }} />
                      : <span>{opt.text}</span>
                    }
                  </div>
                )
              })}
            </div>
            {isAnswered && (
              <div
                className="quiz-explanation"
                dangerouslySetInnerHTML={{ __html: q.explanation }}
              />
            )}
          </div>
        )
      })}

      {allDone && (
        <div className="quiz-score-bar">
          <div>
            <div className="score-num">{score}/{QUESTIONS.length}</div>
            <div className="score-label">your score</div>
          </div>
          <div className="score-msg">{SCORE_MSGS[score] || SCORE_MSGS[4]}</div>
        </div>
      )}
    </div>
  )
}

// ─── Code content strings ───
const CODE_VITE = `<span class="cm"># Scaffold a new React app with Vite</span>
<span class="kw">npm</span> create vite@latest my-app -- --template react
<span class="kw">cd</span> my-app
<span class="kw">npm</span> install
<span class="kw">npm</span> run dev`

const CODE_JSX1 = `<span class="cm">// A simple component — just a function that returns JSX</span>
<span class="kw">function</span> <span class="fn">Greeting</span>({ name }) {
  <span class="kw">return</span> (
    <span class="tag">&lt;div</span> <span class="attr">className</span>=<span class="str">"greeting"</span><span class="tag">&gt;</span>
      <span class="tag">&lt;h1&gt;</span>Hello, {'{'}name{'}'}!<span class="tag">&lt;/h1&gt;</span>
      <span class="tag">&lt;p&gt;</span>Welcome to vibe coding.<span class="tag">&lt;/p&gt;</span>
    <span class="tag">&lt;/div&gt;</span>
  );
}

<span class="cm">// Using it — props are passed like HTML attributes</span>
<span class="kw">function</span> <span class="fn">App</span>() {
  <span class="kw">return</span> <span class="tag">&lt;Greeting</span> <span class="attr">name</span>=<span class="str">"JB"</span> <span class="tag">/&gt;</span>;
}`

const CODE_JSX2 = `<span class="cm">// Composing components together</span>
<span class="kw">function</span> <span class="fn">Card</span>({ title, children }) {
  <span class="kw">return</span> (
    <span class="tag">&lt;div</span> <span class="attr">className</span>=<span class="str">"card"</span><span class="tag">&gt;</span>
      <span class="tag">&lt;h2&gt;</span>{'{'}title{'}'}<span class="tag">&lt;/h2&gt;</span>
      <span class="tag">&lt;div</span> <span class="attr">className</span>=<span class="str">"card-body"</span><span class="tag">&gt;</span>{'{'}children{'}'}<span class="tag">&lt;/div&gt;</span>
    <span class="tag">&lt;/div&gt;</span>
  );
}

<span class="kw">function</span> <span class="fn">App</span>() {
  <span class="kw">return</span> (
    <span class="tag">&lt;Card</span> <span class="attr">title</span>=<span class="str">"My First Component"</span><span class="tag">&gt;</span>
      <span class="tag">&lt;p&gt;</span>This content is passed as children.<span class="tag">&lt;/p&gt;</span>
    <span class="tag">&lt;/Card&gt;</span>
  );
}`

const CODE_USESTATE = `<span class="kw">import</span> { useState } <span class="kw">from</span> <span class="str">'react'</span>;

<span class="kw">function</span> <span class="fn">Counter</span>() {
  <span class="cm">// [currentValue, setterFunction] = useState(initialValue)</span>
  <span class="kw">const</span> [count, setCount] = useState(<span class="num">0</span>);

  <span class="kw">return</span> (
    <span class="tag">&lt;div&gt;</span>
      <span class="tag">&lt;p&gt;</span>Count: {'{'}count{'}'}<span class="tag">&lt;/p&gt;</span>
      <span class="tag">&lt;button</span> <span class="attr">onClick</span>={() =&gt; setCount(count + <span class="num">1</span>)}<span class="tag">&gt;</span>Increment<span class="tag">&lt;/button&gt;</span>
      <span class="tag">&lt;button</span> <span class="attr">onClick</span>={() =&gt; setCount(<span class="num">0</span>)}<span class="tag">&gt;</span>Reset<span class="tag">&lt;/button&gt;</span>
    <span class="tag">&lt;/div&gt;</span>
  );
}`

const CODE_USEEFFECT = `<span class="kw">import</span> { useState, useEffect } <span class="kw">from</span> <span class="str">'react'</span>;

<span class="kw">function</span> <span class="fn">Counter</span>() {
  <span class="kw">const</span> [count, setCount] = useState(<span class="num">0</span>);

  <span class="cm">// Runs after every render where count changes</span>
  useEffect(() =&gt; {
    document.title = \`Count: \${'{'}count{'}'}\`;
  }, [count]); <span class="cm">// ← dependency array: when to re-run</span>

  <span class="cm">// [] = run once on mount only</span>
  useEffect(() =&gt; {
    console.<span class="fn">log</span>(<span class="str">'Component mounted'</span>);
  }, []);

  <span class="kw">return</span> <span class="tag">&lt;button</span> <span class="attr">onClick</span>={() =&gt; setCount(c =&gt; c + <span class="num">1</span>)}<span class="tag">&gt;</span>{'{'}count{'}'}<span class="tag">&lt;/button&gt;</span>;
}`

// ─── Main page ───
export default function Module1() {
  useEffect(() => {
    const key = 'vibe-m1-visited'
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      const prog = JSON.parse(localStorage.getItem('vibe-progress') || '{}')
      prog[1] = false
      localStorage.setItem('vibe-progress', JSON.stringify(prog))
    }
  }, [])

  return (
    <div className="wrap">
      <Header variant="module" />

      {/* HERO */}
      <div className="module-hero">
        <div className="module-kicker">Module 01 — Foundations</div>
        <h1>React<br /><em>Foundations</em></h1>
        <div className="hero-meta">
          <div className="meta-item"><strong>Estimated time</strong>3–4 hours</div>
          <div className="meta-item"><strong>Difficulty</strong>Beginner → Intermediate</div>
          <div className="meta-item"><strong>Stack</strong>React 18 · Vite · JSX</div>
          <div className="meta-item"><strong>Outcome</strong>Counter app + site conversion</div>
        </div>
      </div>

      {/* OBJECTIVES */}
      <div className="objectives">
        <div className="obj-title">// learning objectives</div>
        <ul className="obj-list">
          <li>Understand what React is and why it matters for vibe coders building real apps</li>
          <li>Prompt an AI to scaffold a full Vite + React project from scratch</li>
          <li>Read and write JSX — components, props, and how data flows between them</li>
          <li>Use useState to manage UI state and useEffect to respond to changes</li>
          <li>Build a counter app entirely through AI prompting, then extend it yourself</li>
          <li>Convert this course site from plain HTML into a React app (Module 1 capstone)</li>
        </ul>
      </div>

      {/* LESSON 1 */}
      <div className="lesson-section">
        <div className="section-label">Lesson 1 of 4</div>
        <h2>What is React and why<br />does it matter <em>to you?</em></h2>
        <p>You've already shipped a page with plain HTML and CSS. That works great for static content. But the moment you want things to <strong>change</strong> — a button that updates a score, a form that shows different fields based on input, a leaderboard that refreshes — you need a way to manage that changing state.</p>
        <p>React is a JavaScript library that solves exactly this. Instead of manually finding elements in the DOM and updating them, you describe <strong>what the UI should look like</strong> for any given state, and React handles the updates. It's declarative, not imperative.</p>
        <p>For vibe coders, React is the difference between asking AI to "add a button" and asking AI to "build me a full interactive app." The AI knows React deeply — it will scaffold components, wire up state, and handle edge cases you haven't thought of yet. Your job is to prompt it well.</p>
        <div className="callout">
          <p><strong>The vibe coder's take:</strong> You don't need to memorise React's internals. You need to understand its concepts well enough to prompt precisely and debug intelligently. That's exactly what this module teaches.</p>
        </div>
        <h2 className="lesson-subhead">Scaffolding with Vite</h2>
        <p>Vite is the fastest way to get a React app running. One command, and you have a fully working dev environment with hot reload. Here's what you'd run — but in this module, you'll prompt your AI to do it and explain each part.</p>
        <CodeBlock lang="bash" html={CODE_VITE} />
        <p>This creates a project structure with <strong>src/</strong> for your components, <strong>public/</strong> for static assets, and a <strong>vite.config.js</strong> that handles everything. The dev server runs at localhost:5173 with instant hot reload.</p>
      </div>

      {/* LESSON 2 */}
      <div className="lesson-section">
        <div className="section-label">Lesson 2 of 4</div>
        <h2>JSX, Components<br />and <em>Props</em></h2>
        <p>JSX looks like HTML but it's JavaScript. It's how you describe UI in React. Every piece of your UI is a <strong>component</strong> — a function that takes some input (props) and returns some JSX to render.</p>
        <CodeBlock lang="jsx" html={CODE_JSX1} />
        <p>Key things to notice: component names are <strong>capitalised</strong> (React uses this to tell them apart from HTML tags). Props are destructured from the first argument. JSX uses <strong>className</strong> instead of class, and JavaScript expressions go inside curly braces <strong>{'{ }'}</strong>.</p>
        <p>Components can contain other components — that's how you build complex UIs from simple, reusable pieces. Your whole app is a tree of components, starting from a root <strong>App</strong>.</p>
        <CodeBlock lang="jsx" html={CODE_JSX2} />
      </div>

      {/* LESSON 3 */}
      <div className="lesson-section">
        <div className="section-label">Lesson 3 of 4</div>
        <h2>State with<br /><em>useState</em></h2>
        <p>Props are data passed <em>into</em> a component. State is data that lives <em>inside</em> a component and can change over time. When state changes, React re-renders the component automatically — you never touch the DOM.</p>
        <p>The <strong>useState</strong> hook gives you a state variable and a setter function. Call the setter and React re-renders with the new value.</p>
        <CodeBlock lang="jsx" html={CODE_USESTATE} />
        <p>This is the core loop of React: <strong>state changes → component re-renders → UI updates</strong>. You never write document.getElementById or innerHTML. You just update state and trust React to handle the rest.</p>
        <div className="callout">
          <p><strong>Vibe coder tip:</strong> When prompting for state, describe what can <em>change</em> in your UI, not how to implement it. "I need a counter that tracks a number, increments on button click, and resets to zero" gives the AI everything it needs.</p>
        </div>
        <h2 className="lesson-subhead">Side effects with useEffect</h2>
        <p>useEffect runs code <em>after</em> React renders. Use it for anything that reaches outside the component — fetching data, setting up subscriptions, updating the document title.</p>
        <CodeBlock lang="jsx" html={CODE_USEEFFECT} />
      </div>

      {/* LESSON 4 */}
      <div className="lesson-section">
        <div className="section-label">Lesson 4 of 4 — Prompt template library</div>
        <h2>Prompts that<br /><em>actually work</em></h2>
        <p>These are copy-paste prompts for the most common React tasks. Use them as starting points and adapt to your needs.</p>

        <PromptCard label="Scaffold a React app" text={`You are an expert React developer. Scaffold a new React 18 app using Vite with the following setup:
- Use the react template (not react-ts)
- Create a clean folder structure: src/components/, src/pages/, src/hooks/
- Set up React Router v6 with at least two routes: Home and About
- Add a shared Navbar component that appears on all pages
- Use vanilla CSS (no Tailwind) with CSS variables for theming

Walk me through each file you create and explain what it does. Start with the Vite scaffold command, then build up from there.`} />

        <PromptCard label="Build a stateful component" text={`Build me a React component called [ComponentName] that does the following:
- [describe what it displays]
- [describe what the user can do — clicks, inputs, etc.]
- [describe what should change when they do it]

Use useState for state management. Keep it as a single functional component. Add clear comments explaining what each piece of state does and why. Export it as default.`} />

        <PromptCard label="useEffect for data fetching" text={`Add data fetching to my React component using useEffect and fetch(). Requirements:
- Fetch from this URL: [your API endpoint]
- Show a loading state while fetching
- Show an error state if the fetch fails
- Display the data when it arrives
- Only fetch once when the component mounts

Use useState for loading, error, and data. Explain the dependency array choice.`} />

        <PromptCard label="Debug a React error" text={`I'm getting this error in my React app:

[paste the full error message here]

Here is the component where the error occurs:

[paste your component code]

Explain what is causing this error in plain English, then show me the corrected code with comments explaining what you changed and why.`} />

        <PromptCard label="Convert HTML page to React" text={`Convert this HTML page into a React component. Rules:
- Keep all the existing CSS classes and structure
- Extract any repeated sections into sub-components
- Replace any onclick="" attributes with proper React event handlers
- If there's any state (things that change), use useState
- The main export should be a default function component

Here is the HTML:
[paste your HTML here]`} />
      </div>

      {/* QUIZ */}
      <Quiz />

      {/* MINI CHALLENGE */}
      <div className="challenge-section">
        <div className="section-label">Mini challenge</div>
        <div className="challenge-card">
          <h2>Build a Counter App<br />by Prompting</h2>
          <p className="desc">Your mission: use an AI tool (Claude, Cursor, or Copilot) to build a counter app from scratch — without writing the code yourself. You describe it, the AI builds it, you understand it.</p>
          <ol className="challenge-steps">
            <li><span className="step-badge">1</span><span>Prompt your AI to scaffold a new Vite + React app and explain the folder structure it creates.</span></li>
            <li><span className="step-badge">2</span><span>Ask it to build a Counter component with: a displayed count, an Increment button (+1), a Decrement button (−1), and a Reset button back to zero.</span></li>
            <li><span className="step-badge">3</span><span>Extend it: ask the AI to add a step size input — so the user can set how much each click increments or decrements.</span></li>
            <li><span className="step-badge">4</span><span>Ask the AI to add a min/max limit: the counter should not go below 0 or above 100, and the buttons should disable at the limits.</span></li>
            <li><span className="step-badge">5</span><span>Push to GitHub and deploy to Vercel. Paste your live URL somewhere you can find it.</span></li>
          </ol>
          <div className="deliverables">
            <div className="deliverables-label">// done when you have</div>
            <ul className="deliverable-list">
              <li>A working counter app live on Vercel</li>
              <li>Step size input that changes increment/decrement amount</li>
              <li>Buttons disabled correctly at min (0) and max (100)</li>
              <li>You can explain what useState is doing in your own words</li>
              <li>GitHub repo with at least 3 meaningful commit messages</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CONVERSION TEASER */}
      <div className="conversion-teaser">
        <div className="teaser-kicker">// coming up — module 1 capstone</div>
        <h2>Convert this site to React</h2>
        <p>Once you've shipped the counter app, you'll come back here and convert the entire VIBE:ADVANCED course site from plain HTML files into a proper Vite + React app — with React Router, shared components, and a real project structure. That conversion exercise is Module 1's final boss.</p>
      </div>

      {/* MODULE NAV */}
      <div className="module-nav">
        <Link to="/" className="nav-btn">← Back to course</Link>
        <a href="#" className="nav-btn next">02 Advanced Prompting →</a>
      </div>
    </div>
  )
}
