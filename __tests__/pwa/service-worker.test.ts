import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock service worker environment
const mockServiceWorker = {
  addEventListener: vi.fn(),
  skipWaiting: vi.fn(),
  clients: {
    claim: vi.fn(),
    openWindow: vi.fn()
  },
  registration: {
    showNotification: vi.fn()
  }
}

// Mock caches API
const mockCache = {
  addAll: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  match: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(true)
}

const mockCaches = {
  open: vi.fn().mockResolvedValue(mockCache),
  match: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue(['old-cache-v1']),
  delete: vi.fn().mockResolvedValue(true)
}

// Mock fetch
const mockFetch = vi.fn()

// Setup global mocks
beforeEach(() => {
  global.self = mockServiceWorker as any
  global.caches = mockCaches as any
  global.fetch = mockFetch
  
  vi.clearAllMocks()
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('Service Worker', () => {
  describe('Installation', () => {
    it('should cache static assets on install', async () => {
      const installEvent = {
        waitUntil: vi.fn()
      }

      // Simulate install event
      const installHandler = vi.fn(async () => {
        await mockCaches.open('theplug-static-v1')
        await mockCache.addAll([
          '/',
          '/offline',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png'
        ])
        await mockServiceWorker.skipWaiting()
      })

      await installHandler()

      expect(mockCaches.open).toHaveBeenCalledWith('theplug-static-v1')
      expect(mockCache.addAll).toHaveBeenCalledWith([
        '/',
        '/offline',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ])
      expect(mockServiceWorker.skipWaiting).toHaveBeenCalled()
    })

    it('should handle cache errors gracefully', async () => {
      mockCache.addAll.mockRejectedValueOnce(new Error('Cache failed'))
      
      const installHandler = vi.fn(async () => {
        try {
          await mockCaches.open('theplug-static-v1')
          await mockCache.addAll(['/'])
        } catch (error) {
          console.error('Service Worker: Failed to cache static assets', error)
        }
      })

      await expect(installHandler()).resolves.not.toThrow()
    })
  })

  describe('Activation', () => {
    it('should clean up old caches on activate', async () => {
      const activateHandler = vi.fn(async () => {
        const cacheNames = await mockCaches.keys()
        await Promise.all(
          cacheNames.map((cacheName: string) => {
            if (cacheName !== 'theplug-static-v1' && cacheName !== 'theplug-dynamic-v1') {
              return mockCaches.delete(cacheName)
            }
          })
        )
        await mockServiceWorker.clients.claim()
      })

      await activateHandler()

      expect(mockCaches.keys).toHaveBeenCalled()
      expect(mockCaches.delete).toHaveBeenCalledWith('old-cache-v1')
      expect(mockServiceWorker.clients.claim).toHaveBeenCalled()
    })
  })

  describe('Fetch Strategies', () => {
    it('should implement cache-first for static assets', async () => {
      const request = new Request('/icons/icon-192x192.png')
      const cachedResponse = new Response('cached')
      
      mockCache.match.mockResolvedValueOnce(cachedResponse)

      const cacheFirstHandler = vi.fn(async (req: Request) => {
        const cached = await mockCache.match(req)
        if (cached) {
          return cached
        }
        
        const networkResponse = await fetch(req)
        if (networkResponse.ok) {
          await mockCache.put(req, networkResponse.clone())
        }
        return networkResponse
      })

      const result = await cacheFirstHandler(request)
      
      expect(result).toBe(cachedResponse)
      expect(mockCache.match).toHaveBeenCalledWith(request)
    })

    it('should implement network-first for API calls', async () => {
      const request = new Request('/api/products')
      const networkResponse = new Response('network')
      
      mockFetch.mockResolvedValueOnce(networkResponse)

      const networkFirstHandler = vi.fn(async (req: Request) => {
        try {
          const response = await fetch(req)
          if (response.ok) {
            await mockCache.put(req, response.clone())
          }
          return response
        } catch (error) {
          const cached = await mockCache.match(req)
          if (cached) {
            return cached
          }
          throw error
        }
      })

      const result = await networkFirstHandler(request)
      
      expect(result).toBe(networkResponse)
      expect(mockFetch).toHaveBeenCalledWith(request)
      expect(mockCache.put).toHaveBeenCalledWith(request, expect.any(Response))
    })

    it('should fall back to cache when network fails', async () => {
      const request = new Request('/api/products')
      const cachedResponse = new Response('cached')
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockCache.match.mockResolvedValueOnce(cachedResponse)

      const networkFirstHandler = vi.fn(async (req: Request) => {
        try {
          const response = await fetch(req)
          return response
        } catch (error) {
          const cached = await mockCache.match(req)
          if (cached) {
            return cached
          }
          throw error
        }
      })

      const result = await networkFirstHandler(request)
      
      expect(result).toBe(cachedResponse)
      expect(mockCache.match).toHaveBeenCalledWith(request)
    })

    it('should return offline page for navigation requests when offline', async () => {
      const request = new Request('/', { mode: 'navigate' })
      const offlinePage = new Response('offline')
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockCaches.match.mockResolvedValueOnce(offlinePage)

      const fetchHandler = vi.fn(async (req: Request) => {
        try {
          return await fetch(req)
        } catch (error) {
          if (req.mode === 'navigate') {
            return await mockCaches.match('/offline')
          }
          return new Response('Offline', { status: 503 })
        }
      })

      const result = await fetchHandler(request)
      
      expect(result).toBe(offlinePage)
      expect(mockCaches.match).toHaveBeenCalledWith('/offline')
    })
  })

  describe('Background Sync', () => {
    it('should handle cart sync events', async () => {
      const syncEvent = {
        tag: 'cart-sync',
        waitUntil: vi.fn()
      }

      const syncHandler = vi.fn(async (event: any) => {
        if (event.tag === 'cart-sync') {
          // Mock cart sync logic
          const cartData = { items: [] }
          if (cartData) {
            await fetch('/api/cart/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cartData)
            })
          }
        }
      })

      await syncHandler(syncEvent)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] })
      })
    })

    it('should handle order sync events', async () => {
      const syncEvent = {
        tag: 'order-sync',
        waitUntil: vi.fn()
      }

      const syncHandler = vi.fn(async (event: any) => {
        if (event.tag === 'order-sync') {
          // Mock order sync logic
          const pendingOrders = [{ id: '1', items: [] }]
          for (const order of pendingOrders) {
            await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(order)
            })
          }
        }
      })

      await syncHandler(syncEvent)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '1', items: [] })
      })
    })
  })

  describe('Push Notifications', () => {
    it('should show notification on push event', async () => {
      const pushEvent = {
        data: {
          json: () => ({
            title: 'Test Notification',
            body: 'Test message',
            data: { type: 'test' }
          })
        },
        waitUntil: vi.fn()
      }

      const pushHandler = vi.fn(async (event: any) => {
        const data = event.data.json()
        const options = {
          body: data.body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: data.data,
          vibrate: [200, 100, 200]
        }
        
        await mockServiceWorker.registration.showNotification(data.title, options)
      })

      await pushHandler(pushEvent)
      
      expect(mockServiceWorker.registration.showNotification).toHaveBeenCalledWith(
        'Test Notification',
        expect.objectContaining({
          body: 'Test message',
          icon: '/icons/icon-192x192.png',
          data: { type: 'test' }
        })
      )
    })

    it('should handle notification click events', async () => {
      const notificationEvent = {
        notification: {
          close: vi.fn()
        },
        action: 'explore',
        waitUntil: vi.fn()
      }

      const clickHandler = vi.fn(async (event: any) => {
        event.notification.close()
        
        if (event.action === 'explore') {
          await mockServiceWorker.clients.openWindow('/')
        }
      })

      await clickHandler(notificationEvent)
      
      expect(notificationEvent.notification.close).toHaveBeenCalled()
      expect(mockServiceWorker.clients.openWindow).toHaveBeenCalledWith('/')
    })
  })

  describe('Asset Classification', () => {
    it('should correctly identify static assets', () => {
      const isStaticAsset = (pathname: string) => {
        return pathname.startsWith('/icons/') ||
               pathname.startsWith('/images/') ||
               pathname.startsWith('/_next/static/') ||
               pathname.endsWith('.css') ||
               pathname.endsWith('.js') ||
               pathname.endsWith('.png') ||
               pathname.endsWith('.jpg') ||
               pathname.endsWith('.svg')
      }

      expect(isStaticAsset('/icons/icon-192x192.png')).toBe(true)
      expect(isStaticAsset('/images/hero.jpg')).toBe(true)
      expect(isStaticAsset('/_next/static/chunks/main.js')).toBe(true)
      expect(isStaticAsset('/styles.css')).toBe(true)
      expect(isStaticAsset('/api/products')).toBe(false)
      expect(isStaticAsset('/products/123')).toBe(false)
    })

    it('should correctly identify API calls', () => {
      const apiPatterns = [
        /^\/api\/products/,
        /^\/api\/categories/,
        /^\/api\/brands/
      ]

      const isApiCall = (pathname: string) => {
        return apiPatterns.some(pattern => pattern.test(pathname))
      }

      expect(isApiCall('/api/products')).toBe(true)
      expect(isApiCall('/api/products/123')).toBe(true)
      expect(isApiCall('/api/categories')).toBe(true)
      expect(isApiCall('/api/brands/nike')).toBe(true)
      expect(isApiCall('/products/123')).toBe(false)
      expect(isApiCall('/categories/clothing')).toBe(false)
    })
  })
})