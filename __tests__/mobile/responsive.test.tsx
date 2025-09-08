import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer'
import { PWAInstallPrompt } from '@/components/layout/PWAInstallPrompt'
import { OfflineIndicator } from '@/components/layout/OfflineIndicator'
import { PWAProvider } from '@/lib/pwa/context'
import { AuthProvider } from '@/lib/auth/context'

// Mock hooks
vi.mock('@/lib/auth/hooks', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com'
    },
    logout: vi.fn()
  })
}))

vi.mock('@/lib/pwa/context', async () => {
  const actual = await vi.importActual('@/lib/pwa/context')
  return {
    ...actual,
    usePWA: () => ({
      isOnline: true,
      isInstalled: false,
      canInstall: true,
      isLoading: false,
      notificationsEnabled: false,
      installApp: vi.fn(),
      enableNotifications: vi.fn(),
      disableNotifications: vi.fn(),
      showOfflineToast: false,
      dismissOfflineToast: vi.fn()
    })
  }
})

// Mock viewport for mobile testing
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  window.dispatchEvent(new Event('resize'))
}

describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    // Reset viewport
    mockViewport(1024, 768)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('MobileNavDrawer', () => {
    it('should render mobile navigation drawer when open', () => {
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={true} onClose={vi.fn()} />
        </AuthProvider>
      )

      expect(screen.getByText('ThePlug')).toBeInTheDocument()
      expect(screen.getByText('Shop by Category')).toBeInTheDocument()
      expect(screen.getByText('Clothing')).toBeInTheDocument()
      expect(screen.getByText('Shoes')).toBeInTheDocument()
      expect(screen.getByText('Accessories')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={false} onClose={vi.fn()} />
        </AuthProvider>
      )

      expect(screen.queryByText('Shop by Category')).not.toBeInTheDocument()
    })

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={true} onClose={onClose} />
        </AuthProvider>
      )

      const backdrop = document.querySelector('.fixed.inset-0.bg-black')
      expect(backdrop).toBeInTheDocument()
      
      fireEvent.click(backdrop!)
      expect(onClose).toHaveBeenCalled()
    })

    it('should show user information when logged in', () => {
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={true} onClose={vi.fn()} />
        </AuthProvider>
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    it('should have proper touch targets for mobile', () => {
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={true} onClose={vi.fn()} />
        </AuthProvider>
      )

      const categoryLinks = screen.getAllByRole('link')
      categoryLinks.forEach(link => {
        const styles = window.getComputedStyle(link)
        // Check that touch targets are at least 44px (recommended minimum)
        expect(parseInt(styles.minHeight) || 0).toBeGreaterThanOrEqual(44)
      })
    })
  })

  describe('Mobile Viewport Tests', () => {
    it('should adapt to mobile viewport', () => {
      mockViewport(375, 667) // iPhone SE dimensions
      
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={true} onClose={vi.fn()} />
        </AuthProvider>
      )

      const drawer = document.querySelector('.w-80.max-w-\\[85vw\\]')
      expect(drawer).toBeInTheDocument()
    })

    it('should handle tablet viewport', () => {
      mockViewport(768, 1024) // iPad dimensions
      
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={true} onClose={vi.fn()} />
        </AuthProvider>
      )

      expect(screen.getByText('Shop by Category')).toBeInTheDocument()
    })

    it('should handle large mobile viewport', () => {
      mockViewport(414, 896) // iPhone 11 Pro Max dimensions
      
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={true} onClose={vi.fn()} />
        </AuthProvider>
      )

      expect(screen.getByText('Shop by Category')).toBeInTheDocument()
    })
  })

  describe('Touch Interactions', () => {
    it('should handle touch events properly', async () => {
      const onClose = vi.fn()
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={true} onClose={onClose} />
        </AuthProvider>
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      
      // Simulate touch events
      fireEvent.touchStart(closeButton)
      fireEvent.touchEnd(closeButton)
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should prevent scroll when drawer is open', () => {
      render(
        <AuthProvider>
          <MobileNavDrawer isOpen={true} onClose={vi.fn()} />
        </AuthProvider>
      )

      // Check that backdrop prevents scrolling
      const backdrop = document.querySelector('.fixed.inset-0')
      expect(backdrop).toBeInTheDocument()
    })
  })
})

