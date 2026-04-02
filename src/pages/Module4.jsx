import { useState, useEffect } from 'react'
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
  "APIs have a lot of moving parts — revisit the lessons and work through the exercises before moving on.",
  "Getting there. Re-read the sections on the questions you missed, especially async patterns.",
  "Solid. You understand the fundamentals. The exercises will make fetch() feel natural.",
  "Strong. You clearly get the request/response model. Now wire it into a real app.",
  "Perfect. Go build something that talks to the outside world.",
]

const QUESTIONS = [
  {
    id: 'q1', num: '01', total: '05', correctKey: 'c',
    text: "Why can't you make a useEffect callback directly async?",
    options: [
      { key: 'a', text: "async/await syntax is not supported inside React components" },
      { key: 'b', text: "Async functions can't be cancelled, which causes memory leaks" },
      { key: 'c', text: "An async function always returns a Promise, but useEffect expects either nothing or a cleanup function — returning a Promise breaks the cleanup mechanism" },
      { key: 'd', text: "useEffect only runs synchronously and can't wait for a Promise to resolve" },
    ],
    explanation: "<strong>Correct — C.</strong> useEffect's return value must be a cleanup function or undefined. An async function always returns a Promise — even if you don't explicitly return anything. The fix: define an async function inside the effect and call it immediately, so the effect itself stays synchronous.",
  },
  {
    id: 'q2', num: '02', total: '05', correctKey: 'b',
    text: "Which environment variable name would Vite expose to the browser?",
    options: [
      { key: 'a', text: "API_KEY" },
      { key: 'b', text: "VITE_API_KEY" },
      { key: 'c', text: "REACT_APP_API_KEY" },
      { key: 'd', text: "PUBLIC_API_KEY" },
    ],
    explanation: "<strong>Correct — B.</strong> Vite only exposes variables prefixed with VITE_ to the browser bundle, via import.meta.env. REACT_APP_ is the Create React App convention. Variables without a recognised prefix are intentionally kept private — they never appear in the compiled output.",
  },
  {
    id: 'q3', num: '03', total: '05', correctKey: 'c',
    text: "What does response.ok check, and why is it important?",
    options: [
      { key: 'a', text: "Whether the response body is valid JSON" },
      { key: 'b', text: "Whether the fetch request was constructed correctly before it was sent" },
      { key: 'c', text: "Whether the HTTP status code is in the 200–299 range — fetch doesn't throw on 4xx or 5xx responses" },
      { key: 'd', text: "Whether the server responded within the default timeout window" },
    ],
    explanation: "<strong>Correct — C.</strong> fetch() only rejects its Promise on network failure (no connection, DNS error). A 404 or 500 still resolves — response.ok is false. If you don't check it, your app will try to parse an error HTML page as JSON and show confusing bugs. Always check response.ok before calling response.json().",
  },
  {
    id: 'q4', num: '04', total: '05', correctKey: 'b',
    text: "What is the correct way to cancel a fetch when a component unmounts?",
    options: [
      { key: 'a', text: "Call fetch.cancel() inside the useEffect return function" },
      { key: 'b', text: "Create an AbortController, pass its signal to fetch(), and call controller.abort() in the useEffect cleanup function" },
      { key: 'c', text: "Wrap the fetch in a try/catch — React will handle the cancellation automatically" },
      { key: 'd', text: "Use a ref to track the component mount state and skip setState if the ref is false" },
    ],
    explanation: "<strong>Correct — B.</strong> AbortController is the browser-native way to cancel in-flight fetch requests. Pass { signal: controller.signal } as the second argument to fetch(). In the useEffect cleanup, call controller.abort(). The fetch will throw an AbortError, which you should catch and ignore. This prevents setState being called on an unmounted component.",
  },
  {
    id: 'q5', num: '05', total: '05', correctKey: 'c',
    text: "What does the dependency array in useEffect control?",
    options: [
      { key: 'a', text: "Which variables the effect is allowed to read from the component's scope" },
      { key: 'b', text: "The order in which multiple useEffect calls run on the same component" },
      { key: 'c', text: "When the effect re-runs — it fires again whenever any value in the array has changed since the last render" },
      { key: 'd', text: "Which props and state values are passed down to child components rendered inside the effect" },
    ],
    explanation: "<strong>Correct — C.</strong> An empty array [] means 'run once on mount'. No array means 'run after every render'. An array with values means 'run when any of these change'. The dependency array is how you tell React: 'this effect depends on this data — re-run it when the data changes'.",
  },
]

