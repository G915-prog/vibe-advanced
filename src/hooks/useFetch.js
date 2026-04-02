import { useState, useEffect, useCallback } from 'react'

// Module-level cache — survives component unmounts so the same URL is never
// re-fetched within a session (or within the TTL window).
const cache = new Map() // url -> { data, ts }
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached(url) {
  const hit = cache.get(url)
  return hit && Date.now() - hit.ts < CACHE_TTL ? hit.data : null
}

/**
 * Fetches JSON from a URL and manages loading/error/data state.
 * Results are cached for 5 minutes at module level; the same URL will not
 * trigger a network request again until the TTL expires or refetch() is called.
 * The fetch is delayed by 300ms — if the component unmounts before then
 * (e.g. the user navigates away) the request is cancelled with no network cost.
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
  const [data, setData]       = useState(() => getCached(url))
  const [loading, setLoading] = useState(() => getCached(url) === null)
  const [error, setError]     = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  // refetch busts the cache so a manual retry always hits the network
  const refetch = useCallback(() => {
    cache.delete(url)
    setRetryCount(c => c + 1)
  }, [url])

  useEffect(() => {
    const cached = getCached(url)
    if (cached !== null) {
      setData(cached)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`)
        const json = await res.json()
        cache.set(url, { data: json, ts: Date.now() })
        setData(json)
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchData, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [url, retryCount])

  return { data, loading, error, refetch }
}
