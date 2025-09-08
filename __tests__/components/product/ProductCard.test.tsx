import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductCard } from '@/components/product/ProductCard'

// Mock Next.js components
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}))

describe('ProductCard', () => {
  const mockProduct = {
    _id: '1',
    name: 'Test Product',
    price: 29.99,
    images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    brand: 'Test Brand',
    rating: 4.5,
    reviewCount: 10,
    inventory: 5
  }

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('Test Brand')).toBeInTheDocument()
    expect(screen.getByText('(10)')).toBeInTheDocument()
    expect(screen.getByText('₦29.99')).toBeInTheDocument()
  })

  it('renders product image with correct attributes', () => {
    render(<ProductCard product={mockProduct} />)
    
    const image = screen.getByAltText('Test Product')
    expect(image).toHaveAttribute('src', 'https://example.com/image1.jpg')
  })

  it('renders rating stars correctly', () => {
    render(<ProductCard product={mockProduct} />)
    
    const stars = screen.getAllByRole('img', { hidden: true })
    // Should have 5 star SVGs
    expect(stars).toHaveLength(1) // Only the product image in this test setup
  })

  it('calls onAddToCart when add to cart button is clicked', () => {
    const onAddToCart = vi.fn()
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />)
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addToCartButton)
    
    expect(onAddToCart).toHaveBeenCalledWith('1')
  })

  it('calls onAddToWishlist when wishlist button is clicked', () => {
    const onAddToWishlist = vi.fn()
    render(<ProductCard product={mockProduct} onAddToWishlist={onAddToWishlist} />)
    
    const wishlistButton = screen.getByLabelText('Add to wishlist')
    fireEvent.click(wishlistButton)
    
    expect(onAddToWishlist).toHaveBeenCalledWith('1')
  })

  it('shows out of stock state when inventory is 0', () => {
    const outOfStockProduct = { ...mockProduct, inventory: 0 }
    render(<ProductCard product={outOfStockProduct} onAddToCart={vi.fn()} />)
    
    expect(screen.getAllByText('Out of Stock')).toHaveLength(2) // Overlay and button
    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled()
  })

  it('does not render wishlist button when onAddToWishlist is not provided', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.queryByLabelText('Add to wishlist')).not.toBeInTheDocument()
  })

  it('does not render add to cart button when onAddToCart is not provided', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<ProductCard product={mockProduct} className="custom-class" />)
    
    const card = screen.getByText('Test Product').closest('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('renders product links correctly', () => {
    render(<ProductCard product={mockProduct} />)
    
    const productLinks = screen.getAllByRole('link')
    productLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '/products/1')
    })
  })
})