// ── Prompt templates ───────────────────────────────────────────────────────
const PROMPTS = [
  {
    label: "Scaffold a fetch with loading/error/data states",
    technique: "Fetching",
    text: `Add data fetching to my React component. I need to fetch from this URL:
[paste the API endpoint URL]

Requirements:
- Use useEffect + async function inside (not async useEffect directly)
- Track three states: loading (boolean), error (string or null), data (array or null)
- Show a loading indicator while fetching
- Show an error message if the fetch fails or response.ok is false
- Show an empty state if data comes back as an empty array
- Clean up with an AbortController so the fetch cancels if the component unmounts

No additional libraries. Plain fetch() with async/await. Add a comment explaining what the endpoint returns.`,
  },
  {
    label: "Build a reusable useFetch hook",
    technique: "Custom hook",
    text: `Build a custom React hook called useFetch(url) that I can reuse across any component that needs to fetch data.

The hook should return: { data, loading, error, refetch }

Requirements:
- Accept a url string as its only parameter
- Re-fetch automatically whenever the url changes
- Expose a refetch() function that re-fires the fetch manually (for retry buttons)
- Use AbortController to cancel the in-flight request when url changes or component unmounts
- Set loading: true at the start of each fetch, false when done (success or error)
- Set error to the message string on failure, null on success
- Set data to the parsed JSON on success, null on failure

No additional libraries. The hook should live in src/hooks/useFetch.js.
Add a JSDoc comment explaining usage.`,
  },
  {
    label: "Read and display data from a specific endpoint",
    technique: "Display",
    text: `I want to fetch data from this API and display it in my React component:

Endpoint: [paste the full URL]
Response shape: [describe what the JSON looks like, or paste an example]

Build a component that:
1. Fetches the data on mount
2. Maps the response into a styled list or grid
3. Shows a loading skeleton (not just "Loading..." text) while fetching
4. Shows an error state with a retry button if the fetch fails
5. Shows a friendly empty state if the API returns no results

Hard constraints:
- CSS classes only, no inline styles
- No additional libraries
- Destructure only the fields you actually use from the response`,
  },
  {
    label: "Add a retry mechanism to a failed fetch",
    technique: "Error handling",
    text: `My component fetches data but when it fails, the user is stuck. Add a retry mechanism.

Current component: [paste your component]

I need:
1. An error state that shows a clear message and a "Try again" button
2. Clicking "Try again" re-fires the exact same fetch without a page reload
3. While retrying, show the loading state again (don't show the error and loading at the same time)
4. If the retry also fails, show the error again — don't get stuck in a loop

The retry logic should work with my existing AbortController cleanup. Don't change the fetch logic itself — just wire up the retry trigger.`,
  },
  {
    label: "Store and access API config in .env.local",
    technique: "Config",
    text: `I want to move my API base URL (and optionally an API key) out of my component and into environment variables.

My current setup: Vite + React
What I need to store: [describe — e.g. "the base URL for the Open Trivia DB" or "a public API key for the DEV.to API"]

Please:
1. Show me exactly what to add to .env.local (with placeholder values)
2. Show me how to read it in a component using import.meta.env
3. Explain what happens if the variable is undefined at runtime
4. Show me how to add a check that throws a clear error if the variable is missing, so I catch config problems early

Hard constraint: use the VITE_ prefix (this is Vite, not Create React App).`,
  },
  {
    label: "Debug a fetch that returns 200 but shows wrong data",
    technique: "Debugging",
    text: `My fetch call returns a 200 status but the data my component displays is wrong (or empty, or undefined). Help me debug it.

Here is my fetch code:
[paste the fetch and the state-setting code]

Here is what the API response actually looks like (from the Network tab):
[paste the raw JSON response]

Here is what my component renders:
[describe what shows up — e.g. "the list is empty", "I see [object Object]", "the field is undefined"]

Please:
1. Identify the mismatch between the response shape and how I'm accessing it
2. Show me the corrected data access path
3. Explain why this happened so I don't repeat it
4. Suggest one defensive coding habit that would have caught this earlier`,
  },
]

