import {
  parseSearchParams,
  buildSearchParams,
  updateSearchState,
  generateBookmarkableUrl,
  areSearchStatesEqual,
  getActiveFilterCount,
  clearAllFilters,
  removeFilter,
  validateSearchState,
  getFilterSummary,
  SearchState
} from '@/lib/search/url-state'

// Mock URLSearchParams for testing
class MockURLSearchParams {
  private params: Map<string, string> = new Map()

  constructor(init?: string | URLSearchParams | string[][]) {
    if (typeof init === 'string') {
      // Parse query string
      if (init.startsWith('?')) init = init.slice(1)
      init.split('&').forEach(pair => {
        const [key, value] = pair.split('=')
        if (key && value) {
          this.params.set(decodeURIComponent(key), decodeURIComponent(value))
        }
      })
    }
  }

  get(key: string): string | null {
    return this.params.get(key) || null
  }

  set(key: string, value: string): void {
    this.params.set(key, value)
  }

  toString(): string {
    const pairs: string[] = []
    this.params.forEach((value, key) => {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    })
    return pairs.join('&')
  }
}

// Mock ReadonlyURLSearchParams
const createMockSearchParams = (params: Record<string, string>) => {
  const mockParams = {
    get: (key: string) => params[key] || null,
    toString: () => new MockURLSearchParams(
      Object.entries(params).map(([k, v]) => [k, v])
    ).toString()
  }
  return mockParams as any
}

