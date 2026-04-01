import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useProgress — fetches and manages module_progress rows for the current
 * authenticated user. Provides a `progress` map ({ [moduleNum]: true }) for
 * backward compatibility with existing components, plus fine-grained helpers
 * for reading and mutating rows directly.
 *
 * Usage:
 *   const { progress, markComplete, markIncomplete, loading, error } = useProgress()
 *
 * `progress` is a plain object keyed by module number whose value is `true`
 * for any module the user has completed. This matches the shape the localStorage
 * version produced, so existing components need no changes.
 */
export function useProgress() {
  const [rows, setRows] = useState([])       // raw rows from Supabase
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  // Derive the backward-compatible progress map from raw rows
  const progress = rows.reduce((acc, row) => {
    if (row.completed) acc[row.module_num] = true
    return acc
  }, {})

  // ─── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchProgress() {
      if (cancelled) return
      setLoading(true)
      setError(null)

      // getSession() reads the cached token from localStorage — no network call,
      // so the ring never shows stale 0% while waiting for a round-trip.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('module_progress')
        .select('*')
        .eq('user_id', user.id)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setRows(data ?? [])
      }
      setLoading(false)
    }

    fetchProgress()

    // Re-fetch whenever the user signs in or out so the ring always reflects
    // the current auth state without requiring a page reload.
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      fetchProgress()
    })

    // ─── Realtime subscription ──────────────────────────────────────────────
    // Updates local state in place instead of re-fetching — avoids a round
    // trip on every change and keeps the UI snappy across tabs.
    channelRef.current = supabase
      .channel('module_progress_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'module_progress' },
        (payload) => {
          setRows(prev => [...prev, payload.new])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'module_progress' },
        (payload) => {
          setRows(prev => prev.map(r => r.id === payload.new.id ? payload.new : r))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'module_progress' },
        (payload) => {
          setRows(prev => prev.filter(r => r.id !== payload.old.id))
        }
      )
      .subscribe()

    // Cleanup — unsubscribe when the component unmounts (or the effect re-runs).
    // Without this, every mount leaks a WebSocket connection and an auth listener.
    return () => {
      cancelled = true
      authSub.unsubscribe()
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  // ─── Insert a single row ───────────────────────────────────────────────────
  async function insert(moduleNum) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: insertError } = await supabase
      .from('module_progress')
      .insert({ user_id: user.id, module_num: moduleNum })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return
    }
    setRows(prev => [...prev, data])
  }

  // ─── Update an existing row by module number ───────────────────────────────
  async function update(moduleNum, changes) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: updateError } = await supabase
      .from('module_progress')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('module_num', moduleNum)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return
    }
    setRows(prev => prev.map(r => (r.module_num === moduleNum ? data : r)))
  }

  // ─── Delete a row by module number ────────────────────────────────────────
  async function deleteRow(moduleNum) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: deleteError } = await supabase
      .from('module_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('module_num', moduleNum)

    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setRows(prev => prev.filter(r => r.module_num !== moduleNum))
  }

  // ─── markComplete: upsert completed=true ──────────────────────────────────
  async function markComplete(moduleNum) {
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: upsertError } = await supabase
      .from('module_progress')
      .upsert(
        {
          user_id: user.id,
          module_num: moduleNum,
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,module_num' }
      )
      .select()
      .single()

    if (upsertError) {
      setError(upsertError.message)
      return
    }
    setRows(prev => {
      const exists = prev.some(r => r.module_num === moduleNum)
      return exists
        ? prev.map(r => (r.module_num === moduleNum ? data : r))
        : [...prev, data]
    })
  }

  // ─── markIncomplete: set completed=false (keeps the row, clears timestamp) ─
  async function markIncomplete(moduleNum) {
    setError(null)
    await update(moduleNum, { completed: false, completed_at: null })
  }

  return {
    // backward-compatible map consumed by existing components
    progress,
    // raw rows for components that want the full record
    data: rows,
    loading,
    error,
    // granular helpers
    insert,
    update,
    deleteRow,
    // semantic helpers
    markComplete,
    markIncomplete,
  }
}
