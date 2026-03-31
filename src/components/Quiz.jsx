import { useState } from 'react'

export default function Quiz({ title, questions, scoreMessages }) {
  const [answers, setAnswers] = useState({})

  function answer(qid, chosen) {
    if (answers[qid] !== undefined) return
    setAnswers(prev => ({ ...prev, [qid]: chosen }))
  }

  const answered = Object.keys(answers)
  const allDone = answered.length === questions.length
  const score = answered.filter(qid => answers[qid] === questions.find(q => q.id === qid)?.correctKey).length

  return (
    <div className="quiz-section">
      <div className="section-label">Knowledge check</div>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 12 }}>
        {title} <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Quiz</em>
      </h2>
      <p className="quiz-intro">
        Five questions. Click an option to answer — you'll see the explanation immediately. No pressure, this is just for you.
      </p>

      {questions.map(q => {
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
                  if (opt.key === q.correctKey) cls += ' correct'
                  else if (opt.key === chosen) cls += ' wrong'
                }
                return (
                  <div key={opt.key} className={cls} onClick={() => answer(q.id, opt.key)}>
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
              <div className="quiz-explanation" dangerouslySetInnerHTML={{ __html: q.explanation }} />
            )}
          </div>
        )
      })}

      {allDone && (
        <div className="quiz-score-bar">
          <div>
            <div className="score-num">{score}/{questions.length}</div>
            <div className="score-label">your score</div>
          </div>
          <div className="score-msg">{scoreMessages[score] ?? scoreMessages[scoreMessages.length - 1]}</div>
        </div>
      )}
    </div>
  )
}
