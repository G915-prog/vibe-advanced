import Header from '../components/Header'
import ModuleNav from '../components/ModuleNav'

export default function Showcase() {
  return (
    <div className="wrap">
      <Header variant="module" />

      <div className="module-hero">
        <div className="module-kicker">Showcase</div>
        <h1>Projects you<br /><em>shipped</em></h1>
      </div>

      <div className="lesson-section">
        <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--muted)', maxWidth: 600 }}>
          This page is built in Module 7, Step 8. Follow the build guide at{' '}
          <a href="/module/7" style={{ color: 'var(--accent)' }}>/module/7</a> to complete it —
          you'll add a project grid, live status dots from a Cloudflare Worker, and links to
          every project deployed in this course.
        </p>
      </div>

      <ModuleNav
        prev={{ to: '/module/7', label: '07 Cloudflare' }}
        next={{ to: '#', label: '' }}
      />
    </div>
  )
}
