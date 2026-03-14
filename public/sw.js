const SHELL_CACHE = 'usdt-transfer-shell-v2'
const SCOPE_URL = new URL('./', self.location.href)
const APP_SHELL_KEY = new URL('__app-shell__', SCOPE_URL).toString()

function toScopedUrl(path = './') {
  return new URL(path, SCOPE_URL).toString()
}

function toSameOriginCacheUrl(path) {
  if (!path) {
    return ''
  }

  try {
    const url = new URL(path, SCOPE_URL)

    return url.origin === self.location.origin ? url.toString() : ''
  } catch {
    return ''
  }
}

const PRECACHE_URLS = [
  './',
  'offline.html',
  'manifest.webmanifest',
  'icons/favicon.svg',
  'icons/apple-touch-icon.svg',
  'icons/apple-touch-icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
].map(toScopedUrl)

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS') {
    return
  }

  const urls = Array.isArray(event.data.payload)
    ? [...new Set(event.data.payload.map(toSameOriginCacheUrl).filter(Boolean))]
    : []

  if (urls.length === 0) {
    return
  }

  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await Promise.all(
        urls.map(async (url) => {
          try {
            await cache.add(url)
          } catch {
            return undefined
          }

          return undefined
        })
      )
    })
  )
})

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

function isStaticShellAsset(request, url) {
  if (request.method !== 'GET') {
    return false
  }

  if (url.origin !== self.location.origin) {
    return false
  }

  return ['style', 'script', 'worker', 'image', 'font', 'manifest'].includes(request.destination)
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  const networkResponse = await fetch(request)

  if (networkResponse && networkResponse.ok) {
    const cache = await caches.open(SHELL_CACHE)
    cache.put(request, networkResponse.clone())
  }

  return networkResponse
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request)

          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(SHELL_CACHE)
            cache.put(APP_SHELL_KEY, networkResponse.clone())
          }

          return networkResponse
        } catch {
          return (
            (await caches.match(APP_SHELL_KEY)) ||
            (await caches.match(toScopedUrl('./'))) ||
            (await caches.match(toScopedUrl('offline.html')))
          )
        }
      })()
    )

    return
  }

  if (!isStaticShellAsset(request, url)) {
    return
  }

  event.respondWith(
    cacheFirst(request).catch(async () => {
      if (request.destination === 'image') {
        return caches.match(toScopedUrl('icons/icon-192.png'))
      }

      return caches.match(toScopedUrl('offline.html'))
    })
  )
})
