import { useState, useEffect } from 'react'
import Header from '../components/Header'
import ComingUp from '../components/ComingUp'
import CodeBlock from '../components/CodeBlock'
import ModuleNav from '../components/ModuleNav'
import PromptCard from '../components/PromptCard'
import { useProgress } from '../hooks/useProgress'

// ── Architecture diagram ──────────────────────────────────────────────────────
const ARCH_DIAGRAM = `CLOUDFLARE (Pages + Workers):
  vibe-hub.pages.dev          ← new hub site, built in this module
  counter-app.pages.dev       ← migrated from Vercel in this module
  tip-calculator.pages.dev    ← migrated from Vercel in this module
  vibe-status.workers.dev     ← Worker built in this module

VERCEL (stays, do not migrate):
  vibe-advanced.vercel.app    ← has Supabase auth, stays on Vercel
  quiz-app.vercel.app         ← has Supabase auth, stays on Vercel
  link-in-bio.vercel.app      ← has Supabase auth, stays on Vercel

INTEGRATION:
  vibe-hub links to all 5 projects and shows live status for each
  vibe-advanced gets a /showcase route that also shows all projects
  The same Cloudflare Worker serves status data to both surfaces
  projects.js is the single source of truth for project data,
  manually kept in sync between vibe-hub and vibe-advanced repos`

// ── Migration decision table data ─────────────────────────────────────────────
const MIGRATION_DECISIONS = [
  { project: 'vibe-hub',       host: '—',      action: 'Build on Cloudflare',  reason: 'New project, built here' },
  { project: 'counter',        host: 'Vercel',  action: 'Migrate',              reason: 'No backend, trivial' },
  { project: 'tip calculator', host: 'Vercel',  action: 'Migrate',              reason: 'No backend, trivial' },
  { project: 'vibe-advanced',  host: 'Vercel',  action: 'Stay',                 reason: 'Supabase auth URLs tied to domain' },
  { project: 'quiz app',       host: 'Vercel',  action: 'Stay',                 reason: 'Supabase auth URLs tied to domain' },
  { project: 'link-in-bio',    host: 'Vercel',  action: 'Stay',                 reason: 'Supabase auth URLs tied to domain' },
]

// ── Platform comparison ───────────────────────────────────────────────────────
const COMPARISON_TABLE = `Feature                       Cloudflare Pages       Vercel (Hobby)
──────────────────────────────────────────────────────────────────────
Build minutes / month         500                    6,000
Bandwidth                     Unlimited              100 GB
Serverless invocations        100k req / day         100k req / month
Custom domains                Unlimited              Unlimited
Env var auto-redeploy         No — manual trigger    Yes
Edge PoPs                     300+                   ~20 (Hobby)
Serverless runtime            Workers (V8 isolates)  Node.js (Lambda)
Cold starts                   None                   Yes
Built-in analytics            Yes                    No (paid add-on)
Free SSL                      Yes                    Yes`

// ── Worker code examples ──────────────────────────────────────────────────────
const WORKER_MINIMAL = `// The minimal Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    return new Response('Hello from the edge!', {
      headers: { 'Content-Type': 'text/plain' },
    })
  },
}`

const WORKER_STATUS_EXAMPLE = `// Workers can make outbound HTTP requests, just like a browser
const results = await Promise.all(
  PROJECTS.map(async ({ id, url }) => {
    try {
      // HEAD fetches headers only — no body, much faster than GET
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),  // bail out after 5s
      })
      return [id, res.ok ? 'online' : 'offline']
    } catch {
      return [id, 'offline']  // fetch threw = site is down
    }
  })
)
// results = [['quiz-app', 'online'], ['vibe-advanced', 'online'], ...]
const statusMap = Object.fromEntries(results)`

const CORS_EXAMPLE = `// Why CORS matters: browsers block cross-origin requests by default.
// A Worker called from vibe-advanced (Vercel) to workers.dev
// is cross-origin — without these headers, the browser rejects it.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',          // allow any origin
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle preflight — browser sends OPTIONS first to ask "is this allowed?"
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: CORS_HEADERS })
}

// Every response needs CORS headers — not just the preflight
return new Response(JSON.stringify(data), {
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
})`

const WRANGLER_TOML_EXAMPLE = `# wrangler.toml — the Worker's config file. Commit this to git.
# Never put secrets here — use: wrangler secret put MY_KEY

name = "vibe-status-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Optional: bind this Worker to a custom domain route
# [[routes]]
# pattern = "api.yourdomain.com/status"
# zone_name = "yourdomain.com"

# Secrets are set via CLI, not stored in this file:
# wrangler secret put MY_API_KEY`

