import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import Home from '@/app/page'

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

// Mock the cart context
jest.mock('@/lib/cart', () => ({
  useCart: () => ({
    state: {
      items: [],
      itemCount: 0,
      subtotal: 0,
      isLoading: false,
      updatingItems: new Set(),
      removingItems: new Set()
    },
    addItem: jest.fn(),
    updateQuantity: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn()
  })
}))

// Mock auth context
jest.mock('@/lib/auth/context', () => ({
  useAuth: () => ({
    session: null,
    status: 'unauthenticated',
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    requestPasswordReset: jest.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('Homepage Integration', () => {
  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks()
  })

  it('renders all homepage sections', async () => {
    render(await Home())

    // Wait for the page to load
    await waitFor(() => {
      // Hero section
      expect(screen.getByText('Discover Your')).toBeInTheDocument()
      expect(screen.getByText('Perfect Style')).toBeInTheDocument()
    })

    // Featured products section
    expect(screen.getByText('Trending Now')).toBeInTheDocument()
    
    // Category showcase
    expect(screen.getByText('Shop by Category')).toBeInTheDocument()
    
    // Testimonials
    expect(screen.getByText('What Our Customers Say')).toBeInTheDocument()
    
    // Newsletter
    expect(screen.getByText('Stay in the Loop')).toBeInTheDocument()
  })

  it('displays featured products correctly', async () => {
    render(await Home())

    await waitFor(() => {
      // Check for product names from the mock data
      expect(screen.getByText('Summer Floral Dress')).toBeInTheDocument()
      expect(screen.getByText('Classic Denim Jacket')).toBeInTheDocument()
      expect(screen.getByText('Leather Ankle Boots')).toBeInTheDocument()
    })

    // Check for prices
    expect(screen.getByText('₦25,000')).toBeInTheDocument()
    expect(screen.getByText('₦18,000')).toBeInTheDocument()
    expect(screen.getByText('₦32,000')).toBeInTheDocument()
  })

  it('displays categories correctly', async () => {
    render(await Home())

    await waitFor(() => {
      expect(screen.getByText('Clothing')).toBeInTheDocument()
      expect(screen.getByText('Shoes')).toBeInTheDocument()
      expect(screen.getByText('Accessories')).toBeInTheDocument()
    })

    // Check category descriptions
    expect(screen.getByText('Discover the latest trends in fashion')).toBeInTheDocument()
    expect(screen.getByText('Step up your style game')).toBeInTheDocument()
  })

  it('has correct navigation links', async () => {
    render(await Home())

    await waitFor(() => {
      // Hero CTA links
      const shopNowLink = screen.getByRole('link', { name: 'Shop Now' })
      const newArrivalsLink = screen.getByRole('link', { name: 'New Arrivals' })
      
      expect(shopNowLink).toHaveAttribute('href', '/search')
      expect(newArrivalsLink).toHaveAttribute('href', '/new-arrivals')
    })

    // Category links
    const categoryLinks = screen.getAllByRole('link').filter(link => 
      link.getAttribute('href')?.includes('/search?category=')
    )
    expect(categoryLinks.length).toBeGreaterThan(0)
  })

  it('displays promotional content', async () => {
    render(await Home())

    await waitFor(() => {
      // Should show promotional banner content
      expect(screen.getByText('Summer Sale')).toBeInTheDocument()
    })
  })

  it('shows customer testimonials', async () => {
    render(await Home())

    await waitFor(() => {
      // Should show testimonial content
      expect(screen.getByText(/ThePlug has completely transformed/)).toBeInTheDocument()
    })
  })

  it('includes newsletter signup', async () => {
    render(await Home())

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument()
    })
  })

  it('handles loading states gracefully', async () => {
    render(await Home())

    // The page should render without showing loading spinners since we're using static data
    await waitFor(() => {
      expect(screen.getByText('Discover Your')).toBeInTheDocument()
    })

    // Should not show loading spinners in the final rendered state
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
  })

  it('displays product ratings and reviews', async () => {
    render(await Home())

    await waitFor(() => {
      // Check for rating displays (stars or numbers)
      expect(screen.getByText('4.8')).toBeInTheDocument()
      expect(screen.getByText('124')).toBeInTheDocument() // review count
    })
  })

  it('shows sale indicators for discounted products', async () => {
    render(await Home())

    await waitFor(() => {
      // Should show original prices for sale items
      expect(screen.getByText('₦35,000')).toBeInTheDocument() // original price
      expect(screen.getByText('₦25,000')).toBeInTheDocument() // sale price
    })
  })

  it('displays new product indicators', async () => {
    render(await Home())

    await waitFor(() => {
      // Should show "New" badges or indicators
      const newBadges = screen.getAllByText('New')
      expect(newBadges.length).toBeGreaterThan(0)
    })
  })
})