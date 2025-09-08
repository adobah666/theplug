import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartIcon } from '@/components/cart/CartIcon'

describe('CartIcon', () => {
  it('renders cart icon with zero items', () => {
    render(<CartIcon itemCount={0} />)
    
    const button = screen.getByRole('button', { name: /shopping cart with 0 items/i })
    expect(button).toBeInTheDocument()
    
    const cartText = screen.getByText('Cart')
    expect(cartText).toBeInTheDocument()
    
    // Should not show count badge when itemCount is 0
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('renders cart icon with item count', () => {
    render(<CartIcon itemCount={3} />)
    
    const button = screen.getByRole('button', { name: /shopping cart with 3 items/i })
    expect(button).toBeInTheDocument()
    
    const countBadge = screen.getByText('3')
    expect(countBadge).toBeInTheDocument()
    expect(countBadge).toHaveClass('bg-blue-600')
  })

  it('shows 99+ for item counts over 99', () => {
    render(<CartIcon itemCount={150} />)
    
    const countBadge = screen.getByText('99+')
    expect(countBadge).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<CartIcon itemCount={5} onClick={handleClick} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<CartIcon itemCount={1} className="custom-class" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('has proper accessibility attributes', () => {
    render(<CartIcon itemCount={2} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Shopping cart with 2 items')
    
    const svg = button.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    
    const badge = screen.getByText('2')
    expect(badge).toHaveAttribute('aria-label', '2 items in cart')
  })
})