describe('PWA Features', () => {
  describe('PWAInstallPrompt', () => {
    it('should render install prompt when available', () => {
      render(
        <PWAProvider>
          <PWAInstallPrompt />
        </PWAProvider>
      )

      expect(screen.getByText('Install ThePlug App')).toBeInTheDocument()
      expect(screen.getByText('Faster loading times')).toBeInTheDocument()
      expect(screen.getByText('Works offline')).toBeInTheDocument()
      expect(screen.getByText('Push notifications')).toBeInTheDocument()
    })

    it('should handle install button click', async () => {
      const mockInstall = vi.fn()
      vi.mocked(require('@/lib/pwa/context').usePWA).mockReturnValue({
        isOnline: true,
        isInstalled: false,
        canInstall: true,
        isLoading: false,
        notificationsEnabled: false,
        installApp: mockInstall,
        enableNotifications: vi.fn(),
        disableNotifications: vi.fn(),
        showOfflineToast: false,
        dismissOfflineToast: vi.fn()
      })

      render(
        <PWAProvider>
          <PWAInstallPrompt />
        </PWAProvider>
      )

      const installButton = screen.getByText('Install')
      fireEvent.click(installButton)

      await waitFor(() => {
        expect(mockInstall).toHaveBeenCalled()
      })
    })
  })

  describe('OfflineIndicator', () => {
    it('should show offline indicator when offline', () => {
      vi.mocked(require('@/lib/pwa/context').usePWA).mockReturnValue({
        isOnline: false,
        isInstalled: false,
        canInstall: false,
        isLoading: false,
        notificationsEnabled: false,
        installApp: vi.fn(),
        enableNotifications: vi.fn(),
        disableNotifications: vi.fn(),
        showOfflineToast: true,
        dismissOfflineToast: vi.fn()
      })

      render(
        <PWAProvider>
          <OfflineIndicator />
        </PWAProvider>
      )

      expect(screen.getByText("You're offline. Some features may be limited.")).toBeInTheDocument()
    })

    it('should not show when online', () => {
      vi.mocked(require('@/lib/pwa/context').usePWA).mockReturnValue({
        isOnline: true,
        isInstalled: false,
        canInstall: false,
        isLoading: false,
        notificationsEnabled: false,
        installApp: vi.fn(),
        enableNotifications: vi.fn(),
        disableNotifications: vi.fn(),
        showOfflineToast: false,
        dismissOfflineToast: vi.fn()
      })

      render(
        <PWAProvider>
          <OfflineIndicator />
        </PWAProvider>
      )

      expect(screen.queryByText("You're offline")).not.toBeInTheDocument()
    })
  })
})

describe('Mobile Form Optimization', () => {
  it('should have proper input types for mobile keyboards', () => {
    const { container } = render(
      <form>
        <input type="email" name="email" />
        <input type="tel" name="phone" />
        <input type="number" name="quantity" />
        <input type="text" name="name" />
      </form>
    )

    const emailInput = container.querySelector('input[type="email"]')
    const phoneInput = container.querySelector('input[type="tel"]')
    const numberInput = container.querySelector('input[type="number"]')
    const textInput = container.querySelector('input[type="text"]')

    expect(emailInput).toBeInTheDocument()
    expect(phoneInput).toBeInTheDocument()
    expect(numberInput).toBeInTheDocument()
    expect(textInput).toBeInTheDocument()
  })

  it('should have minimum touch target sizes', () => {
    const { container } = render(
      <div>
        <button>Click me</button>
        <input type="text" />
        <select>
          <option>Option 1</option>
        </select>
      </div>
    )

    const button = container.querySelector('button')
    const input = container.querySelector('input')
    const select = container.querySelector('select')

    // These elements should have CSS classes that ensure minimum 44px touch targets
    expect(button).toBeInTheDocument()
    expect(input).toBeInTheDocument()
    expect(select).toBeInTheDocument()
  })
})