// ── Step prompts ──────────────────────────────────────────────────────────────
const STEP_PROMPTS = {
  '01': `Scaffold a new React + Vite project called vibe-hub as a standalone portfolio hub.

Run these commands outside any existing project folder:
  npm create vite@latest vibe-hub -- --template react
  cd vibe-hub
  npm install
  npm install react-router-dom

Set up the structure:
1. Delete src/App.css and src/assets/react.svg
2. Replace src/main.jsx — render <App /> inside <BrowserRouter>
3. Replace src/App.jsx — single "/" route rendering <Home />

Create src/data/projects.js — array of project objects:
export const PROJECTS = [
  { id: 'quiz-app',      title: 'Quiz App',       desc: 'Ten questions. 30-second timer. Live leaderboard.',       url: 'https://quiz-app-eosin-one-15.vercel.app',    stack: ['React','Supabase','Vercel'], builtIn: 'Module 5' },
  { id: 'vibe-advanced', title: 'VIBE:ADVANCED',  desc: 'The course site itself — eight modules, three projects.',  url: 'https://vibe-advanced.vercel.app',            stack: ['React','Vite','Supabase'],   builtIn: 'All modules' },
  { id: 'tip-calc',      title: 'Tip Calculator', desc: 'Split bills instantly. Clean, fast, no fluff.',           url: 'https://tip-calculator-phi-seven.vercel.app', stack: ['React','Vite'],             builtIn: 'Module 1' },
  { id: 'counter',       title: 'Counter',        desc: 'The classic first app. Deployed, not just run locally.',  url: 'https://counter-app-five-rouge.vercel.app',   stack: ['React'],                    builtIn: 'Module 1' },
  { id: 'link-in-bio',   title: 'Link-in-Bio',    desc: 'Custom profile pages, link management, click tracking.', url: 'https://your-link-in-bio.vercel.app',         stack: ['React','Supabase','Vercel'],builtIn: 'Module 6' },
]

Create src/components/ProjectCard.jsx:
Props: project (object), status (string: 'online' | 'offline' | 'checking')
Renders: title, description, live URL link (new tab), stack tags, builtIn label, status dot
CSS classes only. No inline styles.

Create src/pages/Home.jsx:
  Hero: "Projects" heading + "Built in VIBE:ADVANCED" subline
  Import PROJECTS from src/data/projects.js
  Map over them, rendering <ProjectCard /> for each

Create src/index.css — modern portfolio aesthetic (NOT ink-on-paper):
  Background: #0f1117  |  Text: #e5e7eb  |  Accent: #6366f1
  Card: border 1px solid rgba(255,255,255,0.08), border-radius 12px, padding 24px
  Cards grid: repeat(auto-fill, minmax(280px, 1fr)), gap 20px
  Hover: translateY(-2px), border-color rgba(255,255,255,0.2)
  Font: system-ui, -apple-system, sans-serif (no serifs)`,

  '02': `My vibe-hub React + Vite project is ready. Help me deploy it to Cloudflare Pages via GitHub.

1. Initialise git and push to a new GitHub repo:
   git init
   git add .
   git commit -m "Initial vibe-hub — 5 project cards"
   (Create a new empty repo on github.com named "vibe-hub", then:)
   git remote add origin https://github.com/YOUR_USERNAME/vibe-hub.git
   git push -u origin main

2. Connect to Cloudflare Pages:
   Cloudflare dashboard → Pages → Create a project → Connect to Git
   Select the vibe-hub repo.
   Build settings:
     Framework preset: None
     Build command: npm run build
     Build output directory: dist
   Click Save and Deploy.

3. Create public/_redirects (so React Router works on Cloudflare):
   /* /index.html 200
   Commit this file and push — Cloudflare picks it up on the next build.

Wait for the deployment to complete (~60 seconds).
Visit the .pages.dev URL in the browser — all 5 project cards should be visible.`,

  '03': `I need to add a VITE_HUB_VERSION environment variable to my vibe-hub on Cloudflare Pages
and display it in the footer.

1. In Cloudflare dashboard → Pages → vibe-hub → Settings → Environment Variables:
   Variable name: VITE_HUB_VERSION
   Value: 1.0.0
   Set for both Production and Preview environments.
   Click Save.

2. In src/pages/Home.jsx, add a footer at the bottom of the return:
   <footer className="hub-footer">
     <span>vibe-hub · built in VIBE:ADVANCED</span>
     <span>v{import.meta.env.VITE_HUB_VERSION ?? 'dev'}</span>
   </footer>

3. Add .hub-footer to src/index.css:
   .hub-footer {
     display: flex;
     justify-content: space-between;
     padding: 32px 0 16px;
     font-size: 12px;
     color: rgba(229,231,235,0.4);
     border-top: 1px solid rgba(255,255,255,0.06);
     margin-top: 64px;
   }

4. Commit and push — Cloudflare auto-redeploys from GitHub.
   (If you only changed the env var with no code changes: go to
   Deployments → Retry deployment to force a rebuild with the new var.)`,

  '04': `Set up Cloudflare Workers development environment and scaffold a new Worker project.

1. Install Wrangler (Cloudflare's CLI):
   npm install -g wrangler

2. Authenticate with Cloudflare:
   wrangler login
   (Opens your browser — approve the permissions request)

3. Scaffold a new Worker:
   npm create cloudflare@latest vibe-status-worker
   When prompted:
     What type of application? → "Hello World" Worker
     Use TypeScript? → No
     Deploy now? → No (we'll deploy in Step 6)
   cd vibe-status-worker

4. Run locally:
   wrangler dev

Visit http://localhost:8787 — you should see a "Hello World!" response.
Look at src/index.js — this is the complete minimal Worker structure.`,

  '05': `Replace the placeholder Worker in vibe-status-worker/src/index.js with a real
status-checking endpoint.

The Worker should:
1. Export a default object with a fetch() handler
2. Handle GET /status:
   - Define PROJECTS array: [{ id, url }] for all 5 projects
   - Use Promise.all() to check all URLs in parallel with HEAD requests
   - Use AbortSignal.timeout(5000) on each fetch (slow sites don't block)
   - Return JSON: { projectId: 'online' | 'offline' } for each project
3. Handle OPTIONS (CORS preflight) — return 200 with CORS headers
4. Set CORS headers on every response:
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, OPTIONS
   Access-Control-Allow-Headers: Content-Type
5. Return 404 for any other path

Project URLs:
  quiz-app:      https://quiz-app-eosin-one-15.vercel.app
  vibe-advanced: https://vibe-advanced.vercel.app
  tip-calc:      https://tip-calculator-phi-seven.vercel.app
  counter:       https://counter-app-five-rouge.vercel.app
  link-in-bio:   https://your-link-in-bio.vercel.app  ← update this URL

After writing, test with: curl http://localhost:8787/status`,

  '06': `Deploy my vibe-status-worker to production on Cloudflare Workers.

1. Check wrangler.toml is correct:
   name = "vibe-status-worker"
   main = "src/index.js"
   compatibility_date = "2024-01-01"

2. Deploy:
   wrangler deploy

3. Note the live URL from the deploy output:
   https://vibe-status-worker.YOUR_SUBDOMAIN.workers.dev

4. Test the live endpoint:
   curl https://vibe-status-worker.YOUR_SUBDOMAIN.workers.dev/status

5. Test CORS from the browser console (open any site, open DevTools → Console):
   fetch('https://vibe-status-worker.YOUR_SUBDOMAIN.workers.dev/status')
     .then(r => r.json())
     .then(console.log)

Save the full Worker URL — you'll need it for Steps 8 and 9.`,

  '07': `In my vibe-advanced React course site, add a Showcase page at /showcase.

1. Create src/data/projects.js (same data as vibe-hub):
export const PROJECTS = [
  { id: 'quiz-app',      title: 'Quiz App',       desc: 'Ten questions. 30-second timer. Live leaderboard.',       url: 'https://quiz-app-eosin-one-15.vercel.app',    stack: ['React','Supabase','Vercel'], builtIn: 'Module 5' },
  { id: 'vibe-advanced', title: 'VIBE:ADVANCED',  desc: 'The course site itself — eight modules, three projects.',  url: 'https://vibe-advanced.vercel.app',            stack: ['React','Vite','Supabase'],   builtIn: 'All modules' },
  { id: 'tip-calc',      title: 'Tip Calculator', desc: 'Split bills instantly. Clean, fast, no fluff.',           url: 'https://tip-calculator-phi-seven.vercel.app', stack: ['React','Vite'],             builtIn: 'Module 1' },
  { id: 'counter',       title: 'Counter',        desc: 'The classic first app. Deployed, not just run locally.',  url: 'https://counter-app-five-rouge.vercel.app',   stack: ['React'],                    builtIn: 'Module 1' },
  { id: 'link-in-bio',   title: 'Link-in-Bio',    desc: 'Custom profile pages, link management, click tracking.', url: 'https://your-link-in-bio.vercel.app',         stack: ['React','Supabase','Vercel'],builtIn: 'Module 6' },
]

2. Create src/pages/Showcase.jsx using vibe-advanced's ink-on-paper aesthetic:
   - <Header variant="module" />
   - module-hero div: kicker "Showcase" + h1 "Projects you shipped"
   - Import PROJECTS, map to project cards using existing CSS class patterns
   - Each card: title, desc, stack tags, external link, status dot placeholder (class "status-dot")
   - <ModuleNav prev={{ to: '/module/7', label: '07 Cloudflare' }} next={{ to: '#', label: '' }} />

3. Add route to App.jsx:
   import Showcase from './pages/Showcase'
   <Route path="/showcase" element={<ProtectedRoute><Showcase /></ProtectedRoute>} />

4. Add NavLink to Header.jsx inside the nav-links section:
   <NavLink to="/showcase">Showcase</NavLink>`,

  '08': `In src/pages/Showcase.jsx in my vibe-advanced codebase, connect the live Cloudflare Worker.

Replace YOUR_WORKER_URL with your actual workers.dev URL from Step 6.

1. Add to the Showcase component:
   const WORKER_URL = 'https://vibe-status-worker.YOUR_SUBDOMAIN.workers.dev/status'
   const [status, setStatus] = useState({})
   const [statusLoading, setStatusLoading] = useState(true)

   useEffect(() => {
     fetch(WORKER_URL)
       .then(r => r.json())
       .then(data => setStatus(data))
       .catch(() => {})
       .finally(() => setStatusLoading(false))
   }, [])

2. On each project card, replace the placeholder status-dot with:
   <span
     className={\`status-dot \${
       statusLoading              ? 'status-checking' :
       status[p.id] === 'online'  ? 'status-online'   :
       status[p.id] === 'offline' ? 'status-offline'  :
       'status-checking'
     }\`}
     title={statusLoading ? 'Checking…' : (status[p.id] ?? 'unknown')}
   />

3. Add to src/index.css:
   .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
   .status-online   { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.5); }
   .status-offline  { background: #ef4444; }
   .status-checking { background: var(--rule); }`,

  '09': `In the vibe-hub React + Vite project, add live status dots from the Cloudflare Worker.

Replace YOUR_WORKER_URL with your actual workers.dev URL.

1. In src/pages/Home.jsx:
   Add useState, useEffect imports
   const [status, setStatus] = useState({})
   const [statusLoading, setStatusLoading] = useState(true)

   useEffect(() => {
     const WORKER = 'https://vibe-status-worker.YOUR_SUBDOMAIN.workers.dev/status'
     fetch(WORKER)
       .then(r => r.json())
       .then(data => setStatus(data))
       .catch(() => {})
       .finally(() => setStatusLoading(false))
   }, [])

   Pass to each card:
   <ProjectCard
     project={p}
     status={statusLoading ? 'checking' : (status[p.id] ?? 'unknown')}
   />

2. In src/components/ProjectCard.jsx:
   Accept status prop
   Render: <span className={\`project-status project-status--\${status}\`} />

3. Add to src/index.css:
   .project-status { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
   .project-status--online   { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.4); }
   .project-status--offline  { background: #ef4444; }
   .project-status--checking { background: rgba(229,231,235,.15); }

4. Commit and push — Cloudflare Pages redeploys automatically.`,

  '11': `Run Lighthouse audits on both deployed sites and optimise where needed.

1. Open Chrome → DevTools → Lighthouse tab
   Run on: https://your-vibe-hub.pages.dev  (Desktop, then Mobile)
   Run on: https://vibe-advanced.vercel.app  (Desktop, then Mobile)

2. If vibe-hub Performance < 90:
   - Check for unoptimised images — compress to WebP if any screenshots are present
   - Add public/_headers to vibe-hub:
     /*
       Cache-Control: public, max-age=31536000, immutable
     /index.html
       Cache-Control: no-cache, max-age=0

3. In vibe-status-worker/src/index.js, add a cache header to the /status response:
   'Cache-Control': 'public, max-age=60'
   Redeploy: wrangler deploy

4. Document the scores at the top of vibe-advanced/src/pages/Showcase.jsx:
   // Lighthouse — vibe-hub (Cloudflare):   Perf XX | A11y XX | BP XX | SEO XX
   // Lighthouse — vibe-advanced (Vercel):  Perf XX | A11y XX | BP XX | SEO XX`,

  '12': `Migrate the Counter App from Vercel to Cloudflare Pages.

1. In Cloudflare Pages dashboard → Create a project → Connect to Git:
   Select the counter-app GitHub repo.
   Build command: npm run build
   Build output directory: dist
   No environment variables needed.
   Click Save and Deploy.

2. While it deploys, add public/_redirects to the counter-app repo:
   /* /index.html 200
   Commit and push — triggers a second deploy with the redirects in place.

3. Once live, test the Cloudflare Pages URL:
   - Counter increments and resets correctly
   - No console errors
   - Works at 375px mobile width in DevTools

4. Note your new counter .pages.dev URL — you'll update projects.js in Step 14.`,

  '13': `Migrate the Tip Calculator from Vercel to Cloudflare Pages.

1. In Cloudflare Pages dashboard → Create a project → Connect to Git:
   Select the tip-calculator GitHub repo.
   Build command: npm run build
   Build output directory: dist
   No environment variables needed.
   Click Save and Deploy.

2. While it deploys, add public/_redirects to the tip-calculator repo:
   /* /index.html 200
   Commit and push — triggers a second deploy with the redirects in place.

3. Once live, test the Cloudflare Pages URL:
   - Tip calculation and bill splitting work correctly
   - No console errors
   - Works at 375px mobile width in DevTools

4. Note your new tip-calculator .pages.dev URL — you'll update projects.js in Step 14.`,

  '14': `Update projects.js in both repos with the new Cloudflare Pages URLs for counter and tip-calc.

In vibe-hub/src/data/projects.js:
  Update the 'counter' url to your new counter .pages.dev URL
  Update the 'tip-calc' url to your new tip-calculator .pages.dev URL
  Commit and push — Cloudflare Pages redeploys automatically.

In vibe-advanced/src/data/projects.js:
  Same URL updates for 'counter' and 'tip-calc'
  Commit and push — Vercel redeploys automatically.

Check: visit the live vibe-hub — Counter and Tip Calculator card links should now
point to .pages.dev URLs, not vercel.app.`,

  '15': `Update the Worker's PROJECTS array to check the new Cloudflare Pages URLs for counter and tip-calc.

In vibe-status-worker/src/index.js, update the two entries:
  { id: 'counter',  url: 'https://your-counter.pages.dev' }       ← your actual CF URL
  { id: 'tip-calc', url: 'https://your-tip-calc.pages.dev' }      ← your actual CF URL

Leave the three Vercel URLs unchanged (quiz-app, vibe-advanced, link-in-bio stay on Vercel).

Redeploy the Worker:
  wrangler deploy

Verify:
  curl YOUR_WORKER_URL/status
  → counter should show 'online' at the new Cloudflare URL
  → tip-calc should show 'online' at the new Cloudflare URL

Open both vibe-hub and /showcase in the browser — status dots should all be green.`,

  '16': `Run final deployment checks across all three deployments for Module 7.

vibe-hub (Cloudflare Pages):
  □ Footer shows version from VITE_HUB_VERSION env var (not "dev")
  □ All 5 project cards render with correct titles, descriptions, and links
  □ Counter and Tip Calculator cards link to .pages.dev URLs (not Vercel)
  □ Status dots appear — green for online projects after a few seconds
  □ Run: npm run build — confirm zero errors
  □ Test in incognito Chrome on mobile (375px viewport)

vibe-advanced (Vercel — /showcase):
  □ /showcase renders at the live Vercel URL
  □ "Showcase" appears in the nav and is clickable
  □ Status dots appear on the project cards
  □ Push all uncommitted changes: git add . && git commit -m "Module 7 complete" && git push

Status Worker (Cloudflare Workers):
  □ curl YOUR_WORKER_URL/status returns JSON with all 5 project IDs
  □ Counter and Tip Calculator entries show the Cloudflare Pages URLs (not Vercel)
  □ wrangler.toml is committed to the Worker repo
  □ No secrets are visible in wrangler.toml

Mark all 16 items in the deployment checklist below as done.`,
}

