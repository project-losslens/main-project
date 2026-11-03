const CACHE_NAME = 'losslens-static-v1'
const CACHE_PREFIX = 'losslens-'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const response = await fetch('/index.html', { cache: 'no-cache' })
      if (!response.ok || response.type !== 'basic') {
        throw new Error('Could not cache the LossLens application shell.')
      }

      const documentText = await response.clone().text()
      const buildAssets = [
        ...documentText.matchAll(
          /(?:src|href)=["'](\/assets\/[^"']+)["']/g,
        ),
      ].map((match) => match[1])
      await cache.put('/index.html', response)
      await cache.addAll([
        '/offline.html',
        '/favicon.svg',
        '/icons.svg',
        '/losslens-logo-dark.png',
        '/manifest.webmanifest',
        ...new Set(buildAssets),
      ])
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/storage/') ||
    url.pathname.startsWith('/functions/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        try {
          const response = await fetch(request)
          const contentType = response.headers.get('content-type') ?? ''
          if (
            response.ok &&
            response.type === 'basic' &&
            contentType.includes('text/html')
          ) {
            await cache.put('/index.html', response.clone())
          }
          return response
        } catch (error) {
          const appShell = await cache.match('/index.html')
          if (appShell) return appShell

          const offlinePage = await cache.match('/offline.html')
          if (offlinePage) return offlinePage

          throw error
        }
      })(),
    )
    return
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/losslens-logo-dark.png'
  if (!isStaticAsset) {
    return
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request)
      if (cachedResponse) {
        return cachedResponse
      }

      const response = await fetch(request)
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone())
      }
      return response
    }),
  )
})
