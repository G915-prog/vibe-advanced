import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('vibe-theme') === 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('vibe-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return { isDark, toggle: () => setIsDark(d => !d) }
}
