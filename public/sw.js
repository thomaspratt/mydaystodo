const CACHE_NAME = 'mydays-v2'

// Install — pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/index.html'])
    )
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Network-first for Supabase (auth + sync must be fresh)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cached) =>
          cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    )
    return
  }

  // Network-first for navigation requests (HTML pages)
  // Prevents stale index.html from referencing old hashed JS/CSS bundles
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    )
    return
  }

  // Cache-first with network update for static assets (JS/CSS with hashes)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => cached)

      return cached || fetchPromise
    })
  )
})