// ── Deployment checklist ──────────────────────────────────────────────────────
const DEPLOY_ITEMS = [
  { key: 'pages_live',       label: 'vibe-hub is live on Cloudflare Pages at a .pages.dev URL' },
  { key: 'env_var',          label: 'VITE_HUB_VERSION env var confirmed working — visible in the live vibe-hub footer' },
  { key: 'worker_live',      label: 'Status Worker deployed and returning correct JSON for all 5 projects' },
  { key: 'worker_cors',      label: 'Worker has correct CORS headers — callable from the browser without errors' },
  { key: 'showcase_live',    label: 'Showcase page live on vibe-advanced at /showcase' },
  { key: 'showcase_dots',    label: 'Showcase shows live status dots sourced from the Cloudflare Worker' },
  { key: 'hub_dots',         label: 'vibe-hub shows live status dots from the same Worker endpoint' },
  { key: 'custom_domain',    label: 'Custom domain connected to vibe-hub with valid HTTPS certificate (green padlock)' },
  { key: 'counter_cf',       label: 'Counter App migrated to Cloudflare Pages and confirmed working' },
  { key: 'tip_cf',           label: 'Tip Calculator migrated to Cloudflare Pages and confirmed working' },
  { key: 'projects_updated', label: 'projects.js updated in both repos — Counter and Tip Calculator point to .pages.dev URLs' },
  { key: 'worker_updated',   label: 'Worker PROJECTS array updated to check Cloudflare Pages URLs — redeployed' },
  { key: 'lh_hub',           label: 'vibe-hub scores 90+ on Performance in Lighthouse' },
  { key: 'lh_vibe',          label: 'vibe-advanced scores 90+ on Performance in Lighthouse' },
  { key: 'wrangler_toml',    label: 'wrangler.toml committed to the Worker repo — no secrets inside it' },
  { key: 'mobile',           label: 'Both sites tested in incognito on mobile (375px viewport)' },
]

