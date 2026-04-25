import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../hooks/useTheme'

export default function ForgotPassword() {
  const { isDark, toggle } = useTheme()

  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://vibe-advanced.vercel.app/reset-password',
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for a reset link.')
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
        <h1 className="login-title">Reset your<br /><em>password</em></h1>
        <p className="login-sub">Enter your email and we'll send you a reset link.</p>

        <form className="login-form" onSubmit={handleSubmit}>
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

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <Link to="/login" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
