import { useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

export function useCloudSync(userId, state, setters) {
  const { theme, sound, view, tasks, categories, customThemes, categoryColors } = state
  const { setTheme, setSound, setView, setTasks, setCategories, setCustomThemes, setCategoryColors } = setters
  const initialPullDone = useRef(false)
  const debounceTimer = useRef(null)
  const stateRef = useRef(state)
  const lastPulledJSON = useRef(null)
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
        // Normalize key order to match what push() constructs
        const d = data.data
        const normalized = JSON.stringify({
          theme: d.theme, sound: d.sound, view: d.view, tasks: d.tasks,
          categories: d.categories, customThemes: d.customThemes, categoryColors: d.categoryColors,
        })
        // Skip applying if remote state matches what we already have
        if (normalized === lastPulledJSON.current) return
        lastPulledJSON.current = normalized
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
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      const current = { theme, sound, view, tasks, categories, customThemes, categoryColors }
      // Don't push if state matches what we last pulled — it's just an echo
      if (JSON.stringify(current) === lastPulledJSON.current) return
      push(current)
      lastPulledJSON.current = JSON.stringify(current)
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

  // Poll for remote changes only while the tab is visible
  useEffect(() => {
    let interval = null
    function start() {
      if (!interval) interval = setInterval(() => {
        if (initialPullDone.current) pull()
      }, 15000)
    }
    function stop() {
      if (interval) { clearInterval(interval); interval = null }
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') start(); else stop()
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [pull])
}
