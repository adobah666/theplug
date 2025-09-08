import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShippingAddressForm } from '@/components/checkout/ShippingAddressForm'
import { ShippingAddress } from '@/types/checkout'

const mockOnSubmit = vi.fn()
const mockOnBack = vi.fn()

const validShippingData: ShippingAddress = {
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

describe('ShippingAddressForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
  })

  it('populates form with initial data', () => {
    render(
      <ShippingAddressForm
        initialData={validShippingData}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+2348012345678')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const submitButton = screen.getByRole('button', { name: /continue to payment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const emailInput = screen.getByLabelText(/email address/i)
    await user.type(emailInput, 'invalid-email')

    const submitButton = screen.getByRole('button', { name: /continue to payment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('validates phone number length', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const phoneInput = screen.getByLabelText(/phone number/i)
    await user.type(phoneInput, '123')

    const submitButton = screen.getByRole('button', { name: /continue to payment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/phone number must be at least 10 digits/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    // Fill in all required fields
    await user.type(screen.getByLabelText(/first name/i), validShippingData.firstName)
    await user.type(screen.getByLabelText(/last name/i), validShippingData.lastName)
    await user.type(screen.getByLabelText(/email address/i), validShippingData.email)
    await user.type(screen.getByLabelText(/phone number/i), validShippingData.phone)
    await user.type(screen.getByLabelText(/street address/i), validShippingData.street)
    await user.type(screen.getByLabelText(/city/i), validShippingData.city)
    await user.selectOptions(screen.getByLabelText(/state/i), validShippingData.state)
    await user.type(screen.getByLabelText(/zip code/i), validShippingData.zipCode)

    const submitButton = screen.getByRole('button', { name: /continue to payment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(validShippingData)
    })
  })

  it('calls onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const backButton = screen.getByRole('button', { name: /back to cart/i })
    await user.click(backButton)

    expect(mockOnBack).toHaveBeenCalled()
  })

  it('clears field errors when user starts typing', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /continue to payment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    })

    // Start typing in first name field
    const firstNameInput = screen.getByLabelText(/first name/i)
    await user.type(firstNameInput, 'J')

    // Error should be cleared
    expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument()
  })

  it('disables form when loading', () => {
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
        isLoading={true}
      />
    )

    expect(screen.getByLabelText(/first name/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeDisabled()
  })

  it('renders Nigerian states in dropdown', () => {
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const stateSelect = screen.getByLabelText(/state/i)
    expect(stateSelect).toBeInTheDocument()
    
    // Check for some Nigerian states
    expect(screen.getByRole('option', { name: 'Lagos' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'FCT' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Kano' })).toBeInTheDocument()
  })

  it('handles save address checkbox', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingAddressForm
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const saveAddressCheckbox = screen.getByLabelText(/save this address/i)
    expect(saveAddressCheckbox).not.toBeChecked()

    await user.click(saveAddressCheckbox)
    expect(saveAddressCheckbox).toBeChecked()
  })
})