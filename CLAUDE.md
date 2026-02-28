# My Days — Project Context for Claude

## Overview
A personal todo/calendar app. Frontend hosted at **mydaystodo.vercel.app** (Vercel). Backend is **Supabase** (auth + database). GitHub is connected to Vercel — pushing to main auto-deploys.

## Tech Stack
- React 19 + Vite 7
- Supabase JS v2 (auth + JSONB storage — entire app state stored as one row per user)
- No CSS framework — all inline styles, fully custom components
- PWA with service worker (`public/sw.js`)
- No external UI or state management libraries

## Key Architecture
- All app state lives in `App.jsx` as `useState` hooks, initialized from `localStorage` via `storage.js`
- `useCloudSync.js` handles two-way sync between local React state and Supabase
- Entire state is stored as a single JSONB blob per user in the `tasks` table (id = `state_<userId>`)
- Recurring tasks are generated on-the-fly (not stored as multiple rows) — completion/skip tracked via sentinel marker tasks
- Supabase anon key is intentionally hardcoded in `src/supabase.js` (publishable key, not a secret)

## Sync Architecture (`useCloudSync.js`)
State flows: `localStorage ↔ React state ↔ Supabase`

**Normal online behavior (working correctly):**
- Debounced push (1.5s) on any state change
- Pull on tab visibility change
- Poll every 15s while tab is visible
- Echo prevention: skip push/pull if state matches `lastPulledJSON`

**Offline behavior (IN PROGRESS — not yet fixed):**
The goal is: if a device makes edits while offline, those edits should win when it reconnects (push before pull). If the device was offline but untouched, it should pull fresh state.

**Current approach in `useCloudSync.js`:**
- `tryPushPendingOrPull(source)` is called on visibility change and poll
- Compares `serialize(currentState)` to `lastPulledJSON.current`
- If they differ → push (local changes pending) → don't pull
- If they match → pull

**Known bug being debugged:**
The offline-edit case still reverts on reconnect. Debug logging has been added. The push correctly detects failure when offline and correctly succeeds on reconnect. However, a second `tryPushPendingOrPull` call fires immediately after the push, sees states match, and calls `pull()`. That pull is what reverts the state.

**Open questions at time of last session:**
1. What is triggering the second `tryPushPendingOrPull` call? (logging added: `source` param — will show `visibilitychange` or `poll`)
2. Is the pull returning early (`remote matches local: true`) or actually applying remote state?
3. If it's applying remote state: is Supabase returning the just-pushed data, or stale data? (task counts logged)

**Debug logging currently in the code** (temporary — remove once fixed):
- `[sync] push result` — logs error and return value
- `[sync] debounced push success`
- `[sync] tryPushPendingOrPull (from: <source>)` — shows what triggered it
- `[sync] pull — remote matches local / task counts` — shows whether pull applies state

## File Map
```
src/
  App.jsx          — main component, all state, useCloudSync call is at line ~183
  useCloudSync.js  — sync logic (actively being worked on)
  storage.js       — simple localStorage helpers (loadState / saveState)
  supabase.js      — Supabase client (hardcoded keys, intentional)
  utils.js         — date helpers, recurrence engine, sound synthesis
  themes.js        — theme definitions, color generation
  TaskCard.jsx     — task display (week + month variants)
  TaskModal.jsx    — create/edit task form
  SettingsModal.jsx — settings, themes, categories, sounds
  Toast.jsx        — notifications + confetti
  DatePicker.jsx   — custom date picker
  CustomSelect.jsx — custom dropdown
  DeleteDialog.jsx — confirm deletion
public/
  sw.js            — service worker (cache-first for assets, network-first for supabase.co)
  manifest.json    — PWA manifest
```

## Design Philosophy
- Zero external UI dependencies (no component libraries, no CSS frameworks)
- Offline-first: localStorage is source of truth, Supabase is sync layer
- No-bloat recurrence: instances generated on-the-fly, not stored
- Delight as first-class feature: custom sounds (Web Audio API), confetti, theming
- Keyboard-driven power user UX
- Intentional architectural simplicity: no Redux, no routing, no Context API

## Notes
- `npm run dev` script is missing from package.json — use `npx vite dev` instead
- Node.js must be installed via `nvm` (not `apt`) to get a modern version
- Do not add a `dev` script or change package.json unless asked
