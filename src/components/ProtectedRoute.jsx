import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute — wraps any page that requires authentication.
 * Renders nothing while the session is loading (avoids a flash of /login).
 * Redirects to /login if there is no authenticated user.
 *
 * Usage in App.jsx:
 *   <Route path="/module/1" element={<ProtectedRoute><Module1 /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Still reading the session from localStorage — don't redirect yet.
  if (loading) return null

  // No session — send to login. `replace` avoids a /login entry in history
  // so the back button doesn't loop the user back to the login page.
  if (!user) return <Navigate to="/login" replace />

  return children
}
