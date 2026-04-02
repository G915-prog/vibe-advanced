import { useState, useEffect } from 'react'

// Fetches 5 random trivia questions from the Open Trivia Database.
// Response shape: { response_code: 0, results: [{ category, difficulty, question, correct_answer, incorrect_answers }] }

// Shuffle an array using Fisher-Yates — used to randomise answer order each question
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TriviaDemo() {
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [questions, setQuestions] = useState([])

  // current question index, selected answer, and score
  const [index, setIndex]       = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore]       = useState(0)
  const [finished, setFinished] = useState(false)

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
        // response_code 1 = no results (e.g. amount=0) — treat as empty, not an error
        if (json.response_code !== 0 && json.response_code !== 1) {
          throw new Error(`API error code: ${json.response_code}`)
        }
        // Pre-shuffle answers once when data loads so order stays stable during render
        const prepared = (json.results ?? []).map(q => ({
          ...q,
          answers: shuffle([q.correct_answer, ...q.incorrect_answers]),
        }))
        setQuestions(prepared)
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

  function handleSelect(answer) {
    if (selected !== null) return  // already answered
    setSelected(answer)
    if (answer === questions[index].correct_answer) setScore(s => s + 1)
  }

  function handleNext() {
    if (index + 1 >= questions.length) {
      setFinished(true)
    } else {
      setIndex(i => i + 1)
      setSelected(null)
    }
  }

  function handleRestart() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setFinished(false)
    // re-shuffle answers on restart
    setQuestions(qs => qs.map(q => ({
      ...q,
      answers: shuffle([q.correct_answer, ...q.incorrect_answers]),
    })))
  }

  if (loading) return <p className="demo-loading">Fetching questions…</p>
  if (error)   return <p className="demo-error">Error: {error}</p>
  if (questions.length === 0) return <p className="demo-empty">No questions returned.</p>

  if (finished) return (
    <div className="trivia-result">
      <div className="trivia-result-score">{score} / {questions.length}</div>
      <p className="trivia-result-msg">
        {score === questions.length ? 'Perfect score!' : score >= 3 ? 'Nice work.' : 'Better luck next time.'}
      </p>
      <button className="trivia-btn" onClick={handleRestart}>Play again</button>
    </div>
  )

  const q = questions[index]
  return (
    <div className="trivia-game">
      <div className="trivia-game-meta">
        <span className="trivia-demo-category">{q.category}</span>
        <span className={`trivia-demo-badge ${q.difficulty}`}>{q.difficulty}</span>
        <span className="trivia-progress">{index + 1} / {questions.length}</span>
      </div>

      {/* API returns HTML-encoded strings — decode with dangerouslySetInnerHTML */}
      <p className="trivia-game-question" dangerouslySetInnerHTML={{ __html: q.question }} />

      <div className="trivia-options">
        {q.answers.map((answer, i) => {
          let cls = 'trivia-option'
          if (selected !== null) {
            if (answer === q.correct_answer) cls += ' correct'
            else if (answer === selected)    cls += ' wrong'
          }
          return (
            <button
              key={i}
              className={cls}
              onClick={() => handleSelect(answer)}
              dangerouslySetInnerHTML={{ __html: answer }}
            />
          )
        })}
      </div>

      {selected !== null && (
        <button className="trivia-btn" onClick={handleNext}>
          {index + 1 >= questions.length ? 'See results' : 'Next question'}
        </button>
      )}
    </div>
  )
}
