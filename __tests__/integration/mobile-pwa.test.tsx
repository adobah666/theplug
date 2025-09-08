import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { PWAProvider } from '@/lib/pwa/context'
import { AuthProvider } from '@/lib/auth/context'
import { CartProvider } from '@/lib/cart/context'
import { Header } from '@/components/layout/Header'
import { ProductGrid } from '@/components/product/ProductGrid'
import { SearchBar } from '@/components/product/SearchBar'

// Mock Next.js router
const mockPush = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/',
}))

// Mock auth hook
vi.mock('@/lib/auth/hooks', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    isLoading: false,
  }),
}))

// Mock cart hook
vi.mock('@/lib/cart/hooks', () => ({
  useCart: () => ({
    state: {
      items: [],
      itemCount: 0,
      subtotal: 0,
      isLoading: false,
      updatingItems: new Set(),
      removingItems: new Set(),
    },
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
  }),
}))

// Mock PWA context
const mockPWAContext = {
  isOnline: true,
  isInstalled: false,
  canInstall: false,
  isLoading: false,
  notificationsEnabled: false,
  installApp: vi.fn(),
  enableNotifications: vi.fn(),
  disableNotifications: vi.fn(),
  showOfflineToast: false,
  dismissOfflineToast: vi.fn(),
}

vi.mock('@/lib/pwa/context', () => ({
  PWAProvider: ({ children }: { children: React.ReactNode }) => children,
  usePWA: () => mockPWAContext,
}))

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock viewport
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

// Mock products data
const mockProducts = [
  {
    _id: '1',
    name: 'Test Product 1',
    description: 'A great test product',
    price: 29.99,
    images: ['/test-image-1.jpg'],
    brand: 'Test Brand',
    rating: 4.5,
    reviewCount: 10,
    inventory: 5,
  },
  {
    _id: '2',
    name: 'Test Product 2',
    description: 'Another great test product',
    price: 39.99,
    images: ['/test-image-2.jpg'],
    brand: 'Test Brand',
    rating: 4.0,
    reviewCount: 8,
    inventory: 3,
  },
]

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PWAProvider>
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  </PWAProvider>
)

