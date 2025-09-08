import React from 'react'
import { render, screen } from '@testing-library/react'
import { Hero } from '@/components/layout/Hero'

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

describe('Hero', () => {
  const mockFeaturedProducts = [
    {
      id: '1',
      name: 'Test Product 1',
      price: 25000,
      image: '/test-image-1.jpg',
      href: '/products/1'
    },
    {
      id: '2',
      name: 'Test Product 2',
      price: 30000,
      image: '/test-image-2.jpg',
      href: '/products/2'
    }
  ]

  it('renders hero content correctly', () => {
    render(<Hero />)

    expect(screen.getByText('Discover Your')).toBeInTheDocument()
    expect(screen.getByText('Perfect Style')).toBeInTheDocument()
    expect(screen.getByText(/Explore our curated collection/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Shop Now' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New Arrivals' })).toBeInTheDocument()
  })

  it('displays stats correctly', () => {
    render(<Hero />)

    expect(screen.getByText('10K+')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('50K+')).toBeInTheDocument()
    expect(screen.getByText('Happy Customers')).toBeInTheDocument()
    expect(screen.getByText('24/7')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
  })

  it('renders featured products when provided', () => {
    render(<Hero featuredProducts={mockFeaturedProducts} />)

    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('₦25,000')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    expect(screen.getByText('₦30,000')).toBeInTheDocument()
  })

  it('renders correct links', () => {
    render(<Hero />)

    const shopNowLink = screen.getByRole('link', { name: 'Shop Now' })
    const newArrivalsLink = screen.getByRole('link', { name: 'New Arrivals' })

    expect(shopNowLink).toHaveAttribute('href', '/search')
    expect(newArrivalsLink).toHaveAttribute('href', '/new-arrivals')
  })

  it('renders product links correctly when featured products are provided', () => {
    render(<Hero featuredProducts={mockFeaturedProducts} />)

    const productLinks = screen.getAllByRole('link')
    const productLink1 = productLinks.find(link => link.getAttribute('href') === '/products/1')
    const productLink2 = productLinks.find(link => link.getAttribute('href') === '/products/2')

    expect(productLink1).toBeInTheDocument()
    expect(productLink2).toBeInTheDocument()
  })

  it('handles empty featured products array', () => {
    render(<Hero featuredProducts={[]} />)

    expect(screen.getByText('Discover Your')).toBeInTheDocument()
    expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument()
  })

  it('limits featured products to 4 items', () => {
    const manyProducts = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Product ${i + 1}`,
      price: 25000,
      image: `/test-image-${i + 1}.jpg`,
      href: `/products/${i + 1}`
    }))

    render(<Hero featuredProducts={manyProducts} />)

    // Should only show first 4 products
    expect(screen.getByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText('Product 2')).toBeInTheDocument()
    expect(screen.getByText('Product 3')).toBeInTheDocument()
    expect(screen.getByText('Product 4')).toBeInTheDocument()
    expect(screen.queryByText('Product 5')).not.toBeInTheDocument()
  })
})