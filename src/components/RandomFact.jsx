import { useFetch } from '../hooks/useFetch'

const FACT_URL = import.meta.env.VITE_DEVFACT_API_URL

export default function RandomFact() {
  const { data, loading, error, refetch } = useFetch(FACT_URL)

  if (loading) return (
    <div className="fact-skeleton">
      <div className="fact-skeleton-line fact-skeleton-wide" />
      <div className="fact-skeleton-line" />
      <div className="fact-skeleton-line fact-skeleton-narrow" />
    </div>
  )

  if (error) return (
    <div className="fact-error">
      <p className="fact-error-msg">Could not load a fact right now.</p>
      <button className="fact-btn" onClick={refetch}>Try again</button>
    </div>
  )

  const { text, source_url } = data ?? {}

  if (!text) return (
    <p className="fact-empty">No fact available right now.</p>
  )

  return (
    <div className="fact-card">
      <div className="fact-kicker">did you know</div>
      <p className="fact-text">{text}</p>
      <div className="fact-footer">
        {source_url && (
          <a className="fact-source" href={source_url} target="_blank" rel="noreferrer">
            source ↗
          </a>
        )}
        <button className="fact-btn" onClick={refetch}>New fact</button>
      </div>
    </div>
  )
}
