import { useState, useEffect, Fragment } from 'react'
import Header from '../components/Header'
import ModuleCard from '../components/ModuleCard'
import ProgressRing from '../components/ProgressRing'
import { useProgress } from '../hooks/useProgress'

const TOTAL = 8

const MODULES = [
  {
    id: 1, num: '01 — foundations', to: '/module/1',
    title: 'React\nFoundations',
    desc: 'JSX, components, hooks, and state — all scaffolded by prompting your AI. Build intuition by building things.',
    tags: ['React 18', 'Vite', 'useState', 'useEffect'],
  },
  {
    id: 2, num: '02 — technique', to: '/module/2',
    title: 'Advanced\nPrompting',
    desc: 'Decompose complex problems. Chain prompts. Debug by describing. Turn any error into a lesson.',
    tags: ['Prompt chains', 'Debugging', 'Iteration'],
  },
  {
    id: 3, num: '03 — data', to: '/module/3',
    title: 'Supabase\nDatabase',
    desc: 'Postgres + API + Auth in one. Tables, RLS policies, real-time subscriptions. Your backend, handled.',
    tags: ['Supabase', 'Postgres', 'RLS', 'Real-time'],
  },
  {
    id: 4, num: '04 — integration', to: '#',
    title: 'API\nIntegration',
    desc: 'REST APIs, fetch(), environment variables, error handling. Pull live data into your app without fear.',
    tags: ['REST', 'fetch()', 'env vars', 'async/await'],
  },
  {
    id: 5, num: '05 — project I', to: '#',
    title: 'Build: The\nQuiz App',
    desc: 'Categories, timers, scores, auth, leaderboard. React + Supabase, deployed. Your first full-stack app.',
    tags: ['Full-stack', 'Auth', 'Leaderboard', 'Deploy'],
  },
  {
    id: 6, num: '06 — project II', to: '#',
    title: 'Build: Link-\nin-Bio',
    desc: 'Custom profile pages, link management, click tracking. Public URLs. Like Linktree, but yours.',
    tags: ['Dynamic routes', 'Profiles', 'Click tracking'],
  },
  {
    id: 7, num: '07 — deploy', to: '#',
    title: 'Cloudflare\nHosting',
    desc: 'Pages, Workers, edge functions, custom domains. Deploy fast. Ship to the world for free.',
    tags: ['CF Pages', 'Workers', 'Custom domain'],
  },
  {
    id: 8, num: '08 — security', to: '#',
    title: 'Auth &\nSecurity',
    desc: 'Supabase auth deep-dive, protected routes, RLS policies, OAuth. Keep your app locked down.',
    tags: ['Auth', 'OAuth', 'Protected routes', 'RLS'],
  },
]

function getDotClass(id, progress) {
  if (progress[id]) return 'status-dot done'
  const nextModule = (() => {
    for (let i = 1; i <= TOTAL; i++) if (!progress[i]) return i
    return TOTAL
  })()
  if (id === nextModule) return 'status-dot active'
  return 'status-dot'
}

export default function Home() {
  const { progress } = useProgress()
  const [animatedPct, setAnimatedPct] = useState(0)

  const done = Object.values(progress).filter(Boolean).length
  const pct = Math.round((done / TOTAL) * 100)

  useEffect(() => {
    const t = setTimeout(() => setAnimatedPct(pct), 400)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="wrap">
      <Header variant="home" />

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-kicker">Advanced full-stack course</div>
          <h1>Build real<br />things with <em>AI.</em></h1>
          <p className="hero-sub">
            You already know the vibe. Now ship production apps —
            React, Supabase, Cloudflare. Eight modules. Three projects.
            One capstone. All built by prompting your way through it.
          </p>
        </div>
        <ProgressRing pct={animatedPct} done={done} total={TOTAL} />
      </section>

      {/* MODULES */}
      <div className="section-title">Course modules</div>
      <div className="modules-grid">
        {MODULES.map(mod => (
          <ModuleCard
            key={mod.id}
            mod={mod}
            dotClass={getDotClass(mod.id, progress)}
          />
        ))}

        {/* CAPSTONE */}
        <a className="module-card capstone" href="#">
          <div className="module-num">
            Capstone — final project
            <div className="status-dot" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
          </div>
          <div className="module-title">
            Your Full-Stack<br /><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Mini-App</em>
          </div>
          <div className="module-desc">
            Pick your idea. Build it end-to-end. React + Supabase + Cloudflare + custom domain. Four weeks. Ship it.
          </div>
          <div className="module-tags">
            {['React', 'Supabase', 'Cloudflare', 'Full deploy', 'Custom domain'].map(t => (
              <span key={t} className="module-tag">{t}</span>
            ))}
          </div>
        </a>
      </div>

      {/* FLOW DIAGRAM */}
      <div className="flow-section">
        <div className="section-title">Learning flow</div>
        <div className="flow-diagram">
          <div className="flow-inner">
            {[
              { label: 'Phase 1 — Skill', nodes: ['01 React', '02 Prompting'] },
              { label: 'Phase 2 — Data', nodes: ['03 Supabase', '04 APIs'] },
              { label: 'Phase 3 — Build', nodes: ['05 Quiz App', '06 Link-in-Bio'] },
              { label: 'Phase 4 — Ship', nodes: ['07 Cloudflare', '08 Auth'] },
            ].map((phase, i) => (
              <Fragment key={phase.label}>
                <div className="flow-phase">
                  <div className="flow-phase-label">{phase.label}</div>
                  <div className="flow-nodes">
                    {phase.nodes.map(n => (
                      <div key={n} className="flow-node highlight">{n}</div>
                    ))}
                  </div>
                </div>
                <div className="flow-arrow">→</div>
              </Fragment>
            ))}
            <div className="flow-phase">
              <div className="flow-phase-label">Capstone</div>
              <div className="flow-nodes">
                <div className="flow-node capstone-node">Your App</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROJECTS */}
      <div className="section-title">Projects you'll ship</div>
      <div className="projects-grid">
        {[
          { num: 'I', name: 'The Quiz App', stack: 'React · Supabase · Auth · Leaderboard' },
          { num: 'II', name: 'Link-in-Bio', stack: 'React · Supabase · Dynamic profiles' },
          { num: 'III', name: 'Your Capstone', stack: 'Full-stack · Cloudflare · Deployed' },
        ].map(p => (
          <div key={p.num} className="project-card">
            <div className="project-number">{p.num}</div>
            <div className="project-name">{p.name}</div>
            <div className="project-stack">{p.stack}</div>
          </div>
        ))}
      </div>

      {/* STACK */}
      <div className="section-title">The stack</div>
      <div className="stack-row">
        {[
          { icon: '⚛', name: 'React 18', role: 'UI framework' },
          { icon: '⚡', name: 'Vite', role: 'Build tool' },
          { icon: '🗄', name: 'Supabase', role: 'Database + auth' },
          { icon: '☁', name: 'Cloudflare', role: 'Hosting + edge' },
          { icon: '🤖', name: 'AI tools', role: 'Your pair programmer' },
        ].map(s => (
          <div key={s.name} className="stack-item">
            <span className="stack-icon">{s.icon}</span>
            <span className="stack-name">{s.name}</span>
            <span className="stack-role">{s.role}</span>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <footer>
        <span>VIBE:ADVANCED — personal course tracker</span>
        <span>Built by vibe coding, for vibe coding</span>
      </footer>
    </div>
  )
}
