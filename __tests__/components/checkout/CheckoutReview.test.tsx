import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckoutReview } from '@/components/checkout/CheckoutReview'
import { CartItemData } from '@/components/cart/CartItem'
import { ShippingAddress, PaymentMethod } from '@/types/checkout'

const mockOnSubmit = vi.fn()
const mockOnBack = vi.fn()

const mockItems: CartItemData[] = [
  {
    productId: '1',
    quantity: 1,
    price: 25000,
    name: 'Test Product',
    image: '/test-image.jpg'
  }
]

const mockShippingAddress: ShippingAddress = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+2348012345678',
  street: '123 Main Street',
  city: 'Lagos',
  state: 'Lagos',
  zipCode: '100001',
  country: 'Nigeria'
}

const mockPaymentMethod: PaymentMethod = {
  type: 'card',
  cardNumber: '1234 5678 9012 3456',
  cardholderName: 'John Doe'
}

describe('CheckoutReview', () => {
  const defaultProps = {
    items: mockItems,
    shippingAddress: mockShippingAddress,
    paymentMethod: mockPaymentMethod,
    subtotal: 25000,
    shipping: 2500,
    tax: 1875,
    total: 29375,
    onSubmit: mockOnSubmit,
    onBack: mockOnBack
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders review header', () => {
    render(<CheckoutReview {...defaultProps} />)

    expect(screen.getByText('Review Your Order')).toBeInTheDocument()
    expect(screen.getByText(/please review your order details/i)).toBeInTheDocument()
  })

  it('renders order summary with all details', () => {
    render(<CheckoutReview {...defaultProps} />)

    // Should show items, shipping, and payment
    expect(screen.getByText('Order Items')).toBeInTheDocument()
    expect(screen.getByText('Shipping Address')).toBeInTheDocument()
    expect(screen.getByText('Payment Method')).toBeInTheDocument()
    expect(screen.getByText('Order Summary')).toBeInTheDocument()
  })

  it('renders terms and conditions checkbox', () => {
    render(<CheckoutReview {...defaultProps} />)

    const checkbox = screen.getByRole('checkbox', { name: /i agree to the/i })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()

    expect(screen.getByText(/terms and conditions/i)).toBeInTheDocument()
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument()
  })

  it('prevents submission without agreeing to terms', async () => {
    const user = userEvent.setup()
    
    render(<CheckoutReview {...defaultProps} />)

    const placeOrderButton = screen.getByRole('button', { name: /place order/i })
    await user.click(placeOrderButton)

    expect(screen.getByText(/you must agree to the terms/i)).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('allows submission when terms are agreed', async () => {
    const user = userEvent.setup()
    
    render(<CheckoutReview {...defaultProps} />)

    const checkbox = screen.getByRole('checkbox', { name: /i agree to the/i })
    await user.click(checkbox)

    const placeOrderButton = screen.getByRole('button', { name: /place order/i })
    await user.click(placeOrderButton)

    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it('clears terms error when checkbox is checked', async () => {
    const user = userEvent.setup()
    
    render(<CheckoutReview {...defaultProps} />)

    // Try to submit without agreeing
    const placeOrderButton = screen.getByRole('button', { name: /place order/i })
    await user.click(placeOrderButton)

    expect(screen.getByText(/you must agree to the terms/i)).toBeInTheDocument()

    // Check the checkbox
    const checkbox = screen.getByRole('checkbox', { name: /i agree to the/i })
    await user.click(checkbox)

    // Error should be cleared
    expect(screen.queryByText(/you must agree to the terms/i)).not.toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    
    render(<CheckoutReview {...defaultProps} />)

    const backButton = screen.getByRole('button', { name: /back to payment/i })
    await user.click(backButton)

    expect(mockOnBack).toHaveBeenCalled()
  })

  it('shows loading state when isLoading is true', () => {
    render(<CheckoutReview {...defaultProps} isLoading={true} />)

    expect(screen.getByText('Placing Order...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /placing order/i })).toBeDisabled()
  })

  it('disables form elements when loading', () => {
    render(<CheckoutReview {...defaultProps} isLoading={true} />)

    const checkbox = screen.getByRole('checkbox', { name: /i agree to the/i })
    const backButton = screen.getByRole('button', { name: /back to payment/i })
    const placeOrderButton = screen.getByRole('button', { name: /placing order/i })

    expect(checkbox).toBeDisabled()
    expect(backButton).toBeDisabled()
    expect(placeOrderButton).toBeDisabled()
  })

  it('renders important information section', () => {
    render(<CheckoutReview {...defaultProps} />)

    expect(screen.getByText('Important Information')).toBeInTheDocument()
    expect(screen.getByText(/orders are typically processed/i)).toBeInTheDocument()
    expect(screen.getByText(/you will receive an email confirmation/i)).toBeInTheDocument()
    expect(screen.getByText(/delivery times may vary/i)).toBeInTheDocument()
  })

  it('shows bank transfer specific information for bank transfer payment', () => {
    const bankTransferPayment: PaymentMethod = {
      type: 'bank_transfer'
    }

    render(
      <CheckoutReview
        {...defaultProps}
        paymentMethod={bankTransferPayment}
      />
    )

    expect(screen.getByText(/please complete bank transfer within 24 hours/i)).toBeInTheDocument()
  })

  it('does not show bank transfer info for card payment', () => {
    render(<CheckoutReview {...defaultProps} />)

    expect(screen.queryByText(/please complete bank transfer within 24 hours/i)).not.toBeInTheDocument()
  })

  it('renders terms and privacy policy links', () => {
    render(<CheckoutReview {...defaultProps} />)

    const termsLink = screen.getByRole('link', { name: /terms and conditions/i })
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i })

    expect(termsLink).toHaveAttribute('href', '/terms')
    expect(termsLink).toHaveAttribute('target', '_blank')
    expect(privacyLink).toHaveAttribute('href', '/privacy')
    expect(privacyLink).toHaveAttribute('target', '_blank')
  })

  it('has proper button styling for place order button', () => {
    render(<CheckoutReview {...defaultProps} />)

    const placeOrderButton = screen.getByRole('button', { name: /place order/i })
    expect(placeOrderButton).toHaveClass('bg-green-600')
  })
})