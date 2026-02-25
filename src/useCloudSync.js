import { useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

export function useCloudSync(userId, state, setters) {
  const { theme, sound, view, tasks, categories, customThemes } = state
  const { setTheme, setSound, setView, setTasks, setCategories, setCustomThemes } = setters
  const initialPullDone = useRef(false)
  const debounceTimer = useRef(null)
  const rowId = `state_${userId}`

  // Pull remote state and apply it
  const pull = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('data')
        .eq('id', rowId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Row doesn't exist — push local state up
        await push(state)
        return
      }
      if (error) return

      if (data?.data) {
        const d = data.data
        if (d.theme !== undefined) setTheme(d.theme)
        if (d.sound !== undefined) setSound(d.sound)
        if (d.view !== undefined) setView(d.view)
        if (d.tasks !== undefined) setTasks(d.tasks)
        if (d.categories !== undefined) setCategories(d.categories)
        if (d.customThemes !== undefined) setCustomThemes(d.customThemes)
      }
    } catch {
      // Network error — silently ignore
    }
  }, [rowId])

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

  // Initial pull on mount
  useEffect(() => {
    pull().then(() => { initialPullDone.current = true })
  }, [pull])

  // Debounced push on state change
  useEffect(() => {
    if (!initialPullDone.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      push({ theme, sound, view, tasks, categories, customThemes })
    }, 1500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [theme, sound, view, tasks, categories, customThemes, push])

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
