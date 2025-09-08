import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'
import { vi } from 'vitest'

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnForgotPassword = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with all fields', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders forgot password link when provided', () => {
    render(<LoginForm onSubmit={mockOnSubmit} onForgotPassword={mockOnForgotPassword} />)

    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Submit button should be disabled initially
    expect(submitButton).toBeDisabled()

    // Try to submit empty form
    await user.click(submitButton)

    // Should not call onSubmit
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    
    await user.type(emailInput, 'invalid-email')
    await user.tab() // Trigger validation

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const passwordInput = screen.getByLabelText(/password/i)
    
    await user.type(passwordInput, '123')
    await user.tab() // Trigger validation

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('enables submit button when form is valid', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })
  })

  it('calls onSubmit with form data when valid', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
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

    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // Should show loading state
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Resolve the promise
    resolveSubmit!()
    
    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
      expect(submitButton).toBeEnabled()
    })
  })

  it('displays error message when submission fails', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Invalid credentials'
    mockOnSubmit.mockRejectedValue(new Error(errorMessage))

    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('calls onForgotPassword when forgot password link is clicked', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} onForgotPassword={mockOnForgotPassword} />)

    const forgotPasswordLink = screen.getByText(/forgot your password/i)
    await user.click(forgotPasswordLink)

    expect(mockOnForgotPassword).toHaveBeenCalled()
  })

  it('disables form fields during submission', async () => {
    const user = userEvent.setup()
    let resolveSubmit: () => void
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve
    })
    mockOnSubmit.mockReturnValue(submitPromise)

    render(<LoginForm onSubmit={mockOnSubmit} onForgotPassword={mockOnForgotPassword} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const forgotPasswordLink = screen.getByText(/forgot your password/i)

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // All form elements should be disabled
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(forgotPasswordLink).toBeDisabled()

    resolveSubmit!()
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)

    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(emailInput.value).toBe('')
      expect(passwordInput.value).toBe('')
    })
  })
})