import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoResults } from '@/components/product/NoResults'

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
})

describe('NoResults', () => {
  it('renders default no results message', () => {
    render(<NoResults />)
    
    expect(screen.getByText('No products found')).toBeInTheDocument()
    expect(screen.getByText(/We couldn't find any products matching your search/)).toBeInTheDocument()
  })

  it('renders query-specific message when query is provided', () => {
    render(<NoResults query="nike shoes" />)
    
    expect(screen.getByText('No results found for "nike shoes"')).toBeInTheDocument()
  })

  it('shows clear filters button when hasActiveFilters is true', () => {
    const onClearFilters = jest.fn()
    render(<NoResults hasActiveFilters={true} onClearFilters={onClearFilters} />)
    
    expect(screen.getByText('Clear All Filters')).toBeInTheDocument()
  })

  it('shows filter-specific message when hasActiveFilters is true', () => {
    render(<NoResults hasActiveFilters={true} />)
    
    expect(screen.getByText(/We couldn't find any products matching your current filters/)).toBeInTheDocument()
  })

  it('calls onClearFilters when clear filters button is clicked', async () => {
    const onClearFilters = jest.fn()
    const user = userEvent.setup()
    
    render(<NoResults hasActiveFilters={true} onClearFilters={onClearFilters} />)
    
    await user.click(screen.getByText('Clear All Filters'))
    
    expect(onClearFilters).toHaveBeenCalled()
  })

  it('navigates to home page when browse all products is clicked', async () => {
    const user = userEvent.setup()
    render(<NoResults />)
    
    await user.click(screen.getByText('Browse All Products'))
    
    expect(window.location.href).toBe('/')
  })

  it('renders search suggestions when provided', () => {
    const suggestions = ['nike air max', 'nike react', 'nike dunk']
    render(<NoResults suggestions={suggestions} />)
    
    expect(screen.getByText('Did you mean?')).toBeInTheDocument()
    suggestions.forEach(suggestion => {
      expect(screen.getByText(suggestion)).toBeInTheDocument()
    })
  })

  it('calls onNewSearch when suggestion is clicked', async () => {
    const onNewSearch = jest.fn()
    const suggestions = ['nike air max']
    const user = userEvent.setup()
    
    render(<NoResults suggestions={suggestions} onNewSearch={onNewSearch} />)
    
    await user.click(screen.getByText('nike air max'))
    
    expect(onNewSearch).toHaveBeenCalledWith('nike air max')
  })

  it('renders popular searches', () => {
    render(<NoResults />)
    
    expect(screen.getByText('Popular Searches')).toBeInTheDocument()
    expect(screen.getByText('Nike shoes')).toBeInTheDocument()
    expect(screen.getByText('Summer dresses')).toBeInTheDocument()
    expect(screen.getByText('Denim jackets')).toBeInTheDocument()
  })

  it('calls onNewSearch when popular search is clicked', async () => {
    const onNewSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<NoResults onNewSearch={onNewSearch} />)
    
    await user.click(screen.getByText('Nike shoes'))
    
    expect(onNewSearch).toHaveBeenCalledWith('Nike shoes')
  })

  it('renders search tips', () => {
    render(<NoResults />)
    
    expect(screen.getByText('Search Tips')).toBeInTheDocument()
    expect(screen.getByText('Check your spelling')).toBeInTheDocument()
    expect(screen.getByText('Try more general keywords')).toBeInTheDocument()
    expect(screen.getByText('Use fewer filters')).toBeInTheDocument()
    expect(screen.getByText('Try different product categories')).toBeInTheDocument()
  })

  it('renders category links', () => {
    render(<NoResults />)
    
    expect(screen.getByText('Browse by Category')).toBeInTheDocument()
    expect(screen.getByText('Clothing')).toBeInTheDocument()
    expect(screen.getByText('Shoes')).toBeInTheDocument()
    expect(screen.getByText('Accessories')).toBeInTheDocument()
    expect(screen.getByText('Bags')).toBeInTheDocument()
    expect(screen.getByText('Jewelry')).toBeInTheDocument()
    expect(screen.getByText('Sale Items')).toBeInTheDocument()
  })

  it('has correct href attributes for category links', () => {
    render(<NoResults />)
    
    const clothingLink = screen.getByText('Clothing').closest('a')
    const shoesLink = screen.getByText('Shoes').closest('a')
    const accessoriesLink = screen.getByText('Accessories').closest('a')
    
    expect(clothingLink).toHaveAttribute('href', '/search?category=clothing')
    expect(shoesLink).toHaveAttribute('href', '/search?category=shoes')
    expect(accessoriesLink).toHaveAttribute('href', '/search?category=accessories')
  })

  it('does not render suggestions section when no suggestions provided', () => {
    render(<NoResults />)
    
    expect(screen.queryByText('Did you mean?')).not.toBeInTheDocument()
  })

  it('does not render clear filters button when hasActiveFilters is false', () => {
    render(<NoResults hasActiveFilters={false} />)
    
    expect(screen.queryByText('Clear All Filters')).not.toBeInTheDocument()
  })

  it('renders trending icon with popular searches', () => {
    render(<NoResults />)
    
    const popularSearchesHeading = screen.getByText('Popular Searches')
    expect(popularSearchesHeading).toBeInTheDocument()
    
    // Check that the trending icon is present (it should be in the same container)
    const trendingIcon = popularSearchesHeading.parentElement?.querySelector('svg')
    expect(trendingIcon).toBeInTheDocument()
  })

  it('renders search icon', () => {
    render(<NoResults />)
    
    // The search icon should be in the main icon container
    const iconContainer = screen.getByText('No products found').parentElement?.parentElement?.querySelector('.bg-gray-100')
    expect(iconContainer).toBeInTheDocument()
  })
})