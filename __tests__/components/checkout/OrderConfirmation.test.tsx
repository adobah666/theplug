import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrderConfirmation } from '@/components/checkout/OrderConfirmation'

// Mock fetch
global.fetch = vi.fn()

const mockOrder = {
  _id: 'order123',
  userId: 'user123',
  items: [
    {
      productId: 'product1',
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
  shipping: 2500,
  tax: 3750,
  total: 56250,
  status: 'pending',
  paymentStatus: 'pending',
  shippingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+2348012345678',
    street: '123 Main Street',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '100001',
    country: 'Nigeria'
  },
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z'
}

describe('OrderConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders order confirmation for successful payment', () => {
    const paidOrder = { ...mockOrder, paymentStatus: 'paid' }
    
    render(<OrderConfirmation order={paidOrder} isSuccess={true} />)

    expect(screen.getByText('Order Confirmed!')).toBeInTheDocument()
    expect(screen.getByText(/thank you for your purchase/i)).toBeInTheDocument()
    expect(screen.getByText('order123')).toBeInTheDocument()
  })

  it('renders pending payment state', () => {
    render(<OrderConfirmation order={mockOrder} />)

    expect(screen.getByText('Order Placed')).toBeInTheDocument()
    expect(screen.getByText(/please complete the payment/i)).toBeInTheDocument()
    expect(screen.getByText('Complete Payment')).toBeInTheDocument()
  })

  it('displays order details correctly', () => {
    render(<OrderConfirmation order={mockOrder} />)

    expect(screen.getByText('Order Details')).toBeInTheDocument()
    expect(screen.getByText('order123')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('123 Main Street')).toBeInTheDocument()
    expect(screen.getByText('Lagos, Lagos 100001')).toBeInTheDocument()
  })

  it('shows payment retry button for pending payments', async () => {
    const user = userEvent.setup()
    
    render(<OrderConfirmation order={mockOrder} />)

    const payNowButton = screen.getByRole('button', { name: /pay now/i })
    expect(payNowButton).toBeInTheDocument()

    await user.click(payNowButton)
    
    // Should show Paystack payment component
    expect(screen.getByText('Complete Payment')).toBeInTheDocument()
  })

  it('verifies payment when reference is provided', async () => {
    // Mock successful verification
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { status: 'success' }
      })
    })

    render(
      <OrderConfirmation 
        order={mockOrder} 
        paymentReference="ref_123456789" 
      />
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: 'ref_123456789',
          orderId: 'order123'
        })
      })
    })
  })

  it('handles payment verification failure', async () => {
    // Mock failed verification
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        message: 'Payment verification failed'
      })
    })

    render(
      <OrderConfirmation 
        order={mockOrder} 
        paymentReference="ref_123456789" 
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/payment verification failed/i)).toBeInTheDocument()
    })
  })

  it('shows success actions for paid orders', () => {
    const paidOrder = { ...mockOrder, paymentStatus: 'paid' }
    
    render(<OrderConfirmation order={paidOrder} />)

    expect(screen.getByText("What's Next?")).toBeInTheDocument()
    expect(screen.getByText(/you will receive an email confirmation/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /continue shopping/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view all orders/i })).toBeInTheDocument()
  })

  it('displays payment status with correct styling', () => {
    const paidOrder = { ...mockOrder, paymentStatus: 'paid' }
    
    render(<OrderConfirmation order={paidOrder} />)

    const statusBadge = screen.getByText('Paid')
    expect(statusBadge).toHaveClass('text-green-600', 'bg-green-100')
  })

  it('shows pending status styling', () => {
    render(<OrderConfirmation order={mockOrder} />)

    const statusBadge = screen.getByText('pending')
    expect(statusBadge.parentElement).toHaveClass('text-yellow-600', 'bg-yellow-100')
  })

  it('formats date correctly', () => {
    render(<OrderConfirmation order={mockOrder} />)

    // Should format the date in a readable format
    expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument()
  })

  it('displays order summary with items', () => {
    render(<OrderConfirmation order={mockOrder} />)

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('Size: M')).toBeInTheDocument()
    expect(screen.getByText('Color: Blue')).toBeInTheDocument()
    expect(screen.getAllByText('₦50,000.00')).toHaveLength(2) // Item total and subtotal
    expect(screen.getByText('₦56,250.00')).toBeInTheDocument() // Total
  })

  it('shows payment reference when available', () => {
    const orderWithReference = { 
      ...mockOrder, 
      paystackReference: 'ref_123456789' 
    }
    
    render(<OrderConfirmation order={orderWithReference} />)

    expect(screen.getByText('Payment Reference:')).toBeInTheDocument()
    expect(screen.getByText('ref_123456789')).toBeInTheDocument()
  })

  it('handles payment success callback', async () => {
    const user = userEvent.setup()
    
    // Mock successful verification
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { status: 'success' }
      })
    })

    render(<OrderConfirmation order={mockOrder} />)

    // Click pay now to show payment component
    const payNowButton = screen.getByRole('button', { name: /pay now/i })
    await user.click(payNowButton)

    // The payment component should be visible - check for Paystack payment button
    expect(screen.getByRole('button', { name: /pay ₦56,250.00/i })).toBeInTheDocument()
  })

  it('shows verification loading state', async () => {
    // Mock delayed verification
    ;(global.fetch as any).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 100)
      )
    )

    render(
      <OrderConfirmation 
        order={mockOrder} 
        paymentReference="ref_123456789" 
      />
    )

    expect(screen.getByText(/verifying payment/i)).toBeInTheDocument()
  })
})