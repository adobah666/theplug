const CACHE_NAME = 'theplug-v1'
const STATIC_CACHE = 'theplug-static-v1'
const DYNAMIC_CACHE = 'theplug-dynamic-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API routes that should be cached
const API_CACHE_PATTERNS = [
  /^\/api\/products/,
  /^\/api\/categories/,
  /^\/api\/brands/
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('Service Worker: Static assets cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return
  }
  
  event.respondWith(
    handleFetch(request, url)
  )
})

async function handleFetch(request, url) {
  try {
    // Strategy 1: Cache First for static assets
    if (isStaticAsset(url.pathname)) {
      return await cacheFirst(request)
    }
    
    // Strategy 2: Network First for API calls
    if (isApiCall(url.pathname)) {
      return await networkFirst(request)
    }
    
    // Strategy 3: Stale While Revalidate for pages
    return await staleWhileRevalidate(request)
    
  } catch (error) {
    console.error('Service Worker: Fetch failed', error)
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline')
    }
    
    // Return a basic response for other requests
    return new Response('Offline', { status: 503 })
  }
}

// Cache First Strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  const networkResponse = await fetch(request)
  if (networkResponse.ok) {
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, networkResponse.clone())
  }
  
  return networkResponse
}

// Network First Strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request)
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(DYNAMIC_CACHE)
      cache.then((c) => c.put(request, networkResponse.clone()))
    }
    return networkResponse
  }).catch(() => {
    // Network failed, return cached version if available
    return cachedResponse
  })
  
  return cachedResponse || fetchPromise
}

// Helper functions
function isStaticAsset(pathname) {
  return pathname.startsWith('/icons/') ||
         pathname.startsWith('/images/') ||
         pathname.startsWith('/_next/static/') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.jpeg') ||
         pathname.endsWith('.svg') ||
         pathname.endsWith('.webp')
}

function isApiCall(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(pathname))
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)
  
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCart())
  }
  
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOrders())
  }
})

async function syncCart() {
  try {
    // Sync cart data when back online
    const cartData = await getStoredCartData()
    if (cartData) {
      await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartData)
      })
      await clearStoredCartData()
    }
  } catch (error) {
    console.error('Service Worker: Cart sync failed', error)
  }
}

async function syncOrders() {
  try {
    // Sync pending orders when back online
    const pendingOrders = await getStoredPendingOrders()
    for (const order of pendingOrders) {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      })
    }
    await clearStoredPendingOrders()
  } catch (error) {
    console.error('Service Worker: Order sync failed', error)
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')
  
  const options = {
    body: 'You have a new update from ThePlug!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  }
  
  if (event.data) {
    const data = event.data.json()
    options.body = data.body || options.body
    options.data = { ...options.data, ...data }
  }
  
  event.waitUntil(
    self.registration.showNotification('ThePlug', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked')
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  } else if (event.action === 'close') {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Helper functions for IndexedDB operations
async function getStoredCartData() {
  // Implementation would use IndexedDB to get stored cart data
  return null
}

async function clearStoredCartData() {
  // Implementation would clear stored cart data
}

async function getStoredPendingOrders() {
  // Implementation would get pending orders from IndexedDB
  return []
}

async function clearStoredPendingOrders() {
  // Implementation would clear pending orders
}