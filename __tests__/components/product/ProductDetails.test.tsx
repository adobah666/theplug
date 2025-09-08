import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductDetails } from '@/components/product/ProductDetails'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}))

// Mock ProductVariantSelector
vi.mock('@/components/product/ProductVariantSelector', () => ({
  ProductVariantSelector: ({ variants, selectedVariant, onVariantChange }: any) => (
    <div data-testid="variant-selector">
      <button onClick={() => onVariantChange(variants[0])}>
        Select Variant
      </button>
      {selectedVariant && <span>Selected: {selectedVariant.sku}</span>}
    </div>
  ),
}))

describe('ProductDetails', () => {
  const mockProduct = {
    _id: '1',
    name: 'Test Product',
    description: 'This is a test product description.',
    price: 99.99,
    images: ['image1.jpg', 'image2.jpg', 'image3.jpg'],
    brand: 'Test Brand',
    rating: 4.5,
    reviewCount: 25,
    inventory: 10,
    variants: [
      {
        _id: 'v1',
        size: 'M',
        color: 'red',
        sku: 'TEST-M-RED',
        price: 89.99,
        inventory: 5
      },
      {
        _id: 'v2',
        size: 'L',
        color: 'blue',
        sku: 'TEST-L-BLUE',
        inventory: 3
      }
    ]
  }

  it('renders product information correctly', () => {
    render(<ProductDetails product={mockProduct} />)
    
    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('Test Brand')).toBeInTheDocument()
    expect(screen.getByText('This is a test product description.')).toBeInTheDocument()
    expect(screen.getByText('₦99.99')).toBeInTheDocument()
    expect(screen.getByText('4.5 (25 reviews)')).toBeInTheDocument()
  })

  it('renders main product image', () => {
    render(<ProductDetails product={mockProduct} />)
    
    const mainImage = screen.getByAltText('Test Product')
    expect(mainImage).toHaveAttribute('src', 'image1.jpg')
  })

  it('renders thumbnail images', () => {
    render(<ProductDetails product={mockProduct} />)
    
    expect(screen.getByAltText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByAltText('Test Product 2')).toBeInTheDocument()
    expect(screen.getByAltText('Test Product 3')).toBeInTheDocument()
  })

  it('changes main image when thumbnail is clicked', () => {
    render(<ProductDetails product={mockProduct} />)
    
    const thumbnail2 = screen.getByAltText('Test Product 2')
    fireEvent.click(thumbnail2)
    
    const mainImage = screen.getByAltText('Test Product')
    expect(mainImage).toHaveAttribute('src', 'image2.jpg')
  })

  it('renders variant selector when variants exist', () => {
    render(<ProductDetails product={mockProduct} />)
    
    expect(screen.getByTestId('variant-selector')).toBeInTheDocument()
  })

  it('updates price when variant with different price is selected', () => {
    render(<ProductDetails product={mockProduct} />)
    
    // Select variant with different price
    const selectVariantButton = screen.getByText('Select Variant')
    fireEvent.click(selectVariantButton)
    
    expect(screen.getByText('₦89.99')).toBeInTheDocument()
    expect(screen.getByText('₦99.99')).toBeInTheDocument() // Original price shown as strikethrough
  })

  it('handles quantity changes', () => {
    render(<ProductDetails product={mockProduct} />)
    
    // Find quantity control buttons by their SVG paths
    const buttons = screen.getAllByRole('button')
    const decreaseButton = buttons.find(btn => btn.querySelector('path[d="M20 12H4"]'))
    const increaseButton = buttons.find(btn => btn.querySelector('path[d="M12 6v6m0 0v6m0-6h6m-6 0H6"]'))
    
    // Initial quantity should be 1
    expect(screen.getByText('1')).toBeInTheDocument()
    
    // Increase quantity
    fireEvent.click(increaseButton!)
    expect(screen.getByText('2')).toBeInTheDocument()
    
    // Decrease quantity
    fireEvent.click(decreaseButton!)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('calls onAddToCart with correct parameters', () => {
    const onAddToCart = vi.fn()
    render(<ProductDetails product={mockProduct} onAddToCart={onAddToCart} />)
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addToCartButton)
    
    expect(onAddToCart).toHaveBeenCalledWith('1', undefined, 1)
  })

  it('calls onAddToCart with variant when variant is selected', () => {
    const onAddToCart = vi.fn()
    render(<ProductDetails product={mockProduct} onAddToCart={onAddToCart} />)
    
    // Select a variant first
    const selectVariantButton = screen.getByText('Select Variant')
    fireEvent.click(selectVariantButton)
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addToCartButton)
    
    expect(onAddToCart).toHaveBeenCalledWith('1', 'v1', 1)
  })

  it('calls onAddToWishlist when wishlist button is clicked', () => {
    const onAddToWishlist = vi.fn()
    render(<ProductDetails product={mockProduct} onAddToWishlist={onAddToWishlist} />)
    
    const wishlistButton = screen.getByRole('button', { name: /add to wishlist/i })
    fireEvent.click(wishlistButton)
    
    expect(onAddToWishlist).toHaveBeenCalledWith('1')
  })

  it('shows out of stock state when inventory is 0', () => {
    const outOfStockProduct = { ...mockProduct, inventory: 0 }
    render(<ProductDetails product={outOfStockProduct} onAddToCart={vi.fn()} />)
    
    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled()
  })

  it('limits quantity to available inventory', () => {
    const lowInventoryProduct = { ...mockProduct, inventory: 2 }
    render(<ProductDetails product={lowInventoryProduct} />)
    
    expect(screen.getByText('2 items available')).toBeInTheDocument()
    
    // Try to increase quantity beyond available inventory
    const buttons = screen.getAllByRole('button')
    const increaseButton = buttons.find(btn => btn.querySelector('path[d="M12 6v6m0 0v6m0-6h6m-6 0H6"]'))
    
    fireEvent.click(increaseButton!) // Should go to 2
    fireEvent.click(increaseButton!) // Should stay at 2 (max inventory)
    
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not render wishlist button when onAddToWishlist is not provided', () => {
    render(<ProductDetails product={mockProduct} />)
    
    expect(screen.queryByRole('button', { name: /add to wishlist/i })).not.toBeInTheDocument()
  })

  it('shows inventory information', () => {
    render(<ProductDetails product={mockProduct} />)
    
    expect(screen.getByText('10 items available')).toBeInTheDocument()
  })

  it('renders description in a card', () => {
    render(<ProductDetails product={mockProduct} />)
    
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('This is a test product description.')).toBeInTheDocument()
  })
})