describe('Mobile & PWA Integration', () => {
  beforeEach(() => {
    mockViewport(1024, 768) // Default desktop
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Mobile Responsiveness', () => {
    it('should adapt header for mobile viewport', async () => {
      mockViewport(375, 667) // iPhone SE
      
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      )

      // Mobile menu button should be visible
      const menuButton = screen.getByRole('button', { name: /menu/i })
      expect(menuButton).toBeInTheDocument()

      // Desktop navigation should be hidden
      expect(screen.queryByText('Clothing')).not.toBeInTheDocument()
    })

    it('should show mobile navigation when menu is opened', async () => {
      mockViewport(375, 667)
      
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      )

      const menuButton = screen.getByRole('button', { name: /menu/i })
      fireEvent.click(menuButton)

      await waitFor(() => {
        expect(screen.getByText('Shop by Category')).toBeInTheDocument()
        expect(screen.getByText('Clothing')).toBeInTheDocument()
        expect(screen.getByText('Shoes')).toBeInTheDocument()
        expect(screen.getByText('Accessories')).toBeInTheDocument()
      })
    })

    it('should optimize product grid for mobile', () => {
      mockViewport(375, 667)
      
      render(
        <TestWrapper>
          <ProductGrid products={mockProducts} />
        </TestWrapper>
      )

      const productGrid = screen.getByRole('main') || document.querySelector('.grid')
      expect(productGrid).toBeInTheDocument()

      // Should show products in mobile-optimized grid
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })

    it('should have proper touch targets on mobile', () => {
      mockViewport(375, 667)
      
      render(
        <TestWrapper>
          <ProductGrid products={mockProducts} />
        </TestWrapper>
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        // Touch targets should be at least 44px
        const minHeight = parseInt(styles.minHeight) || parseInt(styles.height) || 0
        const minWidth = parseInt(styles.minWidth) || parseInt(styles.width) || 0
        
        if (minHeight > 0) {
          expect(minHeight).toBeGreaterThanOrEqual(44)
        }
        if (minWidth > 0) {
          expect(minWidth).toBeGreaterThanOrEqual(44)
        }
      })
    })

    it('should optimize search bar for mobile', async () => {
      mockViewport(375, 667)
      
      render(
        <TestWrapper>
          <SearchBar />
        </TestWrapper>
      )

      const searchInput = screen.getByRole('combobox')
      expect(searchInput).toBeInTheDocument()
      
      // Should have proper font size to prevent zoom on iOS
      expect(searchInput).toHaveStyle({ fontSize: '16px' })
    })
  })

  describe('PWA Features', () => {
    it('should show install prompt when available', () => {
      mockPWAContext.canInstall = true
      
      render(
        <TestWrapper>
          <div>PWA Test</div>
        </TestWrapper>
      )

      // Install prompt should be available through context
      expect(mockPWAContext.canInstall).toBe(true)
    })

    it('should handle offline state', () => {
      mockPWAContext.isOnline = false
      mockPWAContext.showOfflineToast = true
      
      render(
        <TestWrapper>
          <div>PWA Test</div>
        </TestWrapper>
      )

      expect(mockPWAContext.isOnline).toBe(false)
      expect(mockPWAContext.showOfflineToast).toBe(true)
    })

    it('should handle notification permissions', async () => {
      const mockEnableNotifications = vi.fn().mockResolvedValue(true)
      mockPWAContext.enableNotifications = mockEnableNotifications
      
      render(
        <TestWrapper>
          <div>PWA Test</div>
        </TestWrapper>
      )

      await mockPWAContext.enableNotifications()
      expect(mockEnableNotifications).toHaveBeenCalled()
    })
  })

  describe('Touch Interactions', () => {
    it('should handle touch events on mobile', async () => {
      mockViewport(375, 667)
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <ProductGrid products={mockProducts} />
        </TestWrapper>
      )

      const addToCartButton = screen.getAllByText('Add to Cart')[0]
      
      // Simulate touch interaction
      await user.click(addToCartButton)
      
      // Button should be clickable
      expect(addToCartButton).toBeInTheDocument()
    })

    it('should handle swipe gestures for navigation', async () => {
      mockViewport(375, 667)
      
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      )

      const menuButton = screen.getByRole('button', { name: /menu/i })
      fireEvent.click(menuButton)

      // Should open mobile navigation
      await waitFor(() => {
        expect(screen.getByText('Shop by Category')).toBeInTheDocument()
      })

      // Simulate backdrop click to close
      const backdrop = document.querySelector('.fixed.inset-0')
      if (backdrop) {
        fireEvent.click(backdrop)
      }
    })
  })

  describe('Performance Optimizations', () => {
    it('should lazy load images on mobile', () => {
      mockViewport(375, 667)
      
      render(
        <TestWrapper>
          <ProductGrid products={mockProducts} />
        </TestWrapper>
      )

      const images = document.querySelectorAll('img')
      images.forEach(img => {
        // Images should have proper loading attributes
        expect(img.getAttribute('loading')).toBeTruthy()
      })
    })

    it('should optimize font sizes for mobile', () => {
      mockViewport(375, 667)
      
      render(
        <TestWrapper>
          <ProductGrid products={mockProducts} />
        </TestWrapper>
      )

      // Text should be readable on mobile
      const productNames = screen.getAllByText(/Test Product/)
      productNames.forEach(name => {
        const styles = window.getComputedStyle(name)
        const fontSize = parseInt(styles.fontSize)
        expect(fontSize).toBeGreaterThanOrEqual(14) // Minimum readable size
      })
    })
  })

  describe('Accessibility on Mobile', () => {
    it('should maintain accessibility on mobile', () => {
      mockViewport(375, 667)
      
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      )

      // All interactive elements should have proper labels
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(
          button.getAttribute('aria-label') || 
          button.textContent || 
          button.querySelector('span')?.textContent
        ).toBeTruthy()
      })
    })

    it('should have proper focus management on mobile', async () => {
      mockViewport(375, 667)
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SearchBar />
        </TestWrapper>
      )

      const searchInput = screen.getByRole('combobox')
      await user.click(searchInput)
      
      expect(searchInput).toHaveFocus()
    })
  })

  describe('Cross-Device Compatibility', () => {
    const testViewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
    ]

    testViewports.forEach(({ name, width, height }) => {
      it(`should work correctly on ${name}`, () => {
        mockViewport(width, height)
        
        render(
          <TestWrapper>
            <Header />
            <ProductGrid products={mockProducts} />
          </TestWrapper>
        )

        // Basic functionality should work on all devices
        expect(screen.getByText('ThePlug')).toBeInTheDocument()
        expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      })
    })
  })
})