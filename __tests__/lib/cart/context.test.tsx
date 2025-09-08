import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CartProvider, useCart } from '@/lib/cart/context'
import { CartItemData } from '@/components/cart/CartItem'

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

// Test component that uses cart context
const TestComponent: React.FC = () => {
  const { state, addItem, updateQuantity, removeItem, clearCart, refreshCart } = useCart()

  const testItem: Omit<CartItemData, '_id'> = {
    productId: 'prod-1',
    variantId: 'var-1',
    quantity: 2,
    price: 5000,
    name: 'Test Product',
    image: '/test-image.jpg',
    size: 'M',
    color: 'blue'
  }

  return (
    <div>
      <div data-testid="item-count">{state.itemCount}</div>
      <div data-testid="subtotal">{state.subtotal}</div>
      <div data-testid="loading">{state.isLoading.toString()}</div>
      <div data-testid="error">{state.error || 'none'}</div>
      
      <button onClick={() => addItem(testItem)} data-testid="add-item">
        Add Item
      </button>
      <button onClick={() => updateQuantity('prod-1', 'var-1', 3)} data-testid="update-item">
        Update Item
      </button>
      <button onClick={() => removeItem('prod-1', 'var-1')} data-testid="remove-item">
        Remove Item
      </button>
      <button onClick={() => clearCart()} data-testid="clear-cart">
        Clear Cart
      </button>
      <button onClick={() => refreshCart()} data-testid="refresh-cart">
        Refresh Cart
      </button>

      <div data-testid="items">
        {state.items.map((item, index) => (
          <div key={index} data-testid={`item-${index}`}>
            {item.name} - {item.quantity} - {item.price}
          </div>
        ))}
      </div>
    </div>
  )
}

const renderWithProvider = () => {
  return render(
    <CartProvider>
      <TestComponent />
    </CartProvider>
  )
}

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { items: [] } })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with empty cart', () => {
    renderWithProvider()

    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('error')).toHaveTextContent('none')
  })

  it('loads cart from localStorage on mount', () => {
    const savedCart = [
      {
        productId: 'prod-1',
        quantity: 1,
        price: 1000,
        name: 'Saved Product',
        image: '/saved.jpg'
      }
    ]
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedCart))

    renderWithProvider()

    expect(screen.getByTestId('item-count')).toHaveTextContent('1')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('1000')
    expect(screen.getByText('Saved Product - 1 - 1000')).toBeInTheDocument()
  })

  it('adds item to cart optimistically', async () => {
    renderWithProvider()

    const addButton = screen.getByTestId('add-item')
    fireEvent.click(addButton)

    // Should update immediately (optimistic)
    expect(screen.getByTestId('item-count')).toHaveTextContent('2')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('10000')
    expect(screen.getByText('Test Product - 2 - 5000')).toBeInTheDocument()

    // Should call API
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/add', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 2,
          price: 5000,
          name: 'Test Product',
          image: '/test-image.jpg',
          size: 'M',
          color: 'blue'
        })
      }))
    })
  })

  it('updates item quantity optimistically', async () => {
    // First add an item
    renderWithProvider()
    fireEvent.click(screen.getByTestId('add-item'))

    // Then update it
    fireEvent.click(screen.getByTestId('update-item'))

    // Should update immediately
    expect(screen.getByTestId('item-count')).toHaveTextContent('3')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('15000')

    // Should call API
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/update', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 3
        })
      }))
    })
  })

  it('removes item optimistically', async () => {
    // First add an item
    renderWithProvider()
    fireEvent.click(screen.getByTestId('add-item'))

    // Then remove it
    fireEvent.click(screen.getByTestId('remove-item'))

    // Should update immediately
    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0')
    expect(screen.queryByText('Test Product - 2 - 5000')).not.toBeInTheDocument()

    // Should call API
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/remove', expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({
          productId: 'prod-1',
          variantId: 'var-1'
        })
      }))
    })
  })

  it('clears cart', async () => {
    // First add an item
    renderWithProvider()
    fireEvent.click(screen.getByTestId('add-item'))

    // Then clear cart
    fireEvent.click(screen.getByTestId('clear-cart'))

    // Should update immediately
    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0')
  })

  it('refreshes cart from server', async () => {
    const serverCart = [
      {
        productId: 'server-prod',
        quantity: 5,
        price: 2000,
        name: 'Server Product',
        image: '/server.jpg'
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { items: serverCart } })
    })

    renderWithProvider()
    fireEvent.click(screen.getByTestId('refresh-cart'))

    await waitFor(() => {
      expect(screen.getByTestId('item-count')).toHaveTextContent('5')
      expect(screen.getByTestId('subtotal')).toHaveTextContent('10000')
      expect(screen.getByText('Server Product - 5 - 2000')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    renderWithProvider()
    fireEvent.click(screen.getByTestId('add-item'))

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error')
    })
  })

  it('saves cart to localStorage when items change', async () => {
    renderWithProvider()
    fireEvent.click(screen.getByTestId('add-item'))

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cart',
        expect.stringContaining('Test Product')
      )
    })
  })

  it('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    // Should not crash
    expect(() => renderWithProvider()).not.toThrow()
  })

  it('merges quantities when adding existing item', () => {
    renderWithProvider()
    
    // Add item twice
    fireEvent.click(screen.getByTestId('add-item'))
    fireEvent.click(screen.getByTestId('add-item'))

    // Should have quantity 4 (2 + 2)
    expect(screen.getByTestId('item-count')).toHaveTextContent('4')
    expect(screen.getByText('Test Product - 4 - 5000')).toBeInTheDocument()
  })

  it('throws error when useCart is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useCart must be used within a CartProvider')

    consoleSpy.mockRestore()
  })
})