import { useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

export function useCloudSync(userId, state, setters) {
  const { theme, sound, view, tasks, categories, customThemes, categoryColors } = state
  const { setTheme, setSound, setView, setTasks, setCategories, setCustomThemes, setCategoryColors } = setters
  const initialPullDone = useRef(false)
  const isPulling = useRef(false)
  const debounceTimer = useRef(null)
  const stateRef = useRef(state)
  const rowId = `state_${userId}`

  stateRef.current = state

  // Push state to Supabase
  const push = useCallback(async (currentState) => {
    try {
      await supabase.from('tasks').upsert({
        id: rowId,
        user_id: userId,
        data: currentState,
        updated_at: new Date().toISOString(),
      })
    } catch {
      // Network error — silently ignore
    }
  }, [rowId, userId])

  // Pull remote state and apply it
  const pull = useCallback(async () => {
    isPulling.current = true
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('data')
        .eq('id', rowId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Row doesn't exist — push local state up
        isPulling.current = false
        await push(stateRef.current)
        return
      }
      if (error) { isPulling.current = false; return }

      if (data?.data) {
        const d = data.data
        if (d.theme !== undefined) setTheme(d.theme)
        if (d.sound !== undefined) setSound(d.sound)
        if (d.view !== undefined) setView(d.view)
        if (d.tasks !== undefined) setTasks(d.tasks)
        if (d.categories !== undefined) setCategories(d.categories)
        if (d.customThemes !== undefined) setCustomThemes(d.customThemes)
        if (d.categoryColors !== undefined && d.categoryColors._v >= 2) setCategoryColors(d.categoryColors)
      }
      // Keep isPulling true briefly so the debounced push effect
      // ignores the state updates triggered by the setters above
      setTimeout(() => { isPulling.current = false }, 100)
    } catch {
      isPulling.current = false
    }
  }, [rowId, push, setTheme, setSound, setView, setTasks, setCategories, setCustomThemes, setCategoryColors])

  // Initial pull on mount
  useEffect(() => {
    pull().then(() => { initialPullDone.current = true })
  }, [pull])

  // Debounced push on state change
  useEffect(() => {
    if (!initialPullDone.current) return
    if (isPulling.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (isPulling.current) return
      push({ theme, sound, view, tasks, categories, customThemes, categoryColors })
    }, 1500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [theme, sound, view, tasks, categories, customThemes, categoryColors, push])

  // Re-pull on tab visibility change
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && initialPullDone.current) {
        pull()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [pull])
}
