import { useState } from 'react'

export default function ExerciseCard({ ex, completed, onToggle }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ border: `1px solid ${completed ? 'var(--green)' : 'var(--rule)'}`, marginTop: 32, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '16px 20px', background: 'var(--paper2)', borderBottom: open ? '1px solid var(--rule)' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: completed ? 'var(--green)' : 'var(--accent)' }}>
            {completed ? '✓ Done' : 'Exercise'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{ex.title}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>{ex.duration}</span>
          <span style={{ fontSize: 14, color: 'var(--muted)', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>↓</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '20px 20px 24px' }}>
          <p style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--muted)', marginBottom: 20 }}>{ex.desc}</p>
          <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {ex.steps.map((s, i) => (
              <li key={i} style={{ display: 'flex', gap: 14, fontSize: 12, lineHeight: 1.6 }}>
                <span style={{ flexShrink: 0, width: 20, height: 20, background: 'var(--ink)', color: 'var(--paper)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <span style={{ color: 'var(--muted)', paddingTop: 2 }}>{s}</span>
              </li>
            ))}
          </ol>
          <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--faint)' }}>Reflection: </span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{ex.reflection}</span>
          </div>
          <button onClick={onToggle}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: completed ? 'var(--green)' : 'none', border: `1px solid ${completed ? 'var(--green)' : 'var(--rule)'}`,
              padding: '8px 16px', cursor: 'pointer', color: completed ? 'white' : 'var(--muted)', transition: 'all 0.15s'
            }}>
            {completed ? '✓ Mark incomplete' : 'Mark as done'}
          </button>
        </div>
      )}
    </div>
  )
}
