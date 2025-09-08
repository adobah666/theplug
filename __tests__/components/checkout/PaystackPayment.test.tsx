import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaystackPayment } from '@/components/checkout/PaystackPayment'

const mockOnSuccess = vi.fn()
const mockOnError = vi.fn()
const mockOnClose = vi.fn()

// Mock environment variable
const originalEnv = process.env
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: 'pk_test_123456789'
  }
})

afterAll(() => {
  process.env = originalEnv
})

describe('PaystackPayment', () => {
  const defaultProps = {
    amount: 50000,
    email: 'test@example.com',
    orderId: 'order123',
    onSuccess: mockOnSuccess,
    onError: mockOnError,
    onClose: mockOnClose
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders payment details correctly', () => {
    render(<PaystackPayment {...defaultProps} />)

    expect(screen.getByText('Complete Payment')).toBeInTheDocument()
    expect(screen.getByText('order123')).toBeInTheDocument()
    expect(screen.getByText('₦50,000.00')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<PaystackPayment {...defaultProps} />)

    expect(screen.getByText('Loading payment system...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('disables button when isLoading prop is true', () => {
    render(<PaystackPayment {...defaultProps} isLoading={true} />)

    const payButton = screen.getByRole('button')
    expect(payButton).toBeDisabled()
  })

  it('displays security information', () => {
    render(<PaystackPayment {...defaultProps} />)

    expect(screen.getByText('• Your payment is secured by Paystack')).toBeInTheDocument()
    expect(screen.getByText('• You will be redirected to complete the payment')).toBeInTheDocument()
    expect(screen.getByText('• Do not refresh or close this page during payment')).toBeInTheDocument()
  })

  it('formats amount correctly', () => {
    render(<PaystackPayment {...defaultProps} />)

    // Should show formatted amount in details and button
    expect(screen.getByText('₦50,000.00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay ₦50,000.00/i })).toBeInTheDocument()
  })

  it('displays order and email information', () => {
    render(<PaystackPayment {...defaultProps} />)

    expect(screen.getByText('Order ID:')).toBeInTheDocument()
    expect(screen.getByText('Amount:')).toBeInTheDocument()
    expect(screen.getByText('Email:')).toBeInTheDocument()
  })
})