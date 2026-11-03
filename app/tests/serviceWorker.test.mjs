import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

function createWorker(fetchImplementation) {
  const listeners = new Map()
  const cacheEntries = new Map()
  const fetcher = async (request) => fetchImplementation(request)
  const cache = {
    add: async (key) => {
      const result = await fetcher(key)
      if (!result.ok) throw new Error(`Could not cache ${key}`)
      cacheEntries.set(key, result)
    },
    addAll: async (keys) => {
      for (const key of keys) await cache.add(key)
    },
    match: async (key) => cacheEntries.get(cacheKey(key)),
    put: async (key, response) => cacheEntries.set(cacheKey(key), response),
  }
  const caches = {
    open: async () => cache,
    keys: async () => ['losslens-static-v1'],
    delete: async () => true,
  }
  const self = {
    location: { origin: 'https://losslens.test' },
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener: (type, callback) => listeners.set(type, callback),
  }
  const source = readFile(
    new URL('../public/sw.js', import.meta.url),
    'utf8',
  )

  return source.then((code) => {
    vm.runInNewContext(code, {
      self,
      caches,
      fetch: fetcher,
      URL,
      Promise,
    })
    return { listeners, cacheEntries }
  })
}

function cacheKey(request) {
  if (typeof request === 'string') return request
  return new URL(request.url).pathname
}

function response(
  name,
  contentType = 'text/html',
  body = '<html></html>',
) {
  return {
    name,
    ok: true,
    type: 'basic',
    headers: { get: () => contentType },
    text: async () => body,
    clone() {
      return response(name, contentType, body)
    },
  }
}

async function dispatchFetch(listeners, request) {
  let responsePromise
  listeners.get('fetch')({
    request,
    respondWith(value) {
      responsePromise = Promise.resolve(value)
    },
  })
  return responsePromise
}

test('install precaches the static shell, its build assets, and offline notice', async () => {
  const { listeners, cacheEntries } = await createWorker(async (request) => {
    if (request === '/index.html') {
      return response(
        'shell',
        'text/html',
        '<script src="/assets/app.js"></script><link href="/assets/app.css" rel="stylesheet">',
      )
    }
    return response(String(request), 'application/javascript')
  })
  let waitPromise
  listeners.get('install')({ waitUntil(value) { waitPromise = value } })
  await waitPromise
  assert.equal(cacheEntries.get('/index.html').name, 'shell')
  assert.equal(cacheEntries.get('/offline.html').name, '/offline.html')
  assert.equal(cacheEntries.get('/assets/app.js').name, '/assets/app.js')
  assert.equal(cacheEntries.get('/assets/app.css').name, '/assets/app.css')
})

test('navigation caches only the static app shell and uses it after network loss', async () => {
  let online = true
  const { listeners, cacheEntries } = await createWorker(async () => {
    if (!online) throw new Error('offline')
    return response('static-shell')
  })
  const onlineResponse = await dispatchFetch(listeners, {
    method: 'GET',
    mode: 'navigate',
    url: 'https://losslens.test/',
  })
  assert.equal(onlineResponse.name, 'static-shell')
  assert.equal(cacheEntries.get('/index.html').name, 'static-shell')

  online = false
  const offlineResponse = await dispatchFetch(listeners, {
    method: 'GET',
    mode: 'navigate',
    url: 'https://losslens.test/true-cost',
  })
  assert.equal(offlineResponse.name, 'static-shell')
})

test('service worker does not intercept API, cross-origin or non-GET requests', async () => {
  const { listeners } = await createWorker(async () => response('network'))
  for (const request of [
    { method: 'POST', mode: 'cors', url: 'https://losslens.test/assets/data' },
    { method: 'GET', mode: 'cors', url: 'https://losslens.test/rest/v1/financial_entries' },
    { method: 'GET', mode: 'cors', url: 'https://supabase.test/rest/v1/financial_entries' },
  ]) {
    assert.equal(await dispatchFetch(listeners, request), undefined)
  }
})
