import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  useSearch, 
  useSearchResults, 
  useFilterFacets,
  useDebouncedSearch,
  useSearchSuggestions 
} from '@/lib/search/hooks'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    replaceState: jest.fn(),
  },
  writable: true,
})

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
  ;(window.history.replaceState as jest.Mock).mockClear()
})

describe('Search Hooks', () => {
  describe('useSearch', () => {
    it('parses initial search state from URL params', () => {
      mockSearchParams.get.mockImplementation((key) => {
        switch (key) {
          case 'q': return 'nike shoes'
          case 'category': return 'shoes'
          case 'brand': return 'nike,adidas'
          default: return null
        }
      })

      const { result } = renderHook(() => useSearch('/search'))

      expect(result.current.searchState).toEqual({
        query: 'nike shoes',
        category: 'shoes',
        brand: ['nike', 'adidas']
      })
    })

    it('updates search state and URL', () => {
      mockSearchParams.toString.mockReturnValue('q=shoes')

      const { result } = renderHook(() => useSearch('/search'))

      act(() => {
        result.current.updateSearch({ category: 'clothing' })
      })

      expect(window.history.replaceState).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalled()
    })

    it('clears all filters', () => {
      mockSearchParams.get.mockImplementation((key) => {
        switch (key) {
          case 'q': return 'shoes'
          case 'category': return 'shoes'
          case 'brand': return 'nike'
          default: return null
        }
      })

      const { result } = renderHook(() => useSearch('/search'))

      act(() => {
        result.current.clearFilters()
      })

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('q=shoes'))
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('category'))
    })

    it('removes specific filter', () => {
      mockSearchParams.get.mockImplementation((key) => {
        switch (key) {
          case 'brand': return 'nike,adidas'
          default: return null
        }
      })

      const { result } = renderHook(() => useSearch('/search'))

      act(() => {
        result.current.removeFilter('brand', 'nike')
      })

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('brand=adidas'))
    })

    it('sets sort order', () => {
      const { result } = renderHook(() => useSearch('/search'))

      act(() => {
        result.current.setSort('price', 'asc')
      })

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('sort=price'))
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('order=asc'))
    })

    it('sets page number', () => {
      const { result } = renderHook(() => useSearch('/search'))

      act(() => {
        result.current.setPage(3)
      })

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('page=3'))
    })

    it('sets view mode', () => {
      const { result } = renderHook(() => useSearch('/search'))

      act(() => {
        result.current.setViewMode('list')
      })

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('view=list'))
    })

    it('calculates active filter count', () => {
      mockSearchParams.get.mockImplementation((key) => {
        switch (key) {
          case 'category': return 'shoes'
          case 'brand': return 'nike,adidas'
          case 'minPrice': return '100'
          default: return null
        }
      })

      const { result } = renderHook(() => useSearch('/search'))

      expect(result.current.activeFilterCount).toBe(4) // 1 category + 2 brands + 1 price
    })

    it('generates bookmarkable URL', () => {
      mockSearchParams.get.mockImplementation((key) => {
        switch (key) {
          case 'q': return 'shoes'
          case 'category': return 'clothing'
          default: return null
        }
      })

      const { result } = renderHook(() => useSearch('/search'))

      expect(result.current.bookmarkableUrl).toContain('/search?')
      expect(result.current.bookmarkableUrl).toContain('q=shoes')
      expect(result.current.bookmarkableUrl).toContain('category=clothing')
    })

    it('validates search state', () => {
      mockSearchParams.get.mockImplementation((key) => {
        switch (key) {
          case 'minPrice': return '-100' // invalid
          default: return null
        }
      })

      const { result } = renderHook(() => useSearch('/search'))

      expect(result.current.isValidState).toBe(false)
      expect(result.current.validationErrors).toContain('Minimum price cannot be negative')
    })

    it('handles validation errors on update', () => {
      const { result } = renderHook(() => useSearch('/search'))

      act(() => {
        result.current.updateSearch({ minPrice: -100 })
      })

      expect(result.current.error).toContain('Minimum price cannot be negative')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('useSearchResults', () => {
    const mockSearchResults = {
      success: true,
      data: {
        hits: [
          { _id: '1', name: 'Product 1', price: 100 },
          { _id: '2', name: 'Product 2', price: 200 }
        ],
        totalHits: 2,
        totalPages: 1,
        currentPage: 1
      }
    }

    it('fetches search results', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      })

      const { result } = renderHook(() => 
        useSearchResults({ query: 'shoes' })
      )

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.results).toEqual(mockSearchResults.data.hits)
      expect(result.current.totalResults).toBe(2)
      expect(result.current.totalPages).toBe(1)
      expect(result.current.currentPage).toBe(1)
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => 
        useSearchResults({ query: 'shoes' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.results).toEqual([])
    })

    it('handles API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Search failed'
        })
      })

      const { result } = renderHook(() => 
        useSearchResults({ query: 'shoes' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Search failed')
    })

    it('refetches results', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      })

      const { result } = renderHook(() => 
        useSearchResults({ query: 'shoes' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(global.fetch).toHaveBeenCalledTimes(1)

      await act(async () => {
        await result.current.refetch()
      })

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('refetches when search state changes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      })

      const { result, rerender } = renderHook(
        ({ searchState }) => useSearchResults(searchState),
        { initialProps: { searchState: { query: 'shoes' } } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(global.fetch).toHaveBeenCalledTimes(1)

      rerender({ searchState: { query: 'boots' } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('useFilterFacets', () => {
    const mockFacets = {
      success: true,
      data: {
        categories: [
          { value: 'shoes', label: 'Shoes', count: 10 },
          { value: 'clothing', label: 'Clothing', count: 20 }
        ],
        brands: [
          { value: 'nike', label: 'Nike', count: 15 },
          { value: 'adidas', label: 'Adidas', count: 12 }
        ]
      }
    }

    it('fetches filter facets', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFacets)
      })

      const { result } = renderHook(() => 
        useFilterFacets({ query: 'shoes' })
      )

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.facets).toEqual(mockFacets.data)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products/search/facets')
      )
    })

    it('handles facets fetch errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Facets error'))

      const { result } = renderHook(() => 
        useFilterFacets({ query: 'shoes' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Facets error')
      expect(result.current.facets).toBeNull()
    })
  })

  describe('useDebouncedSearch', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('debounces search query', () => {
      const { result } = renderHook(() => useDebouncedSearch('', 300))

      expect(result.current.query).toBe('')
      expect(result.current.debouncedQuery).toBe('')

      act(() => {
        result.current.setQuery('nike')
      })

      expect(result.current.query).toBe('nike')
      expect(result.current.debouncedQuery).toBe('') // not updated yet

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(result.current.debouncedQuery).toBe('nike')
    })

    it('cancels previous timeout on new input', () => {
      const { result } = renderHook(() => useDebouncedSearch('', 300))

      act(() => {
        result.current.setQuery('nike')
      })

      act(() => {
        jest.advanceTimersByTime(200)
      })

      act(() => {
        result.current.setQuery('nike shoes')
      })

      act(() => {
        jest.advanceTimersByTime(200)
      })

      expect(result.current.debouncedQuery).toBe('') // still not updated

      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(result.current.debouncedQuery).toBe('nike shoes')
    })
  })

  describe('useSearchSuggestions', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    const mockSuggestions = {
      success: true,
      data: {
        suggestions: ['nike air max', 'nike react', 'nike dunk']
      }
    }

    it('fetches suggestions for valid query', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuggestions)
      })

      const { result } = renderHook(() => useSearchSuggestions('nike'))

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.suggestions).toEqual(mockSuggestions.data.suggestions)
    })

    it('does not fetch for short queries', () => {
      renderHook(() => useSearchSuggestions('n'))

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not fetch when disabled', () => {
      renderHook(() => useSearchSuggestions('nike', false))

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('handles suggestions fetch errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Suggestions error'))

      const { result } = renderHook(() => useSearchSuggestions('nike'))

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Suggestions error')
    })

    it('debounces suggestions requests', () => {
      const { rerender } = renderHook(
        ({ query }) => useSearchSuggestions(query),
        { initialProps: { query: 'nike' } }
      )

      rerender({ query: 'nike air' })
      rerender({ query: 'nike air max' })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/products/meilisearch/suggestions',
        expect.objectContaining({
          body: JSON.stringify({ query: 'nike air max', limit: 5 })
        })
      )
    })
  })
})