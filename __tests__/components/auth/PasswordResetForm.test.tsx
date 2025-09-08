import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordResetForm } from '@/components/auth/PasswordResetForm'
import { vi } from 'vitest'

describe('PasswordResetForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnBackToLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders password reset form with all elements', () => {
    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    expect(screen.getByText(/enter your email address and we'll send you a link/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('renders back to login button when provided', () => {
    render(<PasswordResetForm onSubmit={mockOnSubmit} onBackToLogin={mockOnBackToLogin} />)

    expect(screen.getByText(/back to sign in/i)).toBeInTheDocument()
  })

  it('validates required email field', async () => {
    const user = userEvent.setup()
    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /send reset link/i })
    
    // Submit button should be disabled initially
    expect(submitButton).toBeDisabled()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    
    await user.type(emailInput, 'invalid-email')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('enables submit button when email is valid', async () => {
    const user = userEvent.setup()
    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')

    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })
  })

  it('calls onSubmit with email when valid', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
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

    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    // Should show loading state
    expect(screen.getByText(/sending reset link/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    resolveSubmit!()
  })

  it('displays error message when submission fails', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Email not found'
    mockOnSubmit.mockRejectedValue(new Error(errorMessage))

    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('shows success state after successful submission', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)

    render(<PasswordResetForm onSubmit={mockOnSubmit} onBackToLogin={mockOnBackToLogin} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      expect(screen.getByText(/we've sent a password reset link to/i)).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument()
      expect(screen.getByText(/didn't receive the email\? try again/i)).toBeInTheDocument()
    })
  })

  it('calls onBackToLogin when back button is clicked in success state', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)

    render(<PasswordResetForm onSubmit={mockOnSubmit} onBackToLogin={mockOnBackToLogin} />)

    const emailInput = screen.getByLabelText(/email address/i)
    
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })

    const backButton = screen.getByRole('button', { name: /back to sign in/i })
    await user.click(backButton)

    expect(mockOnBackToLogin).toHaveBeenCalled()
  })

  it('allows trying again from success state', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)

    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })

    const tryAgainButton = screen.getByText(/didn't receive the email\? try again/i)
    await user.click(tryAgainButton)

    // Should return to form state
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    })
  })

  it('calls onBackToLogin when back button is clicked in form state', async () => {
    const user = userEvent.setup()
    render(<PasswordResetForm onSubmit={mockOnSubmit} onBackToLogin={mockOnBackToLogin} />)

    const backButton = screen.getByText(/back to sign in/i)
    await user.click(backButton)

    expect(mockOnBackToLogin).toHaveBeenCalled()
  })

  it('disables form fields during submission', async () => {
    const user = userEvent.setup()
    let resolveSubmit: () => void
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve
    })
    mockOnSubmit.mockReturnValue(submitPromise)

    render(<PasswordResetForm onSubmit={mockOnSubmit} onBackToLogin={mockOnBackToLogin} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const backButton = screen.getByText(/back to sign in/i)

    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    // Form elements should be disabled
    expect(emailInput).toBeDisabled()
    expect(backButton).toBeDisabled()

    resolveSubmit!()
  })

  it('resets form after successful submission and try again', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)

    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })

    const tryAgainButton = screen.getByText(/didn't receive the email\? try again/i)
    await user.click(tryAgainButton)

    await waitFor(() => {
      const newEmailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
      expect(newEmailInput.value).toBe('')
    })
  })

  it('shows success icon in success state', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)

    render(<PasswordResetForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      const successIcon = screen.getByTestId('success-icon')
      expect(successIcon).toBeInTheDocument()
    })
  })
})