// ── Lesson data ────────────────────────────────────────────────────────────
const LESSONS = [
  {
    title: "What is a REST API",
    heading: "What is a", accent: "REST API?",
    lang: "jsx",
    body: [
      "A REST API is a way for your app to talk to a server over HTTP. You make a request to a URL (the endpoint), the server processes it and sends back data — almost always JSON. fetch() is the browser-native function that makes these requests.",
      "Every request has a method that describes the intent: GET fetches data, POST creates something new, PUT or PATCH updates it, DELETE removes it. For reading public data (which is most of what you'll do as a front-end developer), you'll use GET almost exclusively.",
      "The request/response cycle: your app sends a request with a URL and optional headers → the server processes it → it sends back a response with a status code (200 = OK, 404 = not found, 500 = server error) and a body (usually JSON). You never see the server code — you just agree on the contract: the shape of the URL and the shape of the response.",
    ],
    code: `// The simplest possible fetch — GET request to a public API
fetch('https://opentdb.com/api.php?amount=5&type=multiple')
  .then(response => response.json())
  .then(data => console.log(data))

// What the response looks like:
// {
//   "response_code": 0,
//   "results": [
//     {
//       "category": "Science: Computers",
//       "difficulty": "medium",
//       "question": "What does HTML stand for?",
//       "correct_answer": "HyperText Markup Language",
//       "incorrect_answers": ["..."]
//     }
//   ]
// }`,
    callout: {
      label: "Reading API docs",
      text: "Every public API has documentation that describes its endpoints (URLs), parameters (what you can pass), and response shapes (what you get back). Before writing any code, read the docs and paste an example response into your chat with Claude — it will understand the shape immediately and write the correct data access code.",
    },
    exercise: {
      id: 'ex1',
      title: "Fetch the Open Trivia DB and log the response",
      duration: "10 min",
      desc: "Fetch the Open Trivia DB API from a React component and console.log the full response. The goal is to understand the response shape before you touch the UI.",
      steps: [
        "Open any component in your VIBE:ADVANCED project",
        "Add a useEffect that fetches https://opentdb.com/api.php?amount=5&type=multiple",
        "console.log the full response object — don't try to render it yet",
        "Open DevTools → Network tab, find the request, and look at the Response tab",
        "Identify: where are the questions? What fields does each question have?",
        "Now open DevTools → Console — compare what you logged with what you saw in the Network tab",
      ],
      reflection: "Why is it worth looking at the raw response in the Network tab before writing any display code? What would you miss if you went straight to the UI?",
    },
  },
  {
    title: "Environment variables",
    heading: "Environment", accent: "Variables",
    lang: "jsx",
    body: [
      "An environment variable is a value that lives outside your code — in a config file that doesn't get committed to Git. In Vite, these live in a file called .env.local at the root of your project. You access them in your code via import.meta.env.",
      "Vite only exposes variables that start with VITE_ to the browser bundle. Anything without the prefix stays on the build server — your app code can't read it. This is a safety feature: it prevents you from accidentally shipping secret keys to the browser.",
      "The rule of thumb: public API base URLs and public API keys (designed to be used in browsers) are safe to put in VITE_ variables. Secret keys, service_role keys, database passwords — never. Those belong in server-side code only.",
    ],
    code: `// .env.local (never commit this file)
VITE_TRIVIA_API_URL=https://opentdb.com/api.php
VITE_DEVTO_API_URL=https://dev.to/api

// Reading them in a component
const triviaUrl = import.meta.env.VITE_TRIVIA_API_URL
const devtoUrl = import.meta.env.VITE_DEVTO_API_URL

// Building a URL with parameters
const url = \`\${triviaUrl}?amount=5&type=multiple\`

// If the variable is missing, it will be undefined at runtime
// A safe guard:
if (!triviaUrl) {
  throw new Error('VITE_TRIVIA_API_URL is not set in .env.local')
}`,
    callout: {
      label: "Vite vs Create React App",
      text: "If you ever work in a Create React App project, the prefix is REACT_APP_ and you use process.env.REACT_APP_KEY. In Vite it's always import.meta.env.VITE_KEY. Claude will usually pick the right one automatically if you tell it which build tool you're using — but double-check.",
    },
    exercise: {
      id: 'ex2',
      title: "Move the API URL into .env.local",
      duration: "10 min",
      desc: "Move the Open Trivia DB base URL into an environment variable and access it via import.meta.env. Then break it deliberately to see what happens.",
      steps: [
        "Create .env.local in the root of your VIBE:ADVANCED project (if it doesn't already exist)",
        "Add: VITE_TRIVIA_API_URL=https://opentdb.com/api.php",
        "Update your fetch call to use import.meta.env.VITE_TRIVIA_API_URL instead of the hardcoded URL",
        "Confirm it still works — the console.log from Exercise 1 should still show data",
        "Now rename the variable to TRIVIA_API_URL (remove the VITE_ prefix) and reload",
        "Observe: import.meta.env.VITE_TRIVIA_API_URL is now undefined — what breaks?",
        "Restore the VITE_ prefix and confirm it works again",
      ],
      reflection: "What error did you get when the variable was undefined? How would a clear error check at the top of the file have helped?",
    },
  },
  {
    title: "Async patterns",
    heading: "Async Patterns", accent: "in React",
    lang: "jsx",
    body: [
      "Every fetch call is asynchronous — your component renders before the data arrives. This means you always need to handle three states: loading (the request is in flight), error (something went wrong), and data (the response arrived). Skipping any of these leads to broken UIs or silent failures.",
      "The catch with useEffect: you can't make the callback function itself async, because async functions return a Promise and useEffect expects either a cleanup function or nothing. The pattern is to define an async function inside the effect and call it immediately.",
    ],
    code: `import { useState, useEffect } from 'react'

function TriviaList() {
  const [questions, setQuestions] = useState(null)   // null = not loaded yet
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    // ✓ Define async inside the effect, call it immediately
    async function fetchQuestions() {
      try {
        const res = await fetch(
          \`\${import.meta.env.VITE_TRIVIA_API_URL}?amount=5&type=multiple\`
        )
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
        const json = await res.json()
        setQuestions(json.results)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [])  // empty array = run once on mount

  if (loading) return <p>Loading questions…</p>
  if (error)   return <p>Error: {error}</p>
  if (!questions?.length) return <p>No questions found.</p>

  return <ul>{questions.map((q, i) => <li key={i}>{q.question}</li>)}</ul>
}`,
    callout: {
      label: "Three states, always",
      text: "Every data fetch needs all three states handled. loading prevents a flash of empty content. error gives the user actionable feedback instead of a blank screen. The empty state (data came back but was empty) is easy to forget — and it shows up constantly with real APIs. Make it a habit to handle all three before building the happy path UI.",
    },
    exercise: {
      id: 'ex3',
      title: "Add all three states and test each one",
      duration: "20 min",
      desc: "Add loading, error, and empty states to the component from Exercise 1. Then test each state deliberately using DevTools.",
      steps: [
        "Add loading, error, and questions state to your trivia component",
        "Wrap the fetch in an async function inside useEffect — with try/catch/finally",
        "Render a loading message while loading is true",
        "Render the error message if error is not null",
        "Render an empty state message if questions is an empty array",
        "Test loading: throttle network to Slow 3G in DevTools → Network → No throttling dropdown",
        "Test error: change the URL to a bad endpoint (e.g. /bad-url) and reload",
        "Test empty: add &amount=0 to the URL — the API returns an empty results array",
      ],
      reflection: "Which state was easiest to forget? What would the user have seen if you hadn't handled it?",
    },
  },
  {
    title: "Calling a public API",
    heading: "Calling a", accent: "Public API",
    lang: "jsx",
    body: [
      "The Open Trivia DB is a free, no-auth-required API that returns quiz questions. It's a perfect first real API to work with: clear documentation, consistent response shape, no rate limits for reasonable use. The base URL is https://opentdb.com/api.php — pass amount, category, difficulty, and type as query parameters.",
      "The key skill is mapping an API response to JSX. Read the response shape, identify the array you want to render, and map() over it. The response shape is your contract — if it changes, your component breaks. Always log the raw response first, agree on the shape, then write the display code.",
    ],
    code: `// Response shape from Open Trivia DB
// {
//   "response_code": 0,
//   "results": [
//     {
//       "category": "Science: Computers",
//       "type": "multiple",
//       "difficulty": "medium",
//       "question": "What does CPU stand for?",
//       "correct_answer": "Central Processing Unit",
//       "incorrect_answers": ["...", "...", "..."]
//     }
//   ]
// }

// Mapping to JSX
{questions.map((q, i) => (
  <div key={i} className="trivia-card">
    <div className="trivia-meta">
      <span className="trivia-category">{q.category}</span>
      <span className={\`trivia-badge \${q.difficulty}\`}>{q.difficulty}</span>
    </div>
    {/* API returns HTML-encoded strings — decode them */}
    <p
      className="trivia-question"
      dangerouslySetInnerHTML={{ __html: q.question }}
    />
  </div>
))}`,
    callout: {
      label: "HTML entities in API responses",
      text: "The Open Trivia DB encodes special characters as HTML entities — &amp; becomes &, &#039; becomes ', and so on. If you render them as plain text, you'll see garbled strings. Use dangerouslySetInnerHTML={{ __html: q.question }} to decode them. This is safe here because the API output is pre-sanitised — but always think twice before using dangerouslySetInnerHTML with user-generated content.",
    },
    exercise: {
      id: 'ex4',
      title: "Display the trivia questions as a styled list",
      duration: "20 min",
      desc: "Map the Open Trivia DB response into a styled list of cards. Each question shows the category, a difficulty badge, and the question text.",
      steps: [
        "Build on the component from Exercise 3 — you already have the data fetching",
        "Map questions to a card layout: category, difficulty badge, and question text",
        "Use CSS classes (no inline styles) — create .trivia-card, .trivia-category, .trivia-badge in index.css",
        "Style the difficulty badge differently for 'easy', 'medium', and 'hard' using class modifiers",
        "Decode HTML entities using dangerouslySetInnerHTML on the question text",
        "Verify: check the Network tab to confirm only one request fired",
      ],
      reflection: "What would break if the API changed the 'results' key to 'questions'? How would you catch that kind of change early?",
    },
  },
  {
    title: "Defensive response handling",
    heading: "Defensive", accent: "Response Handling",
    lang: "jsx",
    body: [
      "APIs fail in more ways than you expect: the server is down (network error, fetch throws), the server returns a 4xx or 5xx status (fetch doesn't throw — you have to check response.ok), the server returns 200 with an error body (some APIs do this), or the response shape is different from what you expected (API version changes, optional fields missing).",
      "Defensive handling means writing code that degrades gracefully in all of these cases. The tools: check response.ok before parsing JSON, use optional chaining (?.) when accessing nested fields, provide fallback values with || or ??, and always wrap your async code in try/catch.",
    ],
    code: `async function fetchQuestions() {
  try {
    const res = await fetch(url)

    // ✓ Check HTTP status — fetch doesn't throw on 4xx/5xx
    if (!res.ok) {
      throw new Error(\`Server returned \${res.status}: \${res.statusText}\`)
    }

    const json = await res.json()

    // ✓ Some APIs return 200 with an error code in the body
    if (json.response_code !== 0) {
      throw new Error(\`API error code: \${json.response_code}\`)
    }

    // ✓ Optional chaining + fallback for unexpected shapes
    const results = json?.results ?? []
    setQuestions(results)

  } catch (err) {
    // AbortError fires when the component unmounts — don't treat it as a real error
    if (err.name === 'AbortError') return
    setError(err.message)
  } finally {
    setLoading(false)
  }
}`,
    callout: {
      label: "The AbortError exception",
      text: "When you abort a fetch using AbortController, the fetch throws an AbortError. This is expected behaviour — not a real error. Always check err.name === 'AbortError' in your catch block and return early without setting the error state. If you don't, every component unmount (including React StrictMode's double-invoke) will flash an error message to the user.",
    },
    exercise: {
      id: 'ex5',
      title: "Break the API and add a retry button",
      duration: "20 min",
      desc: "Test your error handling by breaking the fetch intentionally. Then add a retry button that re-fires the fetch without a page reload.",
      steps: [
        "Change your API URL to something invalid (e.g. https://opentdb.com/bad-endpoint)",
        "Verify your error state catches it and shows a message — not a blank screen or a crash",
        "Add a 'Try again' button that re-fires the fetch",
        "Implement retry: a state variable (e.g. retryCount) that increments when the button is clicked",
        "Add retryCount to the useEffect dependency array — it will re-run the fetch when it changes",
        "Test: load the page (error), click 'Try again' (loading → error), fix the URL (loading → data)",
        "Restore the correct URL and verify everything still works",
      ],
      reflection: "What's the difference between a network error (fetch throws) and an HTTP error (response.ok is false)? Why does fetch not throw on 404?",
    },
  },
  {
    title: "useFetch hook",
    heading: "Building a Reusable", accent: "useFetch Hook",
    lang: "jsx",
    body: [
      "Every component that fetches data has the same boilerplate: loading state, error state, data state, useEffect, try/catch, cleanup. Once you have two components doing this, you should extract it into a custom hook. The hook becomes a single place to get fetch behaviour right — with cancellation, error handling, and retry — and every component just calls one line.",
      "A good useFetch(url) hook takes a URL, handles all the async logic internally, and returns { data, loading, error, refetch }. The component body is left clean — it only decides what to render, not how to fetch. This separation makes components easier to read, test, and reuse.",
    ],
    code: `// src/hooks/useFetch.js
import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useFetch(url) — generic data-fetching hook
 * Returns { data, loading, error, refetch }
 * Re-fetches automatically when url changes.
 * Cancels in-flight requests on url change or unmount.
 */
export function useFetch(url) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tick, setTick]       = useState(0)  // incremented by refetch()

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!url) return
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
        setData(await res.json())
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [url, tick])

  return { data, loading, error, refetch }
}

// ── Using it in a component ────────────────────────────────────────────────
import { useFetch } from '../hooks/useFetch'

function TriviaList() {
  const { data, loading, error, refetch } = useFetch(
    \`\${import.meta.env.VITE_TRIVIA_API_URL}?amount=5&type=multiple\`
  )
  const questions = data?.results ?? []

  if (loading) return <p>Loading…</p>
  if (error)   return <><p>Error: {error}</p><button onClick={refetch}>Try again</button></>

  return <ul>{questions.map((q, i) => <li key={i}>{q.question}</li>)}</ul>
}`,
    callout: {
      label: "The hook abstraction payoff",
      text: "After building useFetch, every component that fetches data becomes dramatically simpler. One line to get the data, three lines to handle all states, zero fetch logic in the component. When you later need to add caching, debouncing, or auth headers, you add it once in the hook and every component benefits automatically.",
    },
    exercise: {
      id: 'ex6',
      title: "Extract fetch logic into useFetch and refactor",
      duration: "25 min",
      desc: "Extract all fetch logic into a useFetch(url) hook in src/hooks/useFetch.js. Refactor your trivia component to use it — the component body should have zero fetch logic after the refactor.",
      steps: [
        "Create src/hooks/useFetch.js using the 'Build a reusable useFetch hook' prompt",
        "The hook should return: { data, loading, error, refetch }",
        "Refactor your trivia component to call useFetch(url) — remove all useState and useEffect fetch code from the component",
        "Verify it still works: questions load, loading state shows, error state works, retry button works",
        "Open DevTools → Network — confirm AbortController is working: navigate away quickly and check that the request is cancelled (status: cancelled)",
        "As a final test, use useFetch in a second component fetching a different URL — verify you get the same behaviour for free",
      ],
      reflection: "How much code did you remove from the component? What's the benefit of that separation when you need to change the fetch behaviour later?",
    },
  },
]

