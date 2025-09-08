import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/layout/Footer'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Footer', () => {
  it('renders newsletter signup section', () => {
    render(<Footer />)
    expect(screen.getByText('Stay in the loop')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument()
  })

  it('renders all footer sections', () => {
    render(<Footer />)
    
    // Check section titles
    expect(screen.getByText('Shop')).toBeInTheDocument()
    expect(screen.getByText('Customer Service')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Legal')).toBeInTheDocument()
  })

  it('renders shop category links', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Clothing' })).toHaveAttribute('href', '/category/clothing')
    expect(screen.getByRole('link', { name: 'Shoes' })).toHaveAttribute('href', '/category/shoes')
    expect(screen.getByRole('link', { name: 'Accessories' })).toHaveAttribute('href', '/category/accessories')
    expect(screen.getByRole('link', { name: 'New Arrivals' })).toHaveAttribute('href', '/new-arrivals')
    expect(screen.getByRole('link', { name: 'Sale' })).toHaveAttribute('href', '/sale')
  })

  it('renders customer service links', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact')
    expect(screen.getByRole('link', { name: 'Help Center' })).toHaveAttribute('href', '/help')
    expect(screen.getByRole('link', { name: 'Track Your Order' })).toHaveAttribute('href', '/track-order')
    expect(screen.getByRole('link', { name: 'Returns & Exchanges' })).toHaveAttribute('href', '/returns')
    expect(screen.getByRole('link', { name: 'Size Guide' })).toHaveAttribute('href', '/size-guide')
  })

  it('renders company links', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'About Us' })).toHaveAttribute('href', '/about')
    expect(screen.getByRole('link', { name: 'Careers' })).toHaveAttribute('href', '/careers')
    expect(screen.getByRole('link', { name: 'Press' })).toHaveAttribute('href', '/press')
    expect(screen.getByRole('link', { name: 'Sustainability' })).toHaveAttribute('href', '/sustainability')
    expect(screen.getByRole('link', { name: 'Affiliate Program' })).toHaveAttribute('href', '/affiliate')
  })

  it('renders legal links', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'Cookie Policy' })).toHaveAttribute('href', '/cookies')
    expect(screen.getByRole('link', { name: 'Accessibility' })).toHaveAttribute('href', '/accessibility')
  })

  it('renders payment methods section', () => {
    render(<Footer />)
    expect(screen.getByText('We accept:')).toBeInTheDocument()
    expect(screen.getByText('VISA')).toBeInTheDocument()
    expect(screen.getByText('MC')).toBeInTheDocument()
    expect(screen.getByText('AMEX')).toBeInTheDocument()
  })

  it('renders social media links', () => {
    render(<Footer />)
    expect(screen.getByText('Follow us:')).toBeInTheDocument()
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument()
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument()
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument()
    expect(screen.getByLabelText('YouTube')).toBeInTheDocument()
  })

  it('renders copyright with current year', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(`© ${currentYear} ThePlug. All rights reserved.`)).toBeInTheDocument()
  })

  it('has proper styling classes', () => {
    render(<Footer />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveClass('bg-gray-900', 'text-white')
  })

  it('newsletter section has proper styling', () => {
    render(<Footer />)
    const newsletterSection = screen.getByText('Stay in the loop').closest('div')
    expect(newsletterSection).toHaveClass('text-center')
  })
})