import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchResults from '@/app/search/SearchResults'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

const mockPush = jest.fn()
const mockSearchParams = {
  get: jest.fn(),
  toString: jest.fn(() => ''),
}

const mockSearchResults = {
  success: true,
  data: {
    hits: [
      {
        _id: '1',
        name: 'Nike Air Max 90',
        description: 'Classic Nike sneakers',
        price: 12000,
        images: ['/nike-air-max.jpg'],
        brand: 'Nike',
        rating: 4.5,
        reviewCount: 150,
        inventory: 10,
        category: {
          _id: 'cat1',
          name: 'Shoes',
          slug: 'shoes'
        }
      },
      {
        _id: '2',
        name: 'Adidas Ultraboost',
        description: 'Comfortable running shoes',
        price: 15000,
        images: ['/adidas-ultraboost.jpg'],
        brand: 'Adidas',
        rating: 4.7,
        reviewCount: 200,
        inventory: 5,
        category: {
          _id: 'cat1',
          name: 'Shoes',
          slug: 'shoes'
        }
      }
    ],
    totalHits: 2,
    totalPages: 1,
    currentPage: 1,
    processingTimeMs: 10
  },
  pagination: {
    limit: 20,
    currentPage: 1,
    totalPages: 1,
    totalHits: 2
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
  })
  ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockSearchResults)
  })
})

describe('Search and Filter Integration', () => {
  it('displays search results for a query', async () => {
    const searchParams = { q: 'nike' }
    
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max 90')).toBeInTheDocument()
      expect(screen.getByText('Adidas Ultraboost')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Showing 1-2 of 2 results for "nike"')).toBeInTheDocument()
  })

  it('applies filters and updates URL', async () => {
    const user = userEvent.setup()
    const searchParams = { q: 'shoes' }
    
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max 90')).toBeInTheDocument()
    })
    
    // Apply brand filter
    const nikeCheckbox = screen.getByLabelText('Nike')
    await user.click(nikeCheckbox)
    
    expect(mockPush).toHaveBeenCalledWith('?q=shoes&brand=nike')
  })

  it('changes sort order and updates results', async () => {
    const user = userEvent.setup()
    const searchParams = { q: 'shoes' }
    
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max 90')).toBeInTheDocument()
    })
    
    // Change sort order
    const sortSelect = screen.getByLabelText('Sort by:')
    await user.selectOptions(sortSelect, 'price_asc')
    
    expect(mockPush).toHaveBeenCalledWith('/search?q=shoes&sort=price_asc')
  })

  it('switches between grid and list view modes', async () => {
    const user = userEvent.setup()
    const searchParams = { q: 'shoes' }
    
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max 90')).toBeInTheDocument()
    })
    
    // Switch to list view
    const listViewButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg') && btn.getAttribute('aria-label') === null
    )
    
    if (listViewButton) {
      await user.click(listViewButton)
    }
    
    // In list view, descriptions should be visible
    await waitFor(() => {
      expect(screen.getByText('Classic Nike sneakers')).toBeInTheDocument()
    })
  })

  it('handles pagination', async () => {
    const user = userEvent.setup()
    
    // Mock results with pagination
    const paginatedResults = {
      ...mockSearchResults,
      data: {
        ...mockSearchResults.data,
        totalHits: 25,
        totalPages: 2,
        currentPage: 1
      },
      pagination: {
        ...mockSearchResults.pagination,
        totalHits: 25,
        totalPages: 2
      }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paginatedResults)
    })
    
    const searchParams = { q: 'shoes' }
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
    
    // Click next page
    await user.click(screen.getByText('Next'))
    
    expect(mockPush).toHaveBeenCalledWith('/search?q=shoes&page=2')
  })

  it('shows no results state when no products found', async () => {
    const emptyResults = {
      success: true,
      data: {
        hits: [],
        totalHits: 0,
        totalPages: 0,
        currentPage: 1,
        processingTimeMs: 5
      },
      pagination: {
        limit: 20,
        currentPage: 1,
        totalPages: 0,
        totalHits: 0
      }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyResults)
    })
    
    const searchParams = { q: 'nonexistent' }
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Browse All Products')).toBeInTheDocument()
  })

  it('applies multiple filters simultaneously', async () => {
    const user = userEvent.setup()
    const searchParams = { q: 'shoes' }
    
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max 90')).toBeInTheDocument()
    })
    
    // Apply brand filter
    await user.click(screen.getByLabelText('Nike'))
    
    // Apply price range filter
    const minPriceInput = screen.getByPlaceholderText('Min')
    const maxPriceInput = screen.getByPlaceholderText('Max')
    
    await user.type(minPriceInput, '10000')
    await user.type(maxPriceInput, '20000')
    
    // Wait for debounced price update
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('brand=nike')
      )
    })
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('minPrice=10000')
      )
    }, { timeout: 1000 })
  })

  it('clears all filters', async () => {
    const user = userEvent.setup()
    
    // Start with some filters applied
    mockSearchParams.get.mockImplementation((key) => {
      switch (key) {
        case 'q': return 'shoes'
        case 'brand': return 'nike'
        case 'category': return 'shoes'
        default: return null
      }
    })
    
    const searchParams = { q: 'shoes', brand: 'nike', category: 'shoes' }
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Clear All'))
    
    expect(mockPush).toHaveBeenCalledWith('?q=shoes')
  })

  it('handles mobile filter drawer', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    const user = userEvent.setup()
    const searchParams = { q: 'shoes' }
    
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })
    
    // Open mobile filters
    await user.click(screen.getByText('Filters'))
    
    // Should show filter drawer
    expect(screen.getByText('Apply Filters')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
    
    const searchParams = { q: 'shoes' }
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('preserves search query when applying filters', async () => {
    const user = userEvent.setup()
    
    mockSearchParams.get.mockImplementation((key) => {
      return key === 'q' ? 'nike shoes' : null
    })
    mockSearchParams.toString.mockReturnValue('q=nike+shoes')
    
    const searchParams = { q: 'nike shoes' }
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max 90')).toBeInTheDocument()
    })
    
    // Apply a filter
    await user.click(screen.getByLabelText('Nike'))
    
    // Should preserve the search query
    expect(mockPush).toHaveBeenCalledWith('?q=nike+shoes&brand=nike')
  })

  it('resets to first page when filters change', async () => {
    const user = userEvent.setup()
    
    mockSearchParams.toString.mockReturnValue('q=shoes&page=3')
    
    const searchParams = { q: 'shoes', page: '3' }
    render(<SearchResults searchParams={searchParams} />)
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max 90')).toBeInTheDocument()
    })
    
    // Apply a filter
    await user.click(screen.getByLabelText('Nike'))
    
    // Should reset to page 1
    expect(mockPush).toHaveBeenCalledWith('?q=shoes&brand=nike')
  })

  it('shows loading state while fetching results', () => {
    // Mock a pending promise
    let resolvePromise: (value: any) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    ;(global.fetch as jest.Mock).mockReturnValue(pendingPromise)
    
    const searchParams = { q: 'shoes' }
    render(<SearchResults searchParams={searchParams} />)
    
    expect(screen.getByText('Searching...')).toBeInTheDocument()
    
    // Resolve the promise to clean up
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve(mockSearchResults)
    })
  })
})