// ── Self-assessment rubric ────────────────────────────────────────────────────
const RUBRIC_CRITERIA = [
  { key: 'pages',    label: 'Cloudflare Pages',      desc: 'vibe-hub deployed and live — env vars set in dashboard, not hardcoded' },
  { key: 'workers',  label: 'Workers',               desc: 'Status Worker deployed and returning correct JSON with all 5 project IDs' },
  { key: 'env',      label: 'Environment variables', desc: 'Set in Cloudflare dashboard, shown in the live footer — not hardcoded in code' },
  { key: 'cors',     label: 'CORS',                  desc: 'Worker callable from both vibe-hub and vibe-advanced without browser errors' },
  { key: 'showcase', label: 'Showcase',              desc: 'Live on vibe-advanced at /showcase with correct project data and status dots' },
  { key: 'migrate',  label: 'Migration',             desc: 'Counter and Tip Calculator migrated to Cloudflare Pages — Worker and projects.js updated with .pages.dev URLs' },
  { key: 'domain',   label: 'Custom domain',         desc: 'Connected to vibe-hub with valid HTTPS — green padlock in browser' },
  { key: 'perf',     label: 'Performance',           desc: 'Both sites score 90+ on Lighthouse — scores documented in Showcase.jsx' },
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

// ── Prompt templates ──────────────────────────────────────────────────────────
const PROMPTS = [
  {
    label: 'Scaffold a Vite + React app for Cloudflare Pages',
    tag: 'CF Pages',
    text: `Scaffold a new React + Vite project optimised for Cloudflare Pages deployment.

1. Create the project:
   npm create vite@latest my-app -- --template react
   cd my-app && npm install && npm install react-router-dom

2. Create public/_redirects for client-side routing (required on Cloudflare Pages):
   /* /index.html 200

3. Wrap <App /> in <BrowserRouter> in src/main.jsx

4. Cloudflare Pages build settings:
   Build command: npm run build
   Output directory: dist   (NOT "build" — that's Create React App. Vite always uses "dist")

5. After adding env vars in the Cloudflare dashboard, trigger a manual redeploy —
   Cloudflare does NOT auto-redeploy on env var changes like Vercel does.`,
  },
  {
    label: 'Write a Cloudflare Worker that checks URL availability in parallel',
    tag: 'Workers',
    text: `Write a Cloudflare Worker that checks whether a list of URLs are online or offline.

Requirements:
- Accept GET /status
- Define a PROJECTS array: [{ id: string, url: string }]
- Check all URLs in parallel using Promise.all()
- Use HEAD requests (faster than GET — checks headers only, no body transferred)
- Use AbortSignal.timeout(5000) to handle slow or unresponsive sites
- Return JSON: { projectId: 'online' | 'offline' }
- Set Content-Type: application/json on the response

Error handling:
- If fetch throws (network error, timeout): return 'offline' for that project
- If response status is not 2xx: return 'offline'

Export as the default Worker object:
export default {
  async fetch(request, env, ctx) { ... }
}`,
  },
  {
    label: 'Add CORS headers to a Cloudflare Worker response',
    tag: 'CORS',
    text: `Add CORS headers to a Cloudflare Worker so it can be called from any browser origin.

Add this to my Worker at src/index.js:

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

In the fetch handler, handle preflight requests first:
if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

Add CORS headers to every real response:
return new Response(JSON.stringify(data), {
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
})

If I only want to allow specific origins (more secure than '*'):
'Access-Control-Allow-Origin': 'https://my-site.pages.dev'`,
  },
  {
    label: 'Call a Worker endpoint from React and display live status',
    tag: 'React + Workers',
    text: `In a React component, fetch live data from a Cloudflare Worker and display a
coloured status dot for each item.

const [status, setStatus] = useState({})
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetch('https://my-worker.workers.dev/status')
    .then(r => r.json())
    .then(data => setStatus(data))
    .catch(() => {})
    .finally(() => setLoading(false))
}, [])

// Render a status dot for each project:
<span className={\`dot dot--\${loading ? 'checking' : (status[id] ?? 'unknown')}\`} />

CSS for the dots:
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot--online   { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.5); }
.dot--offline  { background: #ef4444; }
.dot--checking { background: #6b7280; }
.dot--unknown  { background: #6b7280; }`,
  },
  {
    label: 'Configure wrangler.toml for production deployment',
    tag: 'Wrangler',
    text: `Configure wrangler.toml for a production Cloudflare Worker deployment.

# wrangler.toml — commit this file. Never put secrets here.
name = "my-worker-name"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Optional: Route the Worker to a custom domain path
# [[routes]]
# pattern = "api.yourdomain.com/endpoint"
# zone_name = "yourdomain.com"

# Optional: Bind a KV namespace
# [[kv_namespaces]]
# binding = "MY_KV"
# id = "abc123..."

# Secrets are set via CLI, not stored here:
# wrangler secret put MY_API_KEY
# wrangler secret put MY_DB_URL

# Deploy command:   wrangler deploy
# Local dev:        wrangler dev

Key rule: anything in wrangler.toml is visible in git history.
Secrets always go through: wrangler secret put KEY_NAME`,
  },
  {
    label: 'Migrate a Vite + React app from Vercel to Cloudflare Pages',
    tag: 'Migration',
    text: `Migrate a Vite + React app from Vercel to Cloudflare Pages without changing the code.

Steps:
1. Cloudflare Pages → Create a project → Connect to Git
   Select the same GitHub repo that Vercel uses.
   Build command: npm run build
   Output directory: dist

2. Copy env vars from Vercel → Settings → Environment Variables
   into Cloudflare Pages → Settings → Environment Variables.
   Important: trigger a manual redeploy after adding them — Cloudflare
   does NOT auto-redeploy on env var changes.

3. If there is a vercel.json in the repo:
   Remove it or leave it (Cloudflare ignores it).
   Move any rewrites/redirects to public/_redirects instead:
   /* /index.html 200

4. Check for any Vercel-specific imports (e.g. @vercel/analytics):
   Remove them or find Cloudflare equivalents.

5. Deploy and compare both URLs — they should behave identically.
   You can run both Vercel and Cloudflare deployments simultaneously.`,
  },
  {
    label: 'Update project URLs across the stack after a migration',
    tag: 'Post-migration',
    text: `After migrating a project from Vercel to Cloudflare Pages, update all URL references.

Files to update:
1. vibe-hub/src/data/projects.js
   Change the migrated project's url to the new .pages.dev URL
   Commit and push — Cloudflare Pages redeploys automatically

2. vibe-advanced/src/data/projects.js
   Same change in the vibe-advanced repo
   Commit and push — Vercel redeploys automatically

3. vibe-status-worker/src/index.js
   Update the url in the PROJECTS array to the new .pages.dev URL
   Then: wrangler deploy

Verification checklist:
□ vibe-hub card links to .pages.dev URL
□ /showcase card links to .pages.dev URL
□ curl YOUR_WORKER_URL/status — migrated project shows 'online' with new URL
□ Both sites' status dots still show green for the migrated project

Rule: projects.js and the Worker's PROJECTS array must always be in sync.`,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function Module7() {
  const { markComplete } = useProgress()
  const [checks, setChecks] = useState(
    () => JSON.parse(localStorage.getItem('vibe-m7-deploy') || '{}')
  )
  const [rubric, setRubric] = useState(
    () => JSON.parse(localStorage.getItem('vibe-m7-rubric') || '{}')
  )

  function toggleCheck(key) {
    const next = { ...checks, [key]: !checks[key] }
    setChecks(next)
    localStorage.setItem('vibe-m7-deploy', JSON.stringify(next))
  }

  function setLevel(key, value) {
    const next = { ...rubric, [key]: value }
    setRubric(next)
    localStorage.setItem('vibe-m7-rubric', JSON.stringify(next))
  }

  const checkedCount = Object.values(checks).filter(Boolean).length
  const rubricTotal  = RUBRIC_CRITERIA.reduce((sum, c) => sum + (rubric[c.key] ?? 0), 0)
  const gradeInfo    = getGrade(rubricTotal)

  useEffect(() => {
    if (checkedCount === DEPLOY_ITEMS.length) markComplete(7)
  }, [checkedCount])

  return (
    <div className="wrap">
      <Header variant="module" />

      {/* ── HERO ── */}
      <div className="module-hero">
        <div className="module-kicker">Module 07 — Deploy</div>
        <h1>Cloudflare<br /><em>Hosting</em></h1>
        <div className="hero-meta">
          <div className="meta-item"><strong>Estimated time</strong>8–10 hours</div>
          <div className="meta-item"><strong>Difficulty</strong>Intermediate</div>
          <div className="meta-item"><strong>Stack</strong>Cloudflare Pages + Workers + React</div>
          <div className="meta-item"><strong>Type</strong>Deployment + Build</div>
        </div>
      </div>

      {/* ── OBJECTIVES ── */}
      <div className="lesson-section">
        <div className="section-label">// learning objectives</div>
        <ul className="obj-list">
          <li>Know exactly which projects to migrate to Cloudflare and which to leave on Vercel — and why</li>
          <li>Set up a Cloudflare account and navigate the dashboard confidently</li>
          <li>Deploy a React + Vite app to Cloudflare Pages from GitHub</li>
          <li>Fix the React Router 404 problem on Cloudflare Pages using a <code>_redirects</code> file</li>
          <li>Set environment variables in the Cloudflare Pages dashboard</li>
          <li>Migrate counter and tip calculator from Vercel to Cloudflare Pages</li>
          <li>Write and deploy a Cloudflare Worker that checks live project status</li>
          <li>Build vibe-hub — a standalone portfolio hub on Cloudflare Pages</li>
          <li>Add a /showcase route to vibe-advanced that shows all projects with live status from the Worker</li>
        </ul>
      </div>

      {/* ── ARCHITECTURE DIAGRAM ── */}
      <div className="lesson-section">
        <div className="section-label">// what you are building</div>
        <h2>The full<br /><em>project landscape</em></h2>
        <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--muted)', marginBottom: 24, maxWidth: 680 }}>
          By the end of this module your projects are split across two hosts intentionally.
          This is the exact architecture every step in the build guide is working towards.
          Read it before you start — every decision will reference back to it.
        </p>
        <CodeBlock lang="text">{ARCH_DIAGRAM}</CodeBlock>
      </div>

      {/* ── DECISION FRAMEWORK ── */}
      <div className="lesson-section">
        <div className="section-label">// what to migrate and what to leave</div>
        <h2>The migration<br /><em>decision</em></h2>
        <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--muted)', marginBottom: 16, maxWidth: 680 }}>
          Cloudflare Pages and Vercel are both excellent. The migration decision is not about
          which is better — it's about switching cost vs benefit. Projects with Supabase auth
          have their redirect URLs, RLS policies, and email templates tied to their current
          domain. Migrating them means updating all of those, re-testing the full auth flow,
          and risking breaking working features. The projects with no backend are trivial to
          migrate — no env vars, no auth, no redirect URLs to update. That's the line.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 32, marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)' }}>
              {['Project', 'Current host', 'Action', 'Reason'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 16px 8px 0', color: 'var(--text)', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MIGRATION_DECISIONS.map(row => (
              <tr key={row.project} style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '10px 16px 10px 0', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12 }}>{row.project}</td>
                <td style={{ padding: '10px 16px 10px 0', color: 'var(--muted)' }}>{row.host}</td>
                <td style={{ padding: '10px 16px 10px 0', color: row.action === 'Stay' ? 'var(--muted)' : 'var(--accent)', fontWeight: 500 }}>{row.action}</td>
                <td style={{ padding: '10px 0', color: 'var(--muted)' }}>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Callout>
          <strong>The rule of thumb:</strong> if a project has Supabase auth, leave it where it
          is unless you have a compelling reason to move it and time to re-test everything.
        </Callout>
      </div>

      {/* ── CLOUDFLARE ACCOUNT SETUP ── */}
      <div className="lesson-section">
        <div className="section-label">// before you start: cloudflare account setup</div>
        <h2>Get your account<br /><em>ready</em></h2>
        <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--muted)', marginBottom: 24, maxWidth: 680 }}>
          This is manual dashboard work — no Claude Code prompt needed. Do this once before
          starting the build guide.
        </p>
        <ol className="obj-list" style={{ paddingLeft: 20 }}>
          <li>
            <strong>Go to cloudflare.com → Sign up (free, no credit card required).</strong><br />
            Use the same email as your GitHub account for convenience.
          </li>
          <li>
            <strong>After signup you land on the Cloudflare dashboard.</strong><br />
            Orientate yourself — the three sections you will use:
            <ul style={{ marginTop: 8, marginBottom: 4 }}>
              <li><strong>Pages</strong> (left sidebar) — static site hosting</li>
              <li><strong>Workers &amp; Pages</strong> (left sidebar) — edge functions</li>
              <li><strong>DNS</strong> — only needed if you connect a custom domain</li>
            </ul>
          </li>
          <li>
            <strong>Free tier limits — what you get at zero cost:</strong><br />
            Pages: 500 builds/month, unlimited bandwidth, unlimited sites, unlimited custom domains.<br />
            Workers: 100,000 requests/day, 10ms CPU time per request.<br />
            Analytics: included, no extra cost.
          </li>
          <li>
            <strong>Wrangler (the Workers CLI) is authenticated separately.</strong><br />
            You'll install and log in to Wrangler in Step 4 of the build guide — it authenticates
            against your Cloudflare account via the browser. No API keys to copy manually.
          </li>
          <li>
            <strong>Keep this dashboard tab open</strong> during the module — you'll return to it
            for Pages deployments, environment variables, and custom domain configuration.
          </li>
        </ol>

        <SectionLabel text="// free tier vs vercel — how they compare" />
        <CodeBlock lang="text">{COMPARISON_TABLE}</CodeBlock>
        <Callout>
          <strong>The biggest gotcha switching from Vercel:</strong> Cloudflare does not
          auto-redeploy when you change an environment variable. You must go to Deployments →
          Retry deployment manually after any env var change. Almost everyone hits this on day one.
        </Callout>
      </div>

      {/* ── BUILD GUIDE ── */}
      <div className="challenge-section">
        <div className="section-label">Step-by-step build guide</div>
        <div className="build-guide">

          {/* ── Step 01: Scaffold vibe-hub ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">01</span>
              <span className="build-step-title">Scaffold the Projects Hub</span>
            </div>
            <p className="build-step-desc">
              Scaffold a new standalone Vite + React project called vibe-hub. Separate folder,
              separate repo. This is your public portfolio — the first thing a potential employer
              or collaborator sees when you share the link.
            </p>

            <SectionLabel text="// concept: what makes a good portfolio hub" />
            <LessonHeading main="Speed and clarity" accent="over everything." />
            <LessonText>
              A portfolio hub has one job: get someone from "I found this link" to "I'm clicking
              a project" in under three seconds. That means fast load (no unnecessary libraries),
              clear visual hierarchy (project name first, tech stack second), and a grid layout
              that works on any screen size.
            </LessonText>
            <LessonText>
              vibe-hub should look and feel different from vibe-advanced. The course site is
              ink-on-paper — editorial, text-heavy, intentionally understated. The hub is a
              portfolio — dark background, light text, cards that read clearly at a glance. The
              projects are the content; the design just gets out of the way.
            </LessonText>
            <Callout>
              <strong>Don't overthink the design.</strong> Dark background, light text, a grid of
              cards, and a clear external link on each card. A status dot. That's it. Spend time
              making the project descriptions accurate, not making the UI elaborate.
            </Callout>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['01']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span><code>npm run dev</code> shows the hub at localhost with all 5 project cards visible. Each card links to a real deployed project.</span>
            </div>
          </div>

          {/* ── Step 02: Deploy to Cloudflare Pages ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">02</span>
              <span className="build-step-title">Deploy vibe-hub to Cloudflare Pages</span>
            </div>
            <p className="build-step-desc">
              Push vibe-hub to a new GitHub repo, then connect it to Cloudflare Pages. Configure
              the build settings. Trigger the first deploy. This takes about 5 minutes total.
            </p>

            <SectionLabel text="// concept: cloudflare pages build config" />
            <LessonHeading main="Build command: npm run build." accent="Output dir: dist." />
            <LessonText>
              Cloudflare Pages needs two things: the command to run the build (<code>npm run build</code>)
              and where to find the output files (<code>dist</code>). Vite always outputs to{' '}
              <code>dist</code> — not <code>build</code>, which is Create React App. If you type{' '}
              <code>build</code> instead of <code>dist</code>, your deploy fails with a "no output
              directory found" error.
            </LessonText>
            <LessonText>
              The <code>_redirects</code> file tells Cloudflare's CDN to serve <code>index.html</code>
              for every URL — essential for React Router. Without it, navigating directly to any
              route other than <code>/</code> returns a 404. Place it in the <code>public/</code>{' '}
              folder so Vite copies it to <code>dist/</code> during the build automatically.
            </LessonText>
            <CodeBlock lang="text">{`# public/_redirects — copy-paste exactly as shown
/* /index.html 200`}</CodeBlock>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['02']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>vibe-hub is live at a .pages.dev URL. All 5 project cards are visible. Refreshing a direct URL does not return a 404.</span>
            </div>
          </div>

          {/* ── Step 03: Environment variables ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">03</span>
              <span className="build-step-title">Environment variables on Cloudflare</span>
            </div>
            <p className="build-step-desc">
              Add a <code>VITE_HUB_VERSION</code> env var to the Cloudflare Pages dashboard.
              Display it in the hub footer. Trigger a manual redeploy. Confirm the live site shows
              the env var value — not a hardcoded string.
            </p>

            <SectionLabel text="// concept: cloudflare vs vercel env vars" />
            <LessonHeading main="Env vars work differently" accent="on Cloudflare." />
            <LessonText>
              In Vercel, adding or changing an environment variable triggers an automatic redeploy.
              In Cloudflare Pages, it doesn't — you have to go to Deployments and click "Retry
              deployment" manually after changing env vars. This is the most common first-day gotcha
              when switching from Vercel.
            </LessonText>
            <LessonText>
              Cloudflare also separates Production and Preview environments cleanly. You can set
              a different version string, API endpoint, or feature flag for branch deployments
              vs your main production deployment — all from the same Settings tab, no extra config.
            </LessonText>
            <Callout>
              <strong>Rule of thumb:</strong> After any env var change in Cloudflare, always
              manually trigger a redeploy. If your env var isn't showing up on the live site,
              missing a redeploy is almost certainly why.
            </Callout>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['03']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>The live .pages.dev site shows "v1.0.0" in the footer. Local dev shows "vdev" — the env var only lives in the Cloudflare dashboard.</span>
            </div>
          </div>

          {/* ── Step 04: Workers intro ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">04</span>
              <span className="build-step-title">Introduction to Cloudflare Workers</span>
            </div>
            <p className="build-step-desc">
              Install Wrangler (Cloudflare's CLI), authenticate with your account, and scaffold a
              new Worker project called vibe-status-worker. Run it locally with{' '}
              <code>wrangler dev</code> to confirm it responds.
            </p>

            <SectionLabel text="// concept: what is a cloudflare worker" />
            <LessonHeading main="JavaScript at the edge," accent="not on a server." />
            <LessonText>
              A Cloudflare Worker is a JavaScript function that runs on Cloudflare's servers — not
              yours. It's invoked by an HTTP request and responds in milliseconds from whichever of
              Cloudflare's 300+ edge locations is nearest to the user. No server to provision, no
              cold starts (Workers run in V8 isolates, not Node.js), 100,000 free requests per day.
            </LessonText>
            <LessonText>
              Workers are for things too small for a full server but too heavy for the browser:
              API proxying, auth middleware, rate limiting, URL redirects, A/B testing — or a
              lightweight endpoint that checks whether a list of URLs are online. That's what
              we're building.
            </LessonText>
            <CodeBlock lang="js">{WORKER_MINIMAL}</CodeBlock>
            <LessonText>
              That's the complete minimal Worker. Export a default object with a <code>fetch()</code>{' '}
              method. Cloudflare calls it with the incoming <code>Request</code>, an <code>env</code>{' '}
              object (your secrets and bindings), and <code>ctx</code> (for background tasks).
              Return a <code>Response</code>. That's the entire API.
            </LessonText>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['04']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span><code>wrangler dev</code> starts without errors. http://localhost:8787 returns a response in the browser.</span>
            </div>
          </div>

          {/* ── Step 05: Build the status Worker ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">05</span>
              <span className="build-step-title">Build the project status Worker</span>
            </div>
            <p className="build-step-desc">
              Write a Worker that accepts GET /status, checks all 5 project URLs in parallel using
              HEAD requests, and returns JSON with the live status of each. Handle errors and
              timeouts gracefully — a slow site shouldn't block the whole response.
            </p>

            <SectionLabel text="// concept: outbound fetch from a worker" />
            <LessonHeading main="Workers can make" accent="outbound HTTP requests." />
            <LessonText>
              Workers can call <code>fetch()</code> just like a browser — they run in a JavaScript
              environment with full network access. The difference: when your Worker calls an
              external URL, the request originates from Cloudflare's server, not the user's browser.
              That means CORS doesn't apply to those outbound calls — CORS is only a browser
              security policy.
            </LessonText>
            <LessonText>
              A <code>HEAD</code> request is faster than <code>GET</code> for checking if a URL is
              alive — it fetches response headers only, with no body transferred. If the server
              responds with any 2xx status, the site is up. <code>Promise.all()</code> runs all
              checks in parallel, so the total time equals the slowest single check, not the sum
              of all checks.
            </LessonText>
            <CodeBlock lang="js">{WORKER_STATUS_EXAMPLE}</CodeBlock>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['05']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span><code>curl http://localhost:8787/status</code> returns a JSON object with a status for each of the 5 projects. No key should be missing.</span>
            </div>
          </div>

          {/* ── Step 06: Deploy the Worker ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">06</span>
              <span className="build-step-title">Deploy the Worker to production</span>
            </div>
            <p className="build-step-desc">
              Deploy with <code>wrangler deploy</code>. Test the live workers.dev URL. Save the
              URL — you'll need it for the next three steps.
            </p>

            <SectionLabel text="// concept: wrangler.toml" />
            <LessonHeading main="wrangler.toml:" accent="your Worker's config file." />
            <LessonText>
              <code>wrangler.toml</code> is to Workers what <code>package.json</code> is to a
              Node project — the config file that tells the runtime what your code is and how to
              run it. Three fields matter most: <code>name</code> (your workers.dev subdomain path),{' '}
              <code>main</code> (the entry point file), and <code>compatibility_date</code> (which
              version of the Workers runtime to target — set it once and leave it).
            </LessonText>
            <CodeBlock lang="toml">{WRANGLER_TOML_EXAMPLE}</CodeBlock>
            <Callout>
              <strong>Never put secrets in wrangler.toml.</strong> This file is committed to git
              and visible to anyone who clones the repo. Secrets go through the CLI:{' '}
              <code>wrangler secret put MY_KEY</code>. They're stored encrypted in Cloudflare's
              infrastructure and injected into <code>env</code> at runtime — never in your code.
            </Callout>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['06']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>The live workers.dev URL returns the correct status JSON in the browser. All 5 project IDs appear in the response.</span>
            </div>
          </div>

          {/* ── Step 07: Showcase on VIBE:ADVANCED ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">07</span>
              <span className="build-step-title">Add the Showcase section to VIBE:ADVANCED</span>
            </div>
            <p className="build-step-desc">
              Switch back to the vibe-advanced codebase. Add a /showcase route, a shared projects
              data file, a new Showcase page, and a nav link. No new concepts — this step applies
              everything built so far to the main course site.
            </p>
            <div className="callout">
              <p><strong>Note:</strong> The Showcase is a new route on <em>this</em> site
              (vibe-advanced / Vercel), not a new standalone deployment. It uses the same
              ink-on-paper aesthetic as the rest of the course site — not the dark portfolio
              style of vibe-hub.</p>
            </div>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['07']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>/showcase renders all 5 project cards on the live Vercel deployment. The "Showcase" link appears in the nav.</span>
            </div>
          </div>

          {/* ── Step 08: Connect Worker to Showcase ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">08</span>
              <span className="build-step-title">Connect the status Worker to the Showcase</span>
            </div>
            <p className="build-step-desc">
              Call the live Worker endpoint from Showcase.jsx on mount. Display a coloured status
              dot on each project card: green for online, red for offline, grey while checking.
              Handle loading and error states.
            </p>

            <SectionLabel text="// concept: cors in practice" />
            <LessonHeading main="Why CORS exists" accent="and when it matters." />
            <LessonText>
              CORS (Cross-Origin Resource Sharing) is a browser security policy. When JavaScript
              on one origin (say, <code>vibe-advanced.vercel.app</code>) makes a fetch to a
              different origin (<code>vibe-status-worker.workers.dev</code>), the browser checks
              if the server allows it. If the server doesn't send back the right headers, the
              browser rejects the response — even if the server returned 200.
            </LessonText>
            <LessonText>
              CORS does <em>not</em> apply to server-to-server requests. When the Worker checks
              the project URLs internally, CORS isn't involved — that's a server-side fetch. CORS
              only kicks in when a browser makes the request. Worker → external URL (no CORS
              needed). Browser → Worker (CORS required on the Worker's response).
            </LessonText>
            <CodeBlock lang="js">{CORS_EXAMPLE}</CodeBlock>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['08']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>The Showcase shows coloured status dots. Online projects show green. DevTools → Network confirms the Worker URL is being called with a 200 response.</span>
            </div>
          </div>

          {/* ── Step 09: Wire up vibe-hub ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">09</span>
              <span className="build-step-title">Wire up vibe-hub with live Worker data</span>
            </div>
            <p className="build-step-desc">
              Add the same status Worker integration to vibe-hub. Both surfaces — vibe-hub on
              Cloudflare and /showcase on Vercel — now show live status dots from the same Worker
              endpoint. Same data, two hosts, same experience.
            </p>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['09']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>Both vibe-hub (Cloudflare) and /showcase (Vercel) show live status dots. Open both in the same browser window — the status dots reflect the same data.</span>
            </div>
          </div>

          {/* ── Step 10: Custom domain ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">10</span>
              <span className="build-step-title">Custom domain setup</span>
            </div>
            <p className="build-step-desc">
              Connect a custom domain to your vibe-hub Cloudflare Pages deployment. This is manual
              dashboard work — no Claude Code prompt. If you don't own a domain, the .pages.dev
              subdomain is already HTTPS-enabled and counts as done.
            </p>

            <SectionLabel text="// concept: dns, domains, and ssl" />
            <LessonHeading main="How DNS works" accent="in one paragraph." />
            <LessonText>
              DNS maps domain names to IP addresses. An <strong>A record</strong> maps a domain
              directly to an IP. A <strong>CNAME</strong> maps a domain to another domain name.
              When you connect a custom domain to Cloudflare Pages, you add a CNAME pointing
              your domain to Cloudflare's servers — they handle routing to the right Pages project.
            </LessonText>
            <LessonText>
              Cloudflare is both a hosting provider and a DNS registrar, which makes setup faster
              than any other platform. If your domain uses Cloudflare's nameservers, the CNAME
              is added automatically and takes effect in seconds. SSL is also provisioned
              automatically via Let's Encrypt — you never touch a certificate file.
            </LessonText>
            <Callout>
              <strong>Don't own a domain?</strong> Your .pages.dev URL already has HTTPS by
              default — it's a valid completion for this step. If you want your own domain, a
              .xyz domain often costs ~$1/year and gives you full DNS control.
            </Callout>

            <SectionLabel text="// walkthrough: connect a custom domain" />
            <ol className="obj-list" style={{ paddingLeft: 20 }}>
              <li>Cloudflare Pages → vibe-hub → Custom domains → Add a custom domain</li>
              <li>Enter your domain (e.g. projects.yourdomain.com) → Continue</li>
              <li>If using Cloudflare DNS: CNAME record is added automatically</li>
              <li>If using another DNS provider: manually add the CNAME record shown</li>
              <li>Wait for DNS propagation (seconds on Cloudflare DNS, up to 24h elsewhere)</li>
              <li>Cloudflare provisions an SSL certificate automatically</li>
              <li>Visit your domain — the green padlock confirms HTTPS is active</li>
            </ol>

            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>vibe-hub is accessible at a custom domain or .pages.dev URL with a valid HTTPS certificate (green padlock in the browser address bar).</span>
            </div>
          </div>

          {/* ── Step 11: Performance audit ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">11</span>
              <span className="build-step-title">Performance audit</span>
            </div>
            <p className="build-step-desc">
              Run Lighthouse on both live sites. Add a cache-control header to the Worker response.
              Both sites should score 90+ on Performance — Cloudflare's edge caching gives
              vibe-hub a significant head start.
            </p>

            <SectionLabel text="// concept: cloudflare edge caching and lighthouse" />
            <LessonHeading main="The edge network" accent="is your CDN." />
            <LessonText>
              Every static asset deployed to Cloudflare Pages is automatically cached at every
              one of Cloudflare's 300+ edge locations worldwide. When a user in Tokyo visits
              vibe-hub, they're hitting a Cloudflare server in Tokyo — not a data centre in
              the US. This physical proximity is why vibe-hub often outscores a Vercel Hobby
              deployment on Lighthouse: the time-to-first-byte is simply shorter.
            </LessonText>
            <LessonText>
              A Lighthouse Performance score above 90 means your app loads fast enough that real
              users won't bounce before seeing content. The three metrics that matter most: First
              Contentful Paint (when something appears), Largest Contentful Paint (when the main
              content is visible), and Total Blocking Time (how long JavaScript blocks rendering).
              All three improve when your bundle is small and assets are edge-cached.
            </LessonText>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['11']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>Both sites score 90+ on Performance in Lighthouse. Scores are documented in a comment in Showcase.jsx.</span>
            </div>
          </div>

          {/* ── Step 12: Migrate Counter App ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">12</span>
              <span className="build-step-title">Migrate the Counter App from Vercel to Cloudflare Pages</span>
            </div>
            <p className="build-step-desc">
              The Counter App is the simplest project — no backend, no env vars. Connect its
              GitHub repo to Cloudflare Pages. Confirm it works identically at the new URL.
            </p>

            <SectionLabel text="// concept: the migration process" />
            <LessonHeading main="Migration is just" accent="reconnecting the repo." />
            <LessonText>
              Moving an app from Vercel to Cloudflare Pages doesn't require changing any code —
              you're connecting the same GitHub repo to a different host. Both platforms read the
              same branch and run the same build command. The gotchas are in configuration
              differences: Vercel uses <code>vercel.json</code> for redirects; Cloudflare uses a{' '}
              <code>_redirects</code> file. Vercel auto-injects environment variables like{' '}
              <code>VERCEL_URL</code>; Cloudflare doesn't have those.
            </LessonText>
            <LessonText>
              You don't need to take down the Vercel deployment after migrating — you can run
              both simultaneously. The old Vercel URL still works; it's just no longer the
              canonical one. Update the URL in projects.js (Step 14) after both migrations are done.
            </LessonText>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['12']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>The Counter App is live at a .pages.dev URL. Counter increments and resets correctly. Note the URL for Step 14.</span>
            </div>
          </div>

          {/* ── Step 13: Migrate Tip Calculator ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">13</span>
              <span className="build-step-title">Migrate the Tip Calculator from Vercel to Cloudflare Pages</span>
            </div>
            <p className="build-step-desc">
              Same process as the Counter App — connect the tip-calculator GitHub repo to
              Cloudflare Pages. No code changes needed. Confirm the calculator works correctly
              at the new URL.
            </p>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['13']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>The Tip Calculator is live at a .pages.dev URL. Tip calculation and bill splitting work correctly. Note the URL for Step 14.</span>
            </div>
          </div>

          {/* ── Step 14: Update projects.js ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">14</span>
              <span className="build-step-title">Update projects.js in both repos</span>
            </div>
            <p className="build-step-desc">
              Both migrations are done. Update the project URLs in projects.js across both repos
              so the cards link to the Cloudflare Pages URLs. This is the single source of truth —
              keep both repos in sync.
            </p>

            <SectionLabel text="// concept: projects.js as single source of truth" />
            <LessonHeading main="Two repos," accent="one shared data contract." />
            <LessonText>
              vibe-hub and vibe-advanced both import a <code>projects.js</code> file that defines
              the same five projects. These files are in separate repos and not automatically
              synced — you update them manually whenever a project URL changes. That's the
              tradeoff of keeping two separate codebases: simpler architecture, manual sync.
            </LessonText>
            <LessonText>
              This is common in real engineering: a "source of truth" that lives in two places
              and must be kept in sync by discipline, not automation. The alternative (a shared
              package or API) would be overkill for this use case. The discipline-based approach
              works as long as you remember to update both when URLs change.
            </LessonText>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['14']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>Counter and Tip Calculator cards in both vibe-hub and /showcase link to .pages.dev URLs. Both repos pushed and live.</span>
            </div>
          </div>

          {/* ── Step 15: Update Worker URLs ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">15</span>
              <span className="build-step-title">Update the Worker's project URLs and redeploy</span>
            </div>
            <p className="build-step-desc">
              The Worker still checks the old Vercel URLs for counter and tip-calc. Update its
              PROJECTS array to use the new Cloudflare Pages URLs, then redeploy. The Worker
              should now correctly report status for all five projects at their canonical URLs.
            </p>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['15']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span><code>curl YOUR_WORKER_URL/status</code> returns all 5 project IDs. Counter and Tip Calculator show 'online' at their Cloudflare URLs. Status dots on both sites are green.</span>
            </div>
          </div>

          {/* ── Step 16: Final checks ── */}
          <div className="build-step">
            <div className="build-step-header">
              <span className="build-step-num">16</span>
              <span className="build-step-title">Final checks and redeploy everything</span>
            </div>
            <p className="build-step-desc">
              Run through the full deployment checklist. Trigger a fresh deploy of vibe-hub.
              Push the Showcase changes to vibe-advanced. Confirm the Worker returns correct
              status for all 5 projects. If any checklist item fails, fix it now.
            </p>

            <div className="build-step-prompt-label">// claude code prompt</div>
            <CodeBlock lang="prompt">{STEP_PROMPTS['16']}</CodeBlock>
            <div className="build-step-done">
              <span className="step-badge">Done when</span>
              <span>All 16 checklist items below are checked. Both sites work in incognito on mobile. The Worker returns correct status JSON for all 5 projects.</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── DEPLOYMENT CHECKLIST ── */}
      <div className="challenge-section">
        <div className="section-label">Deployment checklist</div>
        <div className="capstone-card">
          <h2>Before you call<br />it <em>done</em></h2>
          <p className="desc">
            Every item on this list is something that commonly works in dev but breaks in
            production — or exposes a gap you haven't addressed. Don't mark the module complete
            until all {DEPLOY_ITEMS.length} are checked.
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

      {/* ── SELF-ASSESSMENT RUBRIC ── */}
      <div className="challenge-section">
        <div className="section-label">Self-assessment rubric</div>
        <div className="capstone-card">
          <h2>How good<br />is it <em>really?</em></h2>
          <p className="desc">
            Be honest. Click the level that reflects your actual implementation, not the one
            you aimed for. The point is to identify gaps, not to feel good.
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

      {/* ── PROMPT TEMPLATES ── */}
      <div className="challenge-section">
        <div className="section-label">Prompt templates</div>
        <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--muted)', marginBottom: 32, maxWidth: 680 }}>
          Seven copy-paste prompts for the most common Cloudflare tasks. Use these as starting
          points — Claude Code will adapt them to your specific project structure.
        </p>
        {PROMPTS.map(p => (
          <PromptCard key={p.label} label={p.label} text={p.text} tag={p.tag} />
        ))}
      </div>

      {/* ── CAPSTONE TEASER ── */}
      <ComingUp
        kicker="module 08"
        title="Auth & Security"
        desc="Supabase Auth deep-dive, protected routes, RLS policies that actually hold up, OAuth with GitHub. Lock down your apps before you show them to the world."
      />

      {/* ── MODULE NAV ── */}
      <ModuleNav
        prev={{ to: '/module/6', label: '06 Link-in-Bio' }}
        next={{ to: '#', label: '08 Auth & Security' }}
      />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ text }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
      {text}
      <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
    </div>
  )
}

function LessonHeading({ main, accent }) {
  return (
    <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1.1, marginBottom: 16 }}>
      {main}<br /><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{accent}</em>
    </h2>
  )
}

function LessonText({ children }) {
  return (
    <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--muted)', marginBottom: 16, maxWidth: 680 }}>
      {children}
    </p>
  )
}

function Callout({ children }) {
  return (
    <div style={{ borderLeft: '3px solid var(--accent)', padding: '16px 20px', margin: '24px 0', background: 'rgba(200,75,47,0.04)' }}>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, color: 'var(--muted)' }}>{children}</p>
    </div>
  )
}
