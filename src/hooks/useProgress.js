import { useState, useEffect } from 'react'

export function useProgress() {
  const [progress, setProgress] = useState(
    () => JSON.parse(localStorage.getItem('vibe-progress') || '{}')
  )

  useEffect(() => {
    localStorage.setItem('vibe-progress', JSON.stringify(progress))
  }, [progress])

  function markComplete(id) {
    setProgress(prev => {
      if (prev[id]) return prev
      return { ...prev, [id]: true }
    })
  }

  return { progress, markComplete }
}
