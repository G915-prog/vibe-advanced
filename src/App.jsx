import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import Module1 from './pages/Module1'

export default function App() {
  useEffect(() => {
    const saved = localStorage.getItem('vibe-theme')
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/module-1" element={<Module1 />} />
    </Routes>
  )
}
