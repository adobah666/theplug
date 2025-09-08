'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import PushNotificationService from '@/lib/notifications/push'

interface PWAContextType {
  isOnline: boolean
  isInstalled: boolean
  canInstall: boolean
  isLoading: boolean
  notificationsEnabled: boolean
  installApp: () => Promise<void>
  enableNotifications: () => Promise<boolean>
  disableNotifications: () => Promise<boolean>
  showOfflineToast: boolean
  dismissOfflineToast: () => void
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

interface PWAProviderProps {
  children: ReactNode
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showOfflineToast, setShowOfflineToast] = useState(false)
  const [pushService] = useState(() => PushNotificationService.getInstance())

  useEffect(() => {
    // Initialize PWA features
    initializePWA()
    
    // Set up online/offline listeners
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineToast(false)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineToast(true)
    }

    // Set up install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    // Set up app installed listener
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const initializePWA = async () => {
    try {
      // Check if app is installed
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      setIsInstalled(isStandalone || isInWebAppiOS)

      // Check online status
      setIsOnline(navigator.onLine)

      // Initialize push notifications
      await pushService.initialize()
      
      // Check if notifications are enabled
      const subscription = await pushService.getSubscription()
      setNotificationsEnabled(!!subscription && Notification.permission === 'granted')

      // Register service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('Service Worker registered:', registration)
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, show update notification
                  showUpdateNotification()
                }
              })
            }
          })
        } catch (error) {
          console.error('Service Worker registration failed:', error)
        }
      }
    } catch (error) {
      console.error('PWA initialization failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const installApp = async (): Promise<void> => {
    if (!deferredPrompt) {
      throw new Error('Install prompt not available')
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setCanInstall(false)
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.error('App installation failed:', error)
      throw error
    }
  }

  const enableNotifications = async (): Promise<boolean> => {
    try {
      const subscription = await pushService.subscribe()
      const enabled = !!subscription
      setNotificationsEnabled(enabled)
      return enabled
    } catch (error) {
      console.error('Failed to enable notifications:', error)
      return false
    }
  }

  const disableNotifications = async (): Promise<boolean> => {
    try {
      const success = await pushService.unsubscribe()
      if (success) {
        setNotificationsEnabled(false)
      }
      return success
    } catch (error) {
      console.error('Failed to disable notifications:', error)
      return false
    }
  }

  const dismissOfflineToast = () => {
    setShowOfflineToast(false)
  }

  const showUpdateNotification = () => {
    // Show a notification that new content is available
    if (notificationsEnabled) {
      pushService.showLocalNotification({
        title: 'App Updated!',
        body: 'New features and improvements are available. Refresh to get the latest version.',
        data: { type: 'app_update' },
        actions: [
          { action: 'refresh', title: 'Refresh Now' }
        ],
        tag: 'app_update'
      })
    }
  }

  const value: PWAContextType = {
    isOnline,
    isInstalled,
    canInstall,
    isLoading,
    notificationsEnabled,
    installApp,
    enableNotifications,
    disableNotifications,
    showOfflineToast,
    dismissOfflineToast
  }

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  )
}

export const usePWA = (): PWAContextType => {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider')
  }
  return context
}

export default PWAContext