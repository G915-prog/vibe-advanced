import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * AuthContext — provides the current user, loading state, and auth functions
 * (signUp, signIn, signOut) to any component in the tree.
 *
 * Usage in a child component:
 *   import { useAuth } from '../context/AuthContext'
 *   const { user, signOut } = useAuth()
 */
const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get the session that may already exist (e.g. user refreshes the page).
    // getSession() reads from localStorage — no network call.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // onAuthStateChange fires on: sign-in, sign-out, token refresh, tab focus.
    // This is the single source of truth for auth state — we never setUser
    // anywhere else except here and the getSession call above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    // Unsubscribe when the provider unmounts (app teardown).
    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
