import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchBar } from '@/components/product/SearchBar'

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

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
  })
  ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  ;(global.fetch as jest.Mock).mockClear()
})

describe('SearchBar', () => {
  it('renders search input with placeholder', () => {
    render(<SearchBar />)
    
    expect(screen.getByPlaceholderText('Search for products...')).toBeInTheDocument()
    expect(screen.getByLabelText('Search products')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<SearchBar placeholder="Find items..." />)
    
    expect(screen.getByPlaceholderText('Find items...')).toBeInTheDocument()
  })

  it('initializes with query from URL params', () => {
    mockSearchParams.get.mockReturnValue('test query')
    
    render(<SearchBar />)
    
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument()
  })

  it('updates input value when typing', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'nike shoes')
    
    expect(input).toHaveValue('nike shoes')
  })

  it('navigates to search page on form submission', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    const searchButton = screen.getByLabelText('Search')
    
    await user.type(input, 'test query')
    await user.click(searchButton)
    
    expect(mockPush).toHaveBeenCalledWith('/search?q=test+query')
  })

  it('navigates to search page on Enter key press', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    
    await user.type(input, 'test query')
    await user.keyboard('{Enter}')
    
    expect(mockPush).toHaveBeenCalledWith('/search?q=test+query')
  })

  it('calls onSearch callback when provided', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    render(<SearchBar onSearch={onSearch} />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    const searchButton = screen.getByLabelText('Search')
    
    await user.type(input, 'test query')
    await user.click(searchButton)
    
    expect(onSearch).toHaveBeenCalledWith('test query')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('fetches and displays suggestions when typing', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        suggestions: ['Nike Air Max', 'Nike React', 'Nike Dunk']
      }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSuggestions)
    })
    
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'nike')
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/products/meilisearch/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: 'nike', limit: 5 }),
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Nike Air Max')).toBeInTheDocument()
      expect(screen.getByText('Nike React')).toBeInTheDocument()
      expect(screen.getByText('Nike Dunk')).toBeInTheDocument()
    })
  })

  it('does not fetch suggestions for queries less than 2 characters', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'n')
    
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  it('handles suggestion click', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        suggestions: ['Nike Air Max']
      }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSuggestions)
    })
    
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'nike')
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Nike Air Max'))
    
    expect(mockPush).toHaveBeenCalledWith('/search?q=Nike+Air+Max')
  })

  it('navigates suggestions with keyboard', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        suggestions: ['Nike Air Max', 'Nike React']
      }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSuggestions)
    })
    
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'nike')
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max')).toBeInTheDocument()
    })
    
    // Navigate down to first suggestion
    await user.keyboard('{ArrowDown}')
    
    // Select with Enter
    await user.keyboard('{Enter}')
    
    expect(mockPush).toHaveBeenCalledWith('/search?q=Nike+Air+Max')
  })

  it('clears search input when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'test query')
    
    const clearButton = screen.getByLabelText('Clear search')
    await user.click(clearButton)
    
    expect(input).toHaveValue('')
  })

  it('hides suggestions on Escape key', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        suggestions: ['Nike Air Max']
      }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSuggestions)
    })
    
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'nike')
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max')).toBeInTheDocument()
    })
    
    await user.keyboard('{Escape}')
    
    expect(screen.queryByText('Nike Air Max')).not.toBeInTheDocument()
  })

  it('shows loading spinner while fetching suggestions', async () => {
    let resolvePromise: (value: any) => void
    const mockPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    ;(global.fetch as jest.Mock).mockReturnValueOnce(mockPromise)
    
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'nike')
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
    
    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { suggestions: [] } })
    })
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  it('handles fetch errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    
    const user = userEvent.setup()
    render(<SearchBar />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'nike')
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch suggestions:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })

  it('does not show suggestions when showSuggestions is false', async () => {
    const user = userEvent.setup()
    render(<SearchBar showSuggestions={false} />)
    
    const input = screen.getByPlaceholderText('Search for products...')
    await user.type(input, 'nike')
    
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})