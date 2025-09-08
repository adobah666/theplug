import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Newsletter } from '@/components/layout/Newsletter'

describe('Newsletter', () => {
  beforeEach(() => {
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders default content correctly', () => {
    render(<Newsletter />)

    expect(screen.getByText('Stay in the Loop')).toBeInTheDocument()
    expect(screen.getByText(/Subscribe to our newsletter/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument()
  })

  it('renders custom props correctly', () => {
    const customProps = {
      title: 'Custom Title',
      subtitle: 'Custom subtitle',
      placeholder: 'Custom placeholder',
      buttonText: 'Custom Button',
      benefits: ['Benefit 1', 'Benefit 2']
    }

    render(<Newsletter {...customProps} />)

    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom subtitle')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Custom Button' })).toBeInTheDocument()
    expect(screen.getByText('Benefit 1')).toBeInTheDocument()
    expect(screen.getByText('Benefit 2')).toBeInTheDocument()
  })

  it('renders default benefits', () => {
    render(<Newsletter />)

    expect(screen.getByText('Exclusive early access to sales')).toBeInTheDocument()
    expect(screen.getByText('Weekly style inspiration')).toBeInTheDocument()
    expect(screen.getByText('New arrival notifications')).toBeInTheDocument()
    expect(screen.getByText('Special subscriber-only discounts')).toBeInTheDocument()
  })

  it('shows error for empty email', async () => {
    render(<Newsletter />)

    const submitButton = screen.getByRole('button', { name: 'Subscribe' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please enter your email address')).toBeInTheDocument()
    })
  })

  it('shows error for invalid email', async () => {
    render(<Newsletter />)

    const emailInput = screen.getByPlaceholderText('Enter your email address')
    const submitButton = screen.getByRole('button', { name: 'Subscribe' })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('handles successful subscription', async () => {
    render(<Newsletter />)

    const emailInput = screen.getByPlaceholderText('Enter your email address')
    const submitButton = screen.getByRole('button', { name: 'Subscribe' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    // Should show loading state
    expect(screen.getByText('Subscribing...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Fast-forward time to complete the simulated API call
    jest.advanceTimersByTime(1500)

    await waitFor(() => {
      expect(screen.getByText('Welcome to the ThePlug Family!')).toBeInTheDocument()
      expect(screen.getByText(/Thank you for subscribing/)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    render(<Newsletter />)

    const emailInput = screen.getByPlaceholderText('Enter your email address')
    const submitButton = screen.getByRole('button', { name: 'Subscribe' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    expect(screen.getByText('Subscribing...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    expect(emailInput).toBeDisabled()
  })

  it('allows subscribing another email after success', async () => {
    render(<Newsletter />)

    const emailInput = screen.getByPlaceholderText('Enter your email address')
    const submitButton = screen.getByRole('button', { name: 'Subscribe' })

    // First subscription
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    jest.advanceTimersByTime(1500)

    await waitFor(() => {
      expect(screen.getByText('Welcome to the ThePlug Family!')).toBeInTheDocument()
    })

    // Click "Subscribe Another Email"
    const subscribeAnotherButton = screen.getByRole('button', { name: 'Subscribe Another Email' })
    fireEvent.click(subscribeAnotherButton)

    // Should return to subscription form
    expect(screen.getByText('Stay in the Loop')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument()
  })

  it('clears email input after successful subscription', async () => {
    render(<Newsletter />)

    const emailInput = screen.getByPlaceholderText('Enter your email address') as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: 'Subscribe' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    expect(emailInput.value).toBe('test@example.com')

    fireEvent.click(submitButton)
    jest.advanceTimersByTime(1500)

    await waitFor(() => {
      expect(screen.getByText('Welcome to the ThePlug Family!')).toBeInTheDocument()
    })

    // Go back to form
    const subscribeAnotherButton = screen.getByRole('button', { name: 'Subscribe Another Email' })
    fireEvent.click(subscribeAnotherButton)

    const newEmailInput = screen.getByPlaceholderText('Enter your email address') as HTMLInputElement
    expect(newEmailInput.value).toBe('')
  })

  it('renders privacy policy and terms links', () => {
    render(<Newsletter />)

    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' })
    const termsLink = screen.getByRole('link', { name: 'Terms of Service' })

    expect(privacyLink).toHaveAttribute('href', '/privacy')
    expect(termsLink).toHaveAttribute('href', '/terms')
  })

  it('applies custom className', () => {
    const { container } = render(<Newsletter className="custom-class" />)
    
    const section = container.querySelector('section')
    expect(section).toHaveClass('custom-class')
  })
})