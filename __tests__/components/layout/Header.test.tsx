import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from '@/components/layout/Header'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Header', () => {
  it('renders logo and brand name', () => {
    render(<Header />)
    expect(screen.getByText('ThePlug')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /theplug/i })).toHaveAttribute('href', '/')
  })

  it('renders search input', () => {
    render(<Header />)
    expect(screen.getAllByPlaceholderText('Search for products...')).toHaveLength(2) // Desktop and mobile
  })

  it('renders navigation categories', () => {
    render(<Header />)
    expect(screen.getByRole('link', { name: 'Clothing' })).toHaveAttribute('href', '/category/clothing')
    expect(screen.getByRole('link', { name: 'Shoes' })).toHaveAttribute('href', '/category/shoes')
    expect(screen.getByRole('link', { name: 'Accessories' })).toHaveAttribute('href', '/category/accessories')
  })

  it('renders account and cart links', () => {
    render(<Header />)
    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute('href', '/account')
    expect(screen.getByRole('link', { name: /wishlist/i })).toHaveAttribute('href', '/wishlist')
    expect(screen.getByRole('link', { name: /cart/i })).toHaveAttribute('href', '/cart')
  })

  it('renders auth buttons', () => {
    render(<Header />)
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/register')
  })

  it('handles search input changes', async () => {
    const user = userEvent.setup()
    render(<Header />)
    
    const searchInputs = screen.getAllByPlaceholderText('Search for products...')
    await user.type(searchInputs[0], 'test search')
    
    expect(searchInputs[0]).toHaveValue('test search')
  })

  it('toggles mobile menu', async () => {
    const user = userEvent.setup()
    render(<Header />)
    
    // Mobile menu should not be visible initially
    expect(screen.queryByText('My Account')).not.toBeInTheDocument()
    
    // Click mobile menu button (the one with hamburger icon)
    const buttons = screen.getAllByRole('button')
    const menuButton = buttons.find(button => button.querySelector('svg path[d*="M4 6h16M4 12h16M4 18h16"]'))
    await user.click(menuButton!)
    
    // Mobile menu should now be visible
    expect(screen.getByText('My Account')).toBeInTheDocument()
  })

  it('displays cart item count', () => {
    render(<Header />)
    const cartCount = screen.getByText('0')
    expect(cartCount).toBeInTheDocument()
    expect(cartCount).toHaveClass('bg-blue-600', 'text-white')
  })

  it('renders top bar with promotional message', () => {
    render(<Header />)
    expect(screen.getByText('Free shipping on orders over $50')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute('href', '/help')
    expect(screen.getByRole('link', { name: 'Track Order' })).toHaveAttribute('href', '/track-order')
  })

  it('has proper responsive classes', () => {
    render(<Header />)
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('sticky', 'top-0', 'z-40', 'w-full', 'border-b', 'bg-white')
  })
})