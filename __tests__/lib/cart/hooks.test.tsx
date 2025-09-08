import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartProvider } from '@/lib/cart/context'
import { useCartItems, useCartTotal, useCartLoading, useCartError } from '@/lib/cart/hooks'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Test components for each hook
const CartItemsComponent: React.FC = () => {
  const items = useCartItems()
  return (
    <div data-testid="items-count">{items.length}</div>
  )
}

const CartTotalComponent: React.FC = () => {
  const { subtotal, itemCount } = useCartTotal()
  return (
    <div>
      <div data-testid="subtotal">{subtotal}</div>
      <div data-testid="item-count">{itemCount}</div>
    </div>
  )
}

const CartLoadingComponent: React.FC = () => {
  const { isLoading, updatingItems, removingItems } = useCartLoading()
  return (
    <div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="updating-count">{updatingItems.size}</div>
      <div data-testid="removing-count">{removingItems.size}</div>
    </div>
  )
}

const CartErrorComponent: React.FC = () => {
  const error = useCartError()
  return (
    <div data-testid="error">{error || 'none'}</div>
  )
}

const renderWithProvider = (Component: React.FC) => {
  return render(
    <CartProvider>
      <Component />
    </CartProvider>
  )
}

describe('Cart Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { items: [] } })
    })
  })

  describe('useCartItems', () => {
    it('returns empty array initially', () => {
      renderWithProvider(CartItemsComponent)
      expect(screen.getByTestId('items-count')).toHaveTextContent('0')
    })

    it('returns items from localStorage', () => {
      const savedCart = [
        { productId: 'prod-1', quantity: 1, price: 1000, name: 'Product 1', image: '/img1.jpg' },
        { productId: 'prod-2', quantity: 2, price: 2000, name: 'Product 2', image: '/img2.jpg' }
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedCart))

      renderWithProvider(CartItemsComponent)
      expect(screen.getByTestId('items-count')).toHaveTextContent('2')
    })
  })

  describe('useCartTotal', () => {
    it('returns zero totals initially', () => {
      renderWithProvider(CartTotalComponent)
      expect(screen.getByTestId('subtotal')).toHaveTextContent('0')
      expect(screen.getByTestId('item-count')).toHaveTextContent('0')
    })

    it('calculates totals correctly', () => {
      const savedCart = [
        { productId: 'prod-1', quantity: 2, price: 1000, name: 'Product 1', image: '/img1.jpg' },
        { productId: 'prod-2', quantity: 3, price: 2000, name: 'Product 2', image: '/img2.jpg' }
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedCart))

      renderWithProvider(CartTotalComponent)
      expect(screen.getByTestId('subtotal')).toHaveTextContent('8000') // (2*1000) + (3*2000)
      expect(screen.getByTestId('item-count')).toHaveTextContent('5') // 2 + 3
    })
  })

  describe('useCartLoading', () => {
    it('returns initial loading state', () => {
      renderWithProvider(CartLoadingComponent)
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('updating-count')).toHaveTextContent('0')
      expect(screen.getByTestId('removing-count')).toHaveTextContent('0')
    })
  })

  describe('useCartError', () => {
    it('returns null error initially', () => {
      renderWithProvider(CartErrorComponent)
      expect(screen.getByTestId('error')).toHaveTextContent('none')
    })
  })

  describe('Hook integration', () => {
    const IntegratedComponent: React.FC = () => {
      const items = useCartItems()
      const { subtotal, itemCount } = useCartTotal()
      const { isLoading } = useCartLoading()
      const error = useCartError()

      return (
        <div>
          <div data-testid="items-length">{items.length}</div>
          <div data-testid="subtotal">{subtotal}</div>
          <div data-testid="item-count">{itemCount}</div>
          <div data-testid="is-loading">{isLoading.toString()}</div>
          <div data-testid="error">{error || 'none'}</div>
        </div>
      )
    }

    it('all hooks work together correctly', () => {
      const savedCart = [
        { productId: 'prod-1', quantity: 1, price: 5000, name: 'Product 1', image: '/img1.jpg' }
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedCart))

      renderWithProvider(IntegratedComponent)
      
      expect(screen.getByTestId('items-length')).toHaveTextContent('1')
      expect(screen.getByTestId('subtotal')).toHaveTextContent('5000')
      expect(screen.getByTestId('item-count')).toHaveTextContent('1')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('error')).toHaveTextContent('none')
    })
  })
})