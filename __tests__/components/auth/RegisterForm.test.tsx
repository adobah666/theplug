import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { vi } from 'vitest'

describe('RegisterForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders registration form with all fields', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    // Submit button should be disabled initially
    expect(submitButton).toBeDisabled()
  })

  it('validates name length', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/full name/i)
    
    await user.type(nameInput, 'A')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    
    await user.type(emailInput, 'invalid-email')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('validates phone number format', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const phoneInput = screen.getByLabelText(/phone number/i)
    
    await user.type(phoneInput, 'invalid-phone')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
    })
  })

  it('validates password strength', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    
    await user.type(passwordInput, 'weak')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument()
    })
  })

  it('validates password confirmation', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'DifferentPassword123')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
    })
  })

  it('enables submit button when form is valid', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const phoneInput = screen.getByLabelText(/phone number/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(phoneInput, '+1234567890')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')

    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })
  })

  it('calls onSubmit with form data when valid', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const phoneInput = screen.getByLabelText(/phone number/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(phoneInput, '+1234567890')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        password: 'Password123',
        confirmPassword: 'Password123',
      })
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    let resolveSubmit: () => void
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve
    })
    mockOnSubmit.mockReturnValue(submitPromise)

    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const phoneInput = screen.getByLabelText(/phone number/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(phoneInput, '+1234567890')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    // Should show loading state
    expect(screen.getByText(/creating account/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    resolveSubmit!()
    
    await waitFor(() => {
      expect(screen.getByText(/create account/i)).toBeInTheDocument()
    })
  })

  it('displays error message when submission fails', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Email already exists'
    mockOnSubmit.mockRejectedValue(new Error(errorMessage))

    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const phoneInput = screen.getByLabelText(/phone number/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(phoneInput, '+1234567890')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('shows password requirements hint', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    expect(screen.getByText(/password must contain at least one uppercase letter, lowercase letter, and number/i)).toBeInTheDocument()
  })

  it('shows terms and privacy policy notice', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    expect(screen.getByText(/by creating an account, you agree to our terms of service and privacy policy/i)).toBeInTheDocument()
  })

  it('accepts valid phone number formats', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const phoneInput = screen.getByLabelText(/phone number/i)
    
    // Test various valid formats
    const validPhones = ['+1234567890', '123-456-7890', '(123) 456-7890', '123 456 7890']
    
    for (const phone of validPhones) {
      await user.clear(phoneInput)
      await user.type(phoneInput, phone)
      await user.tab()
      
      // Should not show error
      expect(screen.queryByText(/please enter a valid phone number/i)).not.toBeInTheDocument()
    }
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)

    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(phoneInput, '+1234567890')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(nameInput.value).toBe('')
      expect(emailInput.value).toBe('')
      expect(phoneInput.value).toBe('')
      expect(passwordInput.value).toBe('')
      expect(confirmPasswordInput.value).toBe('')
    })
  })
})