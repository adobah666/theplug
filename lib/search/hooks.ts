'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  SearchState, 
  parseSearchParams, 
  buildSearchParams, 
  updateSearchState,
  generateBookmarkableUrl,
  getActiveFilterCount,
  clearAllFilters,
  removeFilter,
  validateSearchState
} from './url-state'

interface UseSearchReturn {
  // State
  searchState: SearchState
  isLoading: boolean
  error: string | null
  
  // Actions
  updateSearch: (updates: Partial<SearchState>) => void
  clearFilters: () => void
  removeFilter: (key: string, value?: string) => void
  setSort: (sort: string, order?: 'asc' | 'desc') => void
  setPage: (page: number) => void
  setViewMode: (mode: 'grid' | 'list') => void
  
  // Computed
  activeFilterCount: number
  bookmarkableUrl: string
  isValidState: boolean
  validationErrors: string[]
}

export function useSearch(basePath: string = '/search'): UseSearchReturn {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parse current search state from URL
  const searchState = parseSearchParams(searchParams)

  // Validate current state
  const validation = validateSearchState(searchState)

  // Update search state and URL
  const updateSearch = useCallback((updates: Partial<SearchState>) => {
    try {
      setError(null)
      
      // Update state
      const newState = updateSearchState(searchState, updates)
      
      // Validate new state
      const newValidation = validateSearchState(newState)
      if (!newValidation.isValid) {
        setError(newValidation.errors.join(', '))
        return
      }

      // Build new URL
      const params = buildSearchParams(newState)
      const newUrl = `${basePath}?${params.toString()}`
      
      // Update URL (bookmarkable)
      window.history.replaceState({}, '', newUrl)
      
      // Navigate (for Next.js routing)
      router.push(`?${params.toString()}`, { scroll: false })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update search')
    }
  }, [searchState, router, basePath])

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedState = clearAllFilters(searchState)
    updateSearch(clearedState)
  }, [searchState, updateSearch])

  // Remove specific filter
  const removeFilterHandler = useCallback((key: string, value?: string) => {
    const newState = removeFilter(searchState, key, value)
    updateSearch(newState)
  }, [searchState, updateSearch])

  // Set sort order
  const setSort = useCallback((sort: string, order: 'asc' | 'desc' = 'desc') => {
    updateSearch({ sort, order })
  }, [updateSearch])

  // Set page
  const setPage = useCallback((page: number) => {
    updateSearch({ page })
  }, [updateSearch])

  // Set view mode
  const setViewMode = useCallback((viewMode: 'grid' | 'list') => {
    updateSearch({ viewMode })
  }, [updateSearch])

  // Computed values
  const activeFilterCount = getActiveFilterCount(searchState)
  const bookmarkableUrl = generateBookmarkableUrl(basePath, searchState)

  return {
    // State
    searchState,
    isLoading,
    error,
    
    // Actions
    updateSearch,
    clearFilters,
    removeFilter: removeFilterHandler,
    setSort,
    setPage,
    setViewMode,
    
    // Computed
    activeFilterCount,
    bookmarkableUrl,
    isValidState: validation.isValid,
    validationErrors: validation.errors
  }
}

interface UseSearchResultsReturn {
  // Data
  results: any[] | null
  totalResults: number
  totalPages: number
  currentPage: number
  
  // State
  isLoading: boolean
  error: string | null
  
  // Actions
  refetch: () => Promise<void>
}

export function useSearchResults(searchState: SearchState): UseSearchResultsReturn {
  const [results, setResults] = useState<any[] | null>(null)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Memoize the query string to avoid triggering effects due to object identity changes
  const queryString = useMemo(() => buildSearchParams(searchState).toString(), [searchState])

  // Fetch search results
  const fetchResults = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use Meilisearch for better search experience
      const response = await fetch(`/api/products/meilisearch?${queryString}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setResults(data.data.hits || [])
        setTotalResults(data.data.totalHits || 0)
        setTotalPages(data.data.totalPages || 0)
        setCurrentPage(data.data.currentPage || 1)
      } else {
        throw new Error(data.error || 'Failed to fetch results')
      }
    } catch (err) {
      console.error('Search results error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while searching')
      setResults([])
      setTotalResults(0)
      setTotalPages(0)
      setCurrentPage(1)
    } finally {
      setIsLoading(false)
    }
  }, [queryString])

  // Fetch results when search state changes
  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  return {
    // Data
    results,
    totalResults,
    totalPages,
    currentPage,
    
    // State
    isLoading,
    error,
    
    // Actions
    refetch: fetchResults
  }
}

interface UseFilterFacetsReturn {
  facets: any
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useFilterFacets(searchState: SearchState): UseFilterFacetsReturn {
  const [facets, setFacets] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Memoize the query string to avoid triggering effects due to object identity changes
  const facetsQueryString = useMemo(() => buildSearchParams(searchState).toString(), [searchState])

  // Fetch filter facets
  const fetchFacets = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query parameters (exclude facets we're calculating)
      const response = await fetch(`/api/products/search/facets?${facetsQueryString}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setFacets(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch facets')
      }
    } catch (err) {
      console.error('Filter facets error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load filter options')
      setFacets(null)
    } finally {
      setIsLoading(false)
    }
  }, [facetsQueryString])

  // Fetch facets when search state changes
  useEffect(() => {
    fetchFacets()
  }, [fetchFacets])

  return {
    facets,
    isLoading,
    error,
    refetch: fetchFacets
  }
}

// Debounced search hook for real-time search
export function useDebouncedSearch(
  initialQuery: string = '',
  delay: number = 300
) {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query)
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [query, delay])

  return {
    query,
    debouncedQuery,
    setQuery
  }
}

// Search suggestions hook
export function useSearchSuggestions(query: string, enabled: boolean = true) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !query || query.length < 2) {
      setSuggestions([])
      return
    }

    const fetchSuggestions = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/products/meilisearch/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, limit: 5 }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setSuggestions(data.data.suggestions || [])
          }
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions')
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(timeoutId)
  }, [query, enabled])

  return {
    suggestions,
    isLoading,
    error
  }
}