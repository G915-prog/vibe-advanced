const R = 52
const CIRC = 2 * Math.PI * R

export default function ProgressRing({ pct, done, total }) {
  const safePct = isNaN(pct) ? 0 : Math.min(100, Math.max(0, pct))
  const offset = CIRC * (1 - safePct / 100)

  return (
    <div className="progress-ring-wrap">
      <svg viewBox="0 0 120 120" width="180" height="180" aria-hidden="true">
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent2)" />
          </linearGradient>
        </defs>
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke="var(--rule)"
          strokeWidth="8"
        />
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-pct">{Math.round(safePct)}%</span>
        <span className="ring-label">{done} / {total}</span>
        <span className="ring-sublabel">complete</span>
      </div>
    </div>
  )
}
