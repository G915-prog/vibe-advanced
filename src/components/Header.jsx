import { Link, NavLink } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

export default function Header({ variant = 'module' }) {
  const { isDark, toggle } = useTheme()

  return (
    <header>
      <Link to="/" className="logo"><span>VIBE</span>:ADVANCED</Link>

      {variant === 'home' ? (
        <div className="header-meta">
          Personal learning journal<br />
          Est. 2025 — ongoing
        </div>
      ) : (
        <nav className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/module-1">01 React</NavLink>
          <a href="#">02 Prompting</a>
          <a href="#">03 Supabase</a>
        </nav>
      )}

      <button className="theme-toggle" onClick={toggle}>
        {isDark ? '☀ light' : '☽ dark'}
      </button>
    </header>
  )
}
