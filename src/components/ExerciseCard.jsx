import { useState } from 'react'

export default function ExerciseCard({ ex, completed, onToggle }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`exercise-card${completed ? ' completed' : ''}`}>
      <div
        className={`exercise-header${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="exercise-header-left">
          <span className={`exercise-status${completed ? ' completed' : ''}`}>
            {completed ? '✓ Done' : 'Exercise'}
          </span>
          <span className="exercise-title">{ex.title}</span>
        </div>
        <div className="exercise-header-right">
          <span className="exercise-duration">{ex.duration}</span>
          <span className={`exercise-arrow${open ? ' open' : ''}`}>↓</span>
        </div>
      </div>
      {open && (
        <div className="exercise-body">
          <p className="exercise-desc">{ex.desc}</p>
          <ol className="exercise-steps">
            {ex.steps.map((s, i) => (
              <li key={i} className="exercise-step">
                <span className="exercise-step-num">{i + 1}</span>
                <span className="exercise-step-text">{s}</span>
              </li>
            ))}
          </ol>
          <div className="exercise-reflection">
            <span className="exercise-reflection-label">Reflection: </span>
            <span className="exercise-reflection-text">{ex.reflection}</span>
          </div>
          <button
            className={`exercise-done-btn${completed ? ' completed' : ''}`}
            onClick={onToggle}
          >
            {completed ? '✓ Mark incomplete' : 'Mark as done'}
          </button>
        </div>
      )}
    </div>
  )
}
