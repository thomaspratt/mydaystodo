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
  const pendingPush = useRef(false)

  stateRef.current = state

  // Push state to Supabase — returns true on success, false on failure
  const push = useCallback(async (currentState) => {
    try {
      await supabase.from('tasks').upsert({
        id: rowId,
        user_id: userId,
        data: currentState,
        updated_at: new Date().toISOString(),
      })
      return true
    } catch {
      return false
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

  // If we have a pending push (from a prior failed attempt), try to push first.
  // Only pull if there is nothing pending — prevents offline edits from being overwritten.
  const tryPushPendingOrPull = useCallback(async () => {
    if (pendingPush.current) {
      const current = stateRef.current
      const success = await push(current)
      if (success) {
        pendingPush.current = false
        lastPulledJSON.current = JSON.stringify({
          theme: current.theme, sound: current.sound, view: current.view, tasks: current.tasks,
          categories: current.categories, customThemes: current.customThemes, categoryColors: current.categoryColors,
        })
      }
      // Whether push succeeded or failed, don't pull — never overwrite local state with remote
    } else {
      await pull()
    }
  }, [push, pull])

  // Initial pull on mount
  useEffect(() => {
    pull().then(() => { initialPullDone.current = true })
  }, [pull])

  // Debounced push on state change
  useEffect(() => {
    if (!initialPullDone.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      const current = { theme, sound, view, tasks, categories, customThemes, categoryColors }
      // Don't push if state matches what we last pulled — it's just an echo
      if (JSON.stringify(current) === lastPulledJSON.current) return
      const success = await push(current)
      if (success) {
        pendingPush.current = false
        lastPulledJSON.current = JSON.stringify(current)
      } else {
        // Push failed (offline) — mark as pending so next visibility/poll will push instead of pull
        pendingPush.current = true
      }
    }, 1500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [theme, sound, view, tasks, categories, customThemes, categoryColors, push])

  // On visibility change, push pending changes or pull fresh state
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && initialPullDone.current) {
        tryPushPendingOrPull()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [tryPushPendingOrPull])

  // Poll every 15s while tab is visible — push pending changes or pull fresh state
  useEffect(() => {
    let interval = null
    function start() {
      if (!interval) interval = setInterval(() => {
        if (initialPullDone.current) tryPushPendingOrPull()
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
  }, [tryPushPendingOrPull])
}