describe('URL State Management', () => {
  describe('parseSearchParams', () => {
    it('parses basic search parameters', () => {
      const searchParams = createMockSearchParams({
        q: 'nike shoes',
        category: 'shoes',
        sort: 'price',
        order: 'asc'
      })

      const result = parseSearchParams(searchParams)

      expect(result).toEqual({
        query: 'nike shoes',
        category: 'shoes',
        sort: 'price',
        order: 'asc'
      })
    })

    it('parses array parameters', () => {
      const searchParams = createMockSearchParams({
        brand: 'nike,adidas,puma',
        size: 's,m,l',
        color: 'red,blue'
      })

      const result = parseSearchParams(searchParams)

      expect(result).toEqual({
        brand: ['nike', 'adidas', 'puma'],
        size: ['s', 'm', 'l'],
        color: ['red', 'blue']
      })
    })

    it('parses numeric parameters', () => {
      const searchParams = createMockSearchParams({
        minPrice: '100',
        maxPrice: '500',
        minRating: '4',
        page: '2',
        limit: '20'
      })

      const result = parseSearchParams(searchParams)

      expect(result).toEqual({
        minPrice: 100,
        maxPrice: 500,
        minRating: 4,
        page: 2,
        limit: 20
      })
    })

    it('handles invalid numeric parameters', () => {
      const searchParams = createMockSearchParams({
        minPrice: 'invalid',
        page: '0',
        limit: '-5'
      })

      const result = parseSearchParams(searchParams)

      expect(result).toEqual({})
    })

    it('filters empty array values', () => {
      const searchParams = createMockSearchParams({
        brand: 'nike,,adidas,',
        size: ','
      })

      const result = parseSearchParams(searchParams)

      expect(result).toEqual({
        brand: ['nike', 'adidas']
      })
    })
  })

  describe('buildSearchParams', () => {
    it('builds basic parameters', () => {
      const state: SearchState = {
        query: 'nike shoes',
        category: 'shoes',
        sort: 'price',
        order: 'asc'
      }

      const result = buildSearchParams(state)

      expect(result.get('q')).toBe('nike shoes')
      expect(result.get('category')).toBe('shoes')
      expect(result.get('sort')).toBe('price')
      expect(result.get('order')).toBe('asc')
    })

    it('builds array parameters', () => {
      const state: SearchState = {
        brand: ['nike', 'adidas'],
        size: ['s', 'm', 'l']
      }

      const result = buildSearchParams(state)

      expect(result.get('brand')).toBe('nike,adidas')
      expect(result.get('size')).toBe('s,m,l')
    })

    it('skips empty arrays', () => {
      const state: SearchState = {
        brand: [],
        size: ['s']
      }

      const result = buildSearchParams(state)

      expect(result.get('brand')).toBeNull()
      expect(result.get('size')).toBe('s')
    })

    it('skips default values', () => {
      const state: SearchState = {
        viewMode: 'grid', // default, should be skipped
        limit: 20, // default, should be skipped
        page: 1 // default, should be skipped
      }

      const result = buildSearchParams(state)

      expect(result.get('view')).toBeNull()
      expect(result.get('limit')).toBeNull()
      expect(result.get('page')).toBeNull()
    })

    it('includes non-default values', () => {
      const state: SearchState = {
        viewMode: 'list',
        limit: 50,
        page: 3
      }

      const result = buildSearchParams(state)

      expect(result.get('view')).toBe('list')
      expect(result.get('limit')).toBe('50')
      expect(result.get('page')).toBe('3')
    })
  })

  describe('updateSearchState', () => {
    it('updates state with new values', () => {
      const currentState: SearchState = {
        query: 'shoes',
        category: 'clothing'
      }

      const updates = {
        category: 'shoes',
        brand: ['nike']
      }

      const result = updateSearchState(currentState, updates)

      expect(result).toEqual({
        query: 'shoes',
        category: 'shoes',
        brand: ['nike']
      })
    })

    it('resets page by default', () => {
      const currentState: SearchState = {
        query: 'shoes',
        page: 5
      }

      const updates = {
        category: 'shoes'
      }

      const result = updateSearchState(currentState, updates)

      expect(result.page).toBeUndefined()
    })

    it('preserves page when resetPage is false', () => {
      const currentState: SearchState = {
        query: 'shoes',
        page: 5
      }

      const updates = {
        category: 'shoes'
      }

      const result = updateSearchState(currentState, updates, false)

      expect(result.page).toBe(5)
    })

    it('cleans up undefined values', () => {
      const currentState: SearchState = {
        query: 'shoes',
        category: 'clothing',
        brand: ['nike']
      }

      const updates = {
        category: undefined,
        brand: []
      }

      const result = updateSearchState(currentState, updates)

      expect(result).toEqual({
        query: 'shoes'
      })
    })
  })

  describe('generateBookmarkableUrl', () => {
    it('generates URL with query parameters', () => {
      const state: SearchState = {
        query: 'nike shoes',
        category: 'shoes',
        brand: ['nike', 'adidas']
      }

      const result = generateBookmarkableUrl('/search', state)

      expect(result).toBe('/search?q=nike+shoes&category=shoes&brand=nike%2Cadidas')
    })

    it('returns base path for empty state', () => {
      const state: SearchState = {}

      const result = generateBookmarkableUrl('/search', state)

      expect(result).toBe('/search')
    })
  })

  describe('areSearchStatesEqual', () => {
    it('returns true for identical states', () => {
      const state1: SearchState = {
        query: 'shoes',
        brand: ['nike', 'adidas']
      }

      const state2: SearchState = {
        query: 'shoes',
        brand: ['nike', 'adidas']
      }

      expect(areSearchStatesEqual(state1, state2)).toBe(true)
    })

    it('returns false for different states', () => {
      const state1: SearchState = {
        query: 'shoes',
        brand: ['nike']
      }

      const state2: SearchState = {
        query: 'shoes',
        brand: ['adidas']
      }

      expect(areSearchStatesEqual(state1, state2)).toBe(false)
    })

    it('handles array order differences', () => {
      const state1: SearchState = {
        brand: ['nike', 'adidas']
      }

      const state2: SearchState = {
        brand: ['adidas', 'nike']
      }

      // Arrays with different order should be considered different
      expect(areSearchStatesEqual(state1, state2)).toBe(false)
    })
  })

  describe('getActiveFilterCount', () => {
    it('counts active filters correctly', () => {
      const state: SearchState = {
        query: 'shoes', // not counted as filter
        category: 'shoes', // 1
        brand: ['nike', 'adidas'], // 2
        size: ['s'], // 1
        minPrice: 100, // 1 (price range counts as 1)
        maxPrice: 500,
        minRating: 4 // 1
      }

      expect(getActiveFilterCount(state)).toBe(6)
    })

    it('returns 0 for no filters', () => {
      const state: SearchState = {
        query: 'shoes',
        sort: 'price',
        page: 2
      }

      expect(getActiveFilterCount(state)).toBe(0)
    })
  })

  describe('clearAllFilters', () => {
    it('removes all filters but keeps search and pagination', () => {
      const state: SearchState = {
        query: 'shoes',
        category: 'shoes',
        brand: ['nike'],
        minPrice: 100,
        sort: 'price',
        viewMode: 'list',
        limit: 50
      }

      const result = clearAllFilters(state)

      expect(result).toEqual({
        query: 'shoes',
        sort: 'price',
        viewMode: 'list',
        limit: 50
      })
    })
  })

  describe('removeFilter', () => {
    it('removes single value filter', () => {
      const state: SearchState = {
        query: 'shoes',
        category: 'shoes',
        brand: ['nike']
      }

      const result = removeFilter(state, 'category')

      expect(result).toEqual({
        query: 'shoes',
        brand: ['nike']
      })
    })

    it('removes specific value from array filter', () => {
      const state: SearchState = {
        brand: ['nike', 'adidas', 'puma']
      }

      const result = removeFilter(state, 'brand', 'adidas')

      expect(result).toEqual({
        brand: ['nike', 'puma']
      })
    })

    it('removes entire array filter when last value removed', () => {
      const state: SearchState = {
        brand: ['nike']
      }

      const result = removeFilter(state, 'brand', 'nike')

      expect(result).toEqual({})
    })

    it('removes price range filter', () => {
      const state: SearchState = {
        minPrice: 100,
        maxPrice: 500,
        category: 'shoes'
      }

      const result = removeFilter(state, 'price')

      expect(result).toEqual({
        category: 'shoes'
      })
    })

    it('resets page when removing filter', () => {
      const state: SearchState = {
        category: 'shoes',
        page: 5
      }

      const result = removeFilter(state, 'category')

      expect(result.page).toBeUndefined()
    })
  })

  describe('validateSearchState', () => {
    it('validates correct state', () => {
      const state: SearchState = {
        query: 'shoes',
        minPrice: 100,
        maxPrice: 500,
        minRating: 4,
        page: 2,
        limit: 20
      }

      const result = validateSearchState(state)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('validates price range errors', () => {
      const state: SearchState = {
        minPrice: -100,
        maxPrice: -50
      }

      const result = validateSearchState(state)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Minimum price cannot be negative')
      expect(result.errors).toContain('Maximum price cannot be negative')
    })

    it('validates price range order', () => {
      const state: SearchState = {
        minPrice: 500,
        maxPrice: 100
      }

      const result = validateSearchState(state)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Minimum price cannot be greater than maximum price')
    })

    it('validates rating range', () => {
      const state: SearchState = {
        minRating: 6
      }

      const result = validateSearchState(state)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Rating must be between 0 and 5')
    })

    it('validates pagination', () => {
      const state: SearchState = {
        page: 0,
        limit: 200
      }

      const result = validateSearchState(state)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Page number must be greater than 0')
      expect(result.errors).toContain('Limit must be between 1 and 100')
    })
  })

  describe('getFilterSummary', () => {
    it('generates filter summary', () => {
      const state: SearchState = {
        category: 'shoes',
        brand: ['nike', 'adidas'],
        size: ['s', 'm'],
        minPrice: 100,
        maxPrice: 500,
        minRating: 4
      }

      const result = getFilterSummary(state)

      expect(result).toHaveLength(7) // 1 category + 2 brands + 2 sizes + 1 price + 1 rating
      expect(result.find(f => f.key === 'category')?.value).toBe('shoes')
      expect(result.filter(f => f.key === 'brand')).toHaveLength(2)
      expect(result.find(f => f.key === 'price')?.value).toBe('₦100 - ₦500')
      expect(result.find(f => f.key === 'rating')?.value).toBe('4+ stars')
    })

    it('handles price range with only min or max', () => {
      const state1: SearchState = { minPrice: 100 }
      const state2: SearchState = { maxPrice: 500 }

      const result1 = getFilterSummary(state1)
      const result2 = getFilterSummary(state2)

      expect(result1.find(f => f.key === 'price')?.value).toBe('₦100 - ₦∞')
      expect(result2.find(f => f.key === 'price')?.value).toBe('₦0 - ₦500')
    })
  })
})