import { useState, useEffect, useCallback } from 'react'

/**
 * Fetches JSON from a URL and manages loading/error/data state.
 *
 * @param {string} url - The URL to fetch. Re-fetches automatically when this changes.
 * @returns {{ data: any, loading: boolean, error: string|null, refetch: function }}
 *
 * @example
 * const { data, loading, error, refetch } = useFetch('https://api.example.com/items')
 * if (loading) return <p>Loading…</p>
 * if (error)   return <button onClick={refetch}>Retry</button>
 * return <ul>{data.map(item => <li key={item.id}>{item.name}</li>)}</ul>
 */
export function useFetch(url) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const refetch = useCallback(() => setRetryCount(c => c + 1), [])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [url, retryCount])

  return { data, loading, error, refetch }
}
