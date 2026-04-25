import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../hooks/useTheme'

export default function ResetPassword() {
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  // Supabase exchanges the recovery token from the URL on page load.
  // Wait for onAuthStateChange to fire SIGNED_IN (via PASSWORD_RECOVERY)
  // before allowing the user to set a new password.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/forgot-password', { replace: true })
      } else {
        setSessionChecked(true)
      }
    })
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage('Password updated! Redirecting…')
    setTimeout(() => navigate('/'), 2000)
  }

  if (!sessionChecked) return null

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
        <h1 className="login-title">Choose a new<br /><em>password</em></h1>
        <p className="login-sub">Pick something strong. You won't need to remember the old one.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="password">New password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading || !!message}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
