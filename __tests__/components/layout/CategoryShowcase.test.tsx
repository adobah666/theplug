import React from 'react'
import { render, screen } from '@testing-library/react'
import { CategoryShowcase } from '@/components/layout/CategoryShowcase'

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

describe('CategoryShowcase', () => {
  const mockCategories = [
    {
      id: 'clothing',
      name: 'Clothing',
      description: 'Latest fashion trends',
      image: '/clothing.jpg',
      href: '/category/clothing',
      productCount: 1250,
      isPopular: true
    },
    {
      id: 'shoes',
      name: 'Shoes',
      description: 'Step up your style',
      image: '/shoes.jpg',
      href: '/category/shoes',
      productCount: 850,
      isPopular: false
    }
  ]

  it('renders default title and subtitle', () => {
    render(<CategoryShowcase categories={[]} />)

    expect(screen.getByText('Shop by Category')).toBeInTheDocument()
    expect(screen.getByText(/Explore our diverse collection/)).toBeInTheDocument()
  })

  it('renders custom title and subtitle', () => {
    render(
      <CategoryShowcase 
        categories={[]}
        title="Custom Title"
        subtitle="Custom subtitle"
      />
    )

    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom subtitle')).toBeInTheDocument()
  })

  it('renders provided categories', () => {
    render(<CategoryShowcase categories={mockCategories} />)

    expect(screen.getByText('Clothing')).toBeInTheDocument()
    expect(screen.getByText('Latest fashion trends')).toBeInTheDocument()
    expect(screen.getByText('1,250 products')).toBeInTheDocument()
    
    expect(screen.getByText('Shoes')).toBeInTheDocument()
    expect(screen.getByText('Step up your style')).toBeInTheDocument()
    expect(screen.getByText('850 products')).toBeInTheDocument()
  })

  it('renders default categories when none provided', () => {
    render(<CategoryShowcase categories={[]} />)

    // Should render default categories
    expect(screen.getByText('Clothing')).toBeInTheDocument()
    expect(screen.getByText('Shoes')).toBeInTheDocument()
    expect(screen.getByText('Accessories')).toBeInTheDocument()
  })

  it('shows popular badge for popular categories', () => {
    render(<CategoryShowcase categories={mockCategories} />)

    expect(screen.getByText('Popular')).toBeInTheDocument()
  })

  it('renders correct category links', () => {
    render(<CategoryShowcase categories={mockCategories} />)

    const clothingLinks = screen.getAllByRole('link').filter(link => 
      link.getAttribute('href') === '/category/clothing'
    )
    const shoesLinks = screen.getAllByRole('link').filter(link => 
      link.getAttribute('href') === '/category/shoes'
    )

    expect(clothingLinks.length).toBeGreaterThan(0)
    expect(shoesLinks.length).toBeGreaterThan(0)
  })

  it('renders view all categories link', () => {
    render(<CategoryShowcase categories={mockCategories} />)

    const viewAllLink = screen.getByRole('link', { name: /View All Categories/ })
    expect(viewAllLink).toHaveAttribute('href', '/categories')
  })

  it('renders shop now buttons for each category', () => {
    render(<CategoryShowcase categories={mockCategories} />)

    const shopNowButtons = screen.getAllByText('Shop Now')
    expect(shopNowButtons).toHaveLength(mockCategories.length)
  })

  it('handles categories without product count', () => {
    const categoriesWithoutCount = [
      {
        id: 'test',
        name: 'Test Category',
        description: 'Test description',
        image: '/test.jpg',
        href: '/test'
      }
    ]

    render(<CategoryShowcase categories={categoriesWithoutCount} />)

    expect(screen.getByText('Test Category')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.queryByText('products')).not.toBeInTheDocument()
  })

  it('renders category images with correct alt text', () => {
    render(<CategoryShowcase categories={mockCategories} />)

    const clothingImage = screen.getByAltText('Clothing')
    const shoesImage = screen.getByAltText('Shoes')

    expect(clothingImage).toBeInTheDocument()
    expect(shoesImage).toBeInTheDocument()
  })
})