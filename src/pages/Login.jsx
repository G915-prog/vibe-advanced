import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const { error } = await signUp(email, password)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for a confirmation link before signing in.')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-header">
        <Link to="/" className="logo"><span>VIBE</span>:ADVANCED</Link>
        <button className="theme-toggle" onClick={toggle}>
          {isDark ? '☀ light' : '☽ dark'}
        </button>
      </div>

      <div className="login-wrap">
        <div className="login-kicker">account</div>
        <h1 className="login-title">Sign in to<br /><em>your course</em></h1>
        <p className="login-sub">Progress is saved to your account and syncs across devices.</p>

        <form className="login-form" onSubmit={handleSignIn}>
          <div className="form-field">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSignUp}
              disabled={loading}
            >
              {loading ? '…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