// ── Live demo ─────────────────────────────────────────────────────────────
// Fetches 5 random trivia questions from the Open Trivia Database.
// Response shape: { response_code: 0, results: [{ category, difficulty, question, ... }] }
function TriviaDemo() {
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [data, setData]       = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchQuestions() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `${import.meta.env.VITE_TRIVIA_API_URL}?amount=5&type=multiple`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`)
        const json = await res.json()
        console.log('opentdb full response:', json)
        if (json.response_code !== 0) throw new Error(`API error code: ${json.response_code}`)
        setData(json.results ?? [])
      } catch (err) {
        // AbortError fires on unmount — not a real error
        if (err.name === 'AbortError') return
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
    return () => controller.abort()
  }, [])

  if (loading) return <p className="demo-loading">Fetching questions…</p>
  if (error)   return <p className="demo-error">Error: {error}</p>
  if (data.length === 0) return <p className="demo-empty">No questions returned.</p>

  return (
    <ul className="trivia-demo-list">
      {data.map((q, i) => (
        <li key={i} className="trivia-demo-item">
          <span className="trivia-demo-category">{q.category}</span>
          <span className={`trivia-demo-badge ${q.difficulty}`}>{q.difficulty}</span>
          {/* API returns HTML-encoded strings — decode with dangerouslySetInnerHTML */}
          <p className="trivia-demo-question" dangerouslySetInnerHTML={{ __html: q.question }} />
        </li>
      ))}
    </ul>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Module4() {
  const { markComplete } = useProgress()
  const [completedEx, setCompletedEx] = useState(
    () => JSON.parse(localStorage.getItem('vibe-m4-ex') || '{}')
  )
  const [activeLesson, setActiveLesson] = useState(1)

  function toggleExercise(id) {
    const next = { ...completedEx, [id]: !completedEx[id] }
    setCompletedEx(next)
    localStorage.setItem('vibe-m4-ex', JSON.stringify(next))
  }

  const current = LESSONS[activeLesson - 1]

  return (
    <div className="wrap">
      <Header variant="module" />

      {/* HERO */}
      <div className="module-hero">
        <div className="module-kicker">Module 04 — Integration</div>
        <h1>API<br /><em>Integration</em></h1>
        <div className="hero-meta">
          <div className="meta-item"><strong>Estimated time</strong>4–5 hours</div>
          <div className="meta-item"><strong>Difficulty</strong>Intermediate</div>
          <div className="meta-item"><strong>Exercises</strong>6 + capstone</div>
          <div className="meta-item"><strong>Outcome</strong>Live data in your app</div>
        </div>
      </div>

      {/* OBJECTIVES */}
      <div className="objectives">
        <div className="obj-title">// learning objectives</div>
        <ul className="obj-list">
          <li>Understand what a REST API is — endpoints, HTTP methods, request/response cycle</li>
          <li>Read API documentation and identify the response shape before writing any code</li>
          <li>Store API config in .env.local and access it safely via import.meta.env</li>
          <li>Write async fetch logic inside useEffect without making the callback async</li>
          <li>Handle all three fetch states — loading, error, data — every time</li>
          <li>Defend against API failures: HTTP errors, malformed responses, missing fields</li>
          <li>Extract all fetch logic into a reusable useFetch(url) hook</li>
          <li>Capstone: add a live Daily Dev Fact widget to the home page and a Further Reading feed to every module</li>
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

      {/* LIVE DEMO */}
      <div className="lesson-section">
        <div className="section-label">Live demo</div>
        <h2>This page is <em>fetching right now</em></h2>
        <p>
          The component below runs exactly the pattern from the lessons — useEffect, async
          function inside, three states, AbortController cleanup. Open DevTools → Network to
          watch the request fire on load.
        </p>
        <TriviaDemo />
      </div>

      {/* PROMPT LIBRARY */}
      <div className="lesson-section">
        <div className="section-label">Prompt template library</div>
        <h2>API Integration <em>prompts</em></h2>
        <p>Six prompts covering every API integration pattern you'll need.</p>
        {PROMPTS.map((p, i) => (
          <PromptCard key={i} label={p.label} text={p.text} tag={p.technique} />
        ))}
      </div>

      {/* QUIZ */}
      <Quiz
        title="API Integration"
        questions={QUESTIONS}
        scoreMessages={SCORE_MSGS}
        onComplete={() => markComplete(4)}
      />

      {/* CAPSTONE */}
      <div className="challenge-section">
        <div className="section-label">Module capstone</div>
        <div className="capstone-card">
          <h2>Add live API data<br />to VIBE:ADVANCED</h2>
          <p className="desc">
            Two real features for the VIBE:ADVANCED site — both deployed to Vercel, both using your new useFetch hook. Part 1 is guided. Part 2 is a challenge with hard requirements you'll have to work through yourself.
          </p>
          <ol className="challenge-steps">
            {[
              ["Part 1", "Add a Daily Dev Fact widget to the home page. Fetch a random programming fact from uselessfacts.jsph.pl/random.json?language=en on load. Show a loading skeleton, an error state with retry, and the fact text. Use useFetch. All config in .env.local."],
              ["Part 2", "Add a Further Reading section to each module page. Fetch 3 live articles from the DEV.to public API (dev.to/api/articles?tag=TOPIC&per_page=3) using the module's topic as the tag. Each result shows: title, author, reading time, and tag pills."],
              ["Cache", "5-minute client-side cache using useRef inside useFetch — the same URL must not re-fetch within a session. Verify in the Network tab: navigate between modules and confirm no duplicate requests within 5 minutes."],
              ["Debounce", "Do not fire the fetch until the component has been visible for 300ms. Use useEffect cleanup to cancel if the user navigates away before 300ms. This must live inside useFetch, not in the component."],
              ["Fallback", "If the DEV.to API returns 0 articles for a tag, automatically retry with the tag 'webdev'. This fallback logic lives inside useFetch."],
              ["Deploy", "Add VITE_TRIVIA_API_URL and any other new env vars to Vercel dashboard → Settings → Environment Variables. Push and verify the live site shows the widget and the article feeds."],
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
              <li>Home page shows a Daily Dev Fact widget with loading and error states</li>
              <li>Every module page shows 3 live DEV.to articles in a Further Reading section</li>
              <li>Network tab shows no duplicate requests within 5 minutes (cache works)</li>
              <li>Navigating away quickly cancels the fetch before it fires (debounce works)</li>
              <li>Modules with zero results fall back to 'webdev' tag automatically</li>
              <li>Everything works on the live Vercel URL — env vars set in Vercel dashboard</li>
            </ul>
          </div>
        </div>
      </div>

      {/* COMING UP */}
      <ComingUp
        kicker="module 5"
        title="Build: The Quiz App"
        desc="Your first full-stack project. Categories, timers, scores, auth, leaderboard — React + Supabase, deployed. You'll apply everything from modules 1–4 to build a complete app from scratch."
      />

      {/* MODULE NAV */}
      <ModuleNav
        prev={{ to: '/module/3', label: '03 Supabase Database' }}
        next={{ to: '#', label: '05 The Quiz App' }}
      />
    </div>
  )
}
