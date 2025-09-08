import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductGrid } from '@/components/product/ProductGrid'

// Mock ProductCard component
vi.mock('@/components/product/ProductCard', () => ({
  ProductCard: ({ product, onAddToCart, onAddToWishlist }: any) => (
    <div data-testid={`product-${product._id}`}>
      <h3>{product.name}</h3>
      <button onClick={() => onAddToCart?.(product._id)}>Add to Cart</button>
      <button onClick={() => onAddToWishlist?.(product._id)}>Add to Wishlist</button>
    </div>
  ),
}))

describe('ProductGrid', () => {
  const mockProducts = [
    {
      _id: '1',
      name: 'Product 1',
      price: 29.99,
      images: ['image1.jpg'],
      brand: 'Brand 1',
      rating: 4.5,
      reviewCount: 10,
      inventory: 5
    },
    {
      _id: '2',
      name: 'Product 2',
      price: 39.99,
      images: ['image2.jpg'],
      brand: 'Brand 2',
      rating: 4.0,
      reviewCount: 8,
      inventory: 3
    }
  ]

  it('renders products in a grid', () => {
    render(<ProductGrid products={mockProducts} />)
    
    expect(screen.getByTestId('product-1')).toBeInTheDocument()
    expect(screen.getByTestId('product-2')).toBeInTheDocument()
    expect(screen.getByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText('Product 2')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    render(<ProductGrid products={[]} loading={true} />)
    
    expect(screen.getByText('Loading products...')).toBeInTheDocument()
  })

  it('shows error message when there is an error', () => {
    render(<ProductGrid products={[]} error="Failed to load" onRetry={vi.fn()} />)
    
    expect(screen.getByText('Failed to load products')).toBeInTheDocument()
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })

  it('shows empty state when no products', () => {
    render(<ProductGrid products={[]} />)
    
    expect(screen.getByText('No products found')).toBeInTheDocument()
    expect(screen.getByText(/We couldn't find any products/)).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    render(<ProductGrid products={[]} error="Failed to load" onRetry={onRetry} />)
    
    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)
    
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders load more button when hasMore is true', () => {
    render(<ProductGrid products={mockProducts} hasMore={true} onLoadMore={vi.fn()} />)
    
    expect(screen.getByRole('button', { name: /load more products/i })).toBeInTheDocument()
  })

  it('calls onLoadMore when load more button is clicked', () => {
    const onLoadMore = vi.fn()
    render(<ProductGrid products={mockProducts} hasMore={true} onLoadMore={onLoadMore} />)
    
    const loadMoreButton = screen.getByRole('button', { name: /load more products/i })
    fireEvent.click(loadMoreButton)
    
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('shows loading state on load more button when loadingMore is true', () => {
    render(<ProductGrid products={mockProducts} hasMore={true} onLoadMore={vi.fn()} loadingMore={true} />)
    
    expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument()
  })

  it('passes onAddToCart and onAddToWishlist to ProductCard components', () => {
    const onAddToCart = vi.fn()
    const onAddToWishlist = vi.fn()
    
    render(
      <ProductGrid 
        products={mockProducts} 
        onAddToCart={onAddToCart}
        onAddToWishlist={onAddToWishlist}
      />
    )
    
    // Click add to cart on first product
    const addToCartButtons = screen.getAllByText('Add to Cart')
    fireEvent.click(addToCartButtons[0])
    expect(onAddToCart).toHaveBeenCalledWith('1')
    
    // Click add to wishlist on first product
    const addToWishlistButtons = screen.getAllByText('Add to Wishlist')
    fireEvent.click(addToWishlistButtons[0])
    expect(onAddToWishlist).toHaveBeenCalledWith('1')
  })

  it('shows error message for load more when there are existing products', () => {
    render(
      <ProductGrid 
        products={mockProducts} 
        error="Failed to load more" 
        onRetry={vi.fn()}
      />
    )
    
    expect(screen.getByText('Failed to load more products')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<ProductGrid products={mockProducts} className="custom-grid" />)
    
    expect(container.querySelector('.custom-grid')).toBeInTheDocument()
  })
})