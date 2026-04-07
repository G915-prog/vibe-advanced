import { Link, NavLink } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../context/AuthContext'

export default function Header({ variant = 'home' }) {
  const { isDark, toggle } = useTheme()
  const { user, signOut } = useAuth()

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
          <NavLink to="/module/1">01 React</NavLink>
          <NavLink to="/module/2">02 Prompting</NavLink>
          <NavLink to="/module/3">03 Supabase</NavLink>
          <NavLink to="/module/4">04 API</NavLink>
          <NavLink to="/module/5">05 Quiz App</NavLink>
          <NavLink to="/module/6">06 Link-in-Bio</NavLink>
          <NavLink to="/module/7">07 Cloudflare</NavLink>
          <NavLink to="/showcase">Showcase</NavLink>
        </nav>
      )}

      <div className="header-actions">
        {user ? (
          <button className="auth-btn" onClick={signOut}>Sign out</button>
        ) : (
          <Link to="/login" className="auth-btn">Sign in</Link>
        )}
        <button className="theme-toggle" onClick={toggle}>
          {isDark ? '☀ light' : '☽ dark'}
        </button>
      </div>
    </header>
  )
}
