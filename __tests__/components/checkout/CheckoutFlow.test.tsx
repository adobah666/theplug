import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { CartProvider } from '@/lib/cart/context'
import { AuthProvider } from '@/lib/auth/context'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock fetch
global.fetch = vi.fn()

const mockCartState = {
  items: [
    {
      productId: '1',
      variantId: 'variant1',
      quantity: 2,
      price: 25000,
      name: 'Test Product',
      image: '/test-image.jpg',
      size: 'M',
      color: 'Blue'
    }
  ],
  subtotal: 50000,
  itemCount: 2,
  isLoading: false,
  error: null,
  updatingItems: new Set(),
  removingItems: new Set()
}

const mockSession = {
  user: {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User'
  },
  expires: '2024-12-31'
}

// Mock cart context
vi.mock('@/lib/cart/context', () => ({
  useCart: () => ({
    state: mockCartState,
    dispatch: vi.fn(),
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    refreshCart: vi.fn()
  }),
  CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock auth context
vi.mock('@/lib/auth/context', () => ({
  useAuth: () => ({
    session: mockSession,
    status: 'authenticated',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('Checkout Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful API responses
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          _id: 'order123',
          status: 'pending',
          paymentStatus: 'pending'
        }
      })
    })
  })

  it('completes full checkout flow with card payment', async () => {
    const user = userEvent.setup()
    
    render(<CheckoutForm />)

    // Step 1: Fill shipping information
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email address/i), 'john.doe@example.com')
    await user.type(screen.getByLabelText(/phone number/i), '+2348012345678')
    await user.type(screen.getByLabelText(/street address/i), '123 Main Street')
    await user.type(screen.getByLabelText(/city/i), 'Lagos')
    await user.selectOptions(screen.getByLabelText(/state/i), 'Lagos')
    await user.type(screen.getByLabelText(/zip code/i), '100001')

    // Continue to payment
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    // Step 2: Fill payment information
    await waitFor(() => {
      expect(screen.getByText(/payment method/i)).toBeInTheDocument()
    })

    // Card should be selected by default
    expect(screen.getByLabelText(/credit\/debit card/i)).toBeChecked()

    // Fill card details
    await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe')
    await user.type(screen.getByLabelText(/card number/i), '1234567890123456')
    await user.selectOptions(screen.getByLabelText(/month/i), '12')
    await user.selectOptions(screen.getByLabelText(/year/i), '25')
    await user.type(screen.getByLabelText(/cvv/i), '123')

    // Continue to review
    await user.click(screen.getByRole('button', { name: /continue to review/i }))

    // Step 3: Review and place order
    await waitFor(() => {
      expect(screen.getByText(/review your order/i)).toBeInTheDocument()
    })

    // Agree to terms
    await user.click(screen.getByRole('checkbox', { name: /i agree to the/i }))

    // Place order
    await user.click(screen.getByRole('button', { name: /place order/i }))

    // Verify order creation API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/orders', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('john.doe@example.com')
      }))
    })

    // Verify redirect to order page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders/order123')
    })
  })

  it('completes checkout flow with bank transfer', async () => {
    const user = userEvent.setup()
    
    render(<CheckoutForm />)

    // Fill shipping information (abbreviated)
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email address/i), 'john.doe@example.com')
    await user.type(screen.getByLabelText(/phone number/i), '+2348012345678')
    await user.type(screen.getByLabelText(/street address/i), '123 Main Street')
    await user.type(screen.getByLabelText(/city/i), 'Lagos')
    await user.selectOptions(screen.getByLabelText(/state/i), 'Lagos')
    await user.type(screen.getByLabelText(/zip code/i), '100001')

    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    // Select bank transfer
    await waitFor(() => {
      expect(screen.getByLabelText(/bank transfer/i)).toBeInTheDocument()
    })
    
    await user.click(screen.getByLabelText(/bank transfer/i))

    // Verify bank transfer info is shown
    expect(screen.getByText(/bank transfer instructions/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /continue to review/i }))

    // Complete order
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /i agree to the/i })).toBeInTheDocument()
    })
    
    await user.click(screen.getByRole('checkbox', { name: /i agree to the/i }))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    // Verify redirect with success flag for bank transfer
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders/order123?success=true')
    })
  })

  it('handles order creation failure', async () => {
    const user = userEvent.setup()
    
    // Mock failed API response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        message: 'Order creation failed'
      })
    })
    
    render(<CheckoutForm />)

    // Fill required fields quickly
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email address/i), 'john.doe@example.com')
    await user.type(screen.getByLabelText(/phone number/i), '+2348012345678')
    await user.type(screen.getByLabelText(/street address/i), '123 Main Street')
    await user.type(screen.getByLabelText(/city/i), 'Lagos')
    await user.selectOptions(screen.getByLabelText(/state/i), 'Lagos')
    await user.type(screen.getByLabelText(/zip code/i), '100001')

    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe')
    await user.type(screen.getByLabelText(/card number/i), '1234567890123456')
    await user.selectOptions(screen.getByLabelText(/month/i), '12')
    await user.selectOptions(screen.getByLabelText(/year/i), '25')
    await user.type(screen.getByLabelText(/cvv/i), '123')

    await user.click(screen.getByRole('button', { name: /continue to review/i }))

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /i agree to the/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('checkbox', { name: /i agree to the/i }))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/order creation failed/i)).toBeInTheDocument()
    })

    // Verify no redirect occurred
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows empty cart message when cart is empty', () => {
    // Mock empty cart
    vi.mocked(require('@/lib/cart/context').useCart).mockReturnValue({
      state: {
        ...mockCartState,
        items: [],
        itemCount: 0,
        subtotal: 0
      },
      dispatch: vi.fn(),
      addItem: vi.fn(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      refreshCart: vi.fn()
    })

    render(<CheckoutForm />)

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument()
    expect(screen.getByText(/add some items to your cart/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue shopping/i })).toBeInTheDocument()
  })

  it('calculates totals correctly', () => {
    render(<CheckoutForm />)

    // Verify order summary shows correct calculations
    expect(screen.getByText('₦50,000.00')).toBeInTheDocument() // Subtotal
    expect(screen.getByText('₦2,500.00')).toBeInTheDocument() // Shipping (under ₦50,000)
    expect(screen.getByText('₦3,750.00')).toBeInTheDocument() // Tax (7.5%)
    expect(screen.getByText('₦56,250.00')).toBeInTheDocument() // Total
  })

  it('shows free shipping for orders over ₦50,000', () => {
    // Mock cart with higher value
    vi.mocked(require('@/lib/cart/context').useCart).mockReturnValue({
      state: {
        ...mockCartState,
        subtotal: 60000,
        items: [
          {
            productId: '1',
            quantity: 1,
            price: 60000,
            name: 'Expensive Product',
            image: '/test-image.jpg'
          }
        ]
      },
      dispatch: vi.fn(),
      addItem: vi.fn(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      refreshCart: vi.fn()
    })

    render(<CheckoutForm />)

    // Should show free shipping
    expect(screen.getByText('Free')).toBeInTheDocument()
  })
})