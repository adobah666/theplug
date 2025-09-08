import { render, screen } from '@testing-library/react'
import { ProgressIndicator } from '@/components/checkout/ProgressIndicator'
import { CheckoutStep } from '@/types/checkout'

describe('ProgressIndicator', () => {
  it('renders all checkout steps', () => {
    render(
      <ProgressIndicator
        currentStep="shipping"
        completedSteps={[]}
      />
    )

    expect(screen.getByText('Shipping')).toBeInTheDocument()
    expect(screen.getByText('Payment')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('highlights current step correctly', () => {
    render(
      <ProgressIndicator
        currentStep="payment"
        completedSteps={['shipping']}
      />
    )

    // Current step should have blue styling
    const paymentStep = screen.getByText('Payment').closest('li')
    expect(paymentStep?.querySelector('.bg-blue-500')).toBeInTheDocument()
  })

  it('shows completed steps with checkmark', () => {
    render(
      <ProgressIndicator
        currentStep="review"
        completedSteps={['shipping', 'payment']}
      />
    )

    // Completed steps should have green styling and checkmark
    const shippingStep = screen.getByText('Shipping').closest('li')
    expect(shippingStep?.querySelector('.bg-green-500')).toBeInTheDocument()
    expect(shippingStep?.querySelector('svg')).toBeInTheDocument()
  })

  it('shows upcoming steps as inactive', () => {
    render(
      <ProgressIndicator
        currentStep="shipping"
        completedSteps={[]}
      />
    )

    // Upcoming steps should have gray styling
    const paymentStep = screen.getByText('Payment').closest('li')
    expect(paymentStep?.querySelector('.bg-white')).toBeInTheDocument()
    expect(paymentStep?.querySelector('.text-gray-500')).toBeInTheDocument()
  })

  it('renders step numbers for non-completed steps', () => {
    render(
      <ProgressIndicator
        currentStep="shipping"
        completedSteps={[]}
      />
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('handles all steps completed', () => {
    render(
      <ProgressIndicator
        currentStep="review"
        completedSteps={['shipping', 'payment', 'review']}
      />
    )

    // All steps should show checkmarks (SVG elements)
    const svgElements = document.querySelectorAll('svg')
    expect(svgElements).toHaveLength(3)
  })
})