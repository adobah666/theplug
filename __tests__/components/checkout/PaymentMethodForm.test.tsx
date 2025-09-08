import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentMethodForm } from '@/components/checkout/PaymentMethodForm'
import { PaymentMethod } from '@/types/checkout'

const mockOnSubmit = vi.fn()
const mockOnBack = vi.fn()

const validCardData: PaymentMethod = {
  type: 'card',
  cardNumber: '1234 5678 9012 3456',
  expiryMonth: '12',
  expiryYear: '25',
  cvv: '123',
  cardholderName: 'John Doe'
}

describe('PaymentMethodForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders payment method options', () => {
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByLabelText(/credit\/debit card/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bank transfer/i)).toBeInTheDocument()
  })

  it('defaults to card payment method', () => {
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByLabelText(/credit\/debit card/i)).toBeChecked()
    expect(screen.getByLabelText(/bank transfer/i)).not.toBeChecked()
  })

  it('shows card form when card is selected', () => {
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/card number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/month/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/year/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument()
  })

  it('shows bank transfer info when bank transfer is selected', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const bankTransferRadio = screen.getByLabelText(/bank transfer/i)
    await user.click(bankTransferRadio)

    expect(screen.getByText(/bank transfer instructions/i)).toBeInTheDocument()
    expect(screen.getByText(/you will receive bank transfer details/i)).toBeInTheDocument()
  })

  it('validates card details when card is selected', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const submitButton = screen.getByRole('button', { name: /continue to review/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/all card details are required/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('formats card number with spaces', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const cardNumberInput = screen.getByLabelText(/card number/i)
    await user.type(cardNumberInput, '1234567890123456')

    expect(cardNumberInput).toHaveValue('1234 5678 9012 3456')
  })

  it('limits card number to 16 digits', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const cardNumberInput = screen.getByLabelText(/card number/i)
    await user.type(cardNumberInput, '12345678901234567890')

    expect(cardNumberInput).toHaveValue('1234 5678 9012 3456')
  })

  it('validates expiry month range', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const monthSelect = screen.getByLabelText(/month/i)
    
    // Check that months 1-12 are available
    expect(screen.getByRole('option', { name: '01' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '12' })).toBeInTheDocument()
  })

  it('limits CVV to 4 digits', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const cvvInput = screen.getByLabelText(/cvv/i)
    await user.type(cvvInput, '12345')

    expect(cvvInput).toHaveValue('1234')
  })

  it('submits form with valid card data', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    // Fill in card details
    await user.type(screen.getByLabelText(/cardholder name/i), validCardData.cardholderName!)
    await user.type(screen.getByLabelText(/card number/i), validCardData.cardNumber!)
    await user.selectOptions(screen.getByLabelText(/month/i), validCardData.expiryMonth!)
    await user.selectOptions(screen.getByLabelText(/year/i), validCardData.expiryYear!)
    await user.type(screen.getByLabelText(/cvv/i), validCardData.cvv!)

    const submitButton = screen.getByRole('button', { name: /continue to review/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(validCardData)
    })
  })

  it('submits form with bank transfer selection', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const bankTransferRadio = screen.getByLabelText(/bank transfer/i)
    await user.click(bankTransferRadio)

    const submitButton = screen.getByRole('button', { name: /continue to review/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({ type: 'bank_transfer' })
    })
  })

  it('calls onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const backButton = screen.getByRole('button', { name: /back to shipping/i })
    await user.click(backButton)

    expect(mockOnBack).toHaveBeenCalled()
  })

  it('clears errors when switching payment types', async () => {
    const user = userEvent.setup()
    
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    // Trigger validation error for card
    const submitButton = screen.getByRole('button', { name: /continue to review/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/all card details are required/i)).toBeInTheDocument()
    })

    // Switch to bank transfer
    const bankTransferRadio = screen.getByLabelText(/bank transfer/i)
    await user.click(bankTransferRadio)

    // Error should be cleared
    expect(screen.queryByText(/all card details are required/i)).not.toBeInTheDocument()
  })

  it('disables form when loading', () => {
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
        isLoading={true}
      />
    )

    expect(screen.getByLabelText(/credit\/debit card/i)).toBeDisabled()
    expect(screen.getByLabelText(/cardholder name/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /continue to review/i })).toBeDisabled()
  })

  it('populates form with initial data', () => {
    render(
      <PaymentMethodForm
        initialData={validCardData}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1234 5678 9012 3456')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123')).toBeInTheDocument()
  })

  it('shows security notice for card payments', () => {
    render(
      <PaymentMethodForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByText(/your payment information is encrypted/i)).toBeInTheDocument()
  })
})