import { useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

export function useCloudSync(userId, state, setters) {
  const { theme, sound, view, tasks, categories, customThemes, categoryColors } = state
  const { setTheme, setSound, setView, setTasks, setCategories, setCustomThemes, setCategoryColors } = setters
  const initialPullDone = useRef(false)
  const pullVersion = useRef(0)
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
    pullVersion.current++
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('data')
        .eq('id', rowId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Row doesn't exist — push local state up
        await push(stateRef.current)
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
        if (d.categoryColors !== undefined && d.categoryColors._v >= 2) setCategoryColors(d.categoryColors)
      }
    } catch {
      // Network error — silently ignore
    }
  }, [rowId, push, setTheme, setSound, setView, setTasks, setCategories, setCustomThemes, setCategoryColors])

  // Initial pull on mount
  useEffect(() => {
    pull().then(() => { initialPullDone.current = true })
  }, [pull])

  // Debounced push on state change
  useEffect(() => {
    if (!initialPullDone.current) return
    const versionAtSchedule = pullVersion.current
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      // If a pull happened since this push was scheduled, skip it —
      // the state change was from the pull, not a local edit
      if (pullVersion.current !== versionAtSchedule) return
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

  // Poll for remote changes every 15s so simultaneously open devices stay in sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (initialPullDone.current) pull()
    }, 15000)
    return () => clearInterval(interval)
  }, [pull])
}
