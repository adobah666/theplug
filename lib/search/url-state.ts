import { ReadonlyURLSearchParams } from 'next/navigation'

export interface SearchState {
  query?: string
  category?: string
  brand?: string[]
  size?: string[]
  color?: string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
  viewMode?: 'grid' | 'list'
}

export interface FilterState {
  [key: string]: string | string[] | number | undefined
}

/**
 * Parse URL search parameters into a structured search state
 */
export function parseSearchParams(searchParams: ReadonlyURLSearchParams): SearchState {
  const state: SearchState = {}

  // Basic search parameters
  const query = searchParams.get('q')
  if (query) state.query = query

  const category = searchParams.get('category')
  if (category) state.category = category

  const sort = searchParams.get('sort')
  if (sort) state.sort = sort

  const order = searchParams.get('order') as 'asc' | 'desc'
  if (order) state.order = order

  const viewMode = searchParams.get('view') as 'grid' | 'list'
  if (viewMode) state.viewMode = viewMode

  // Array parameters (comma-separated)
  const brand = searchParams.get('brand')
  if (brand) state.brand = brand.split(',').filter(Boolean)

  const size = searchParams.get('size')
  if (size) state.size = size.split(',').filter(Boolean)

  const color = searchParams.get('color')
  if (color) state.color = color.split(',').filter(Boolean)

  // Numeric parameters
  const minPrice = searchParams.get('minPrice')
  if (minPrice) {
    const parsed = parseFloat(minPrice)
    if (!isNaN(parsed)) state.minPrice = parsed
  }

  const maxPrice = searchParams.get('maxPrice')
  if (maxPrice) {
    const parsed = parseFloat(maxPrice)
    if (!isNaN(parsed)) state.maxPrice = parsed
  }

  const minRating = searchParams.get('minRating')
  if (minRating) {
    const parsed = parseFloat(minRating)
    if (!isNaN(parsed)) state.minRating = parsed
  }

  const page = searchParams.get('page')
  if (page) {
    const parsed = parseInt(page)
    if (!isNaN(parsed) && parsed > 0) state.page = parsed
  }

  const limit = searchParams.get('limit')
  if (limit) {
    const parsed = parseInt(limit)
    if (!isNaN(parsed) && parsed > 0) state.limit = parsed
  }

  return state
}

/**
 * Convert search state to URL search parameters
 */
export function buildSearchParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams()

  // Add basic parameters
  if (state.query) params.set('q', state.query)
  if (state.category) params.set('category', state.category)
  if (state.sort) params.set('sort', state.sort)
  if (state.order) params.set('order', state.order)
  if (state.viewMode && state.viewMode !== 'grid') params.set('view', state.viewMode)

  // Add array parameters
  if (state.brand && state.brand.length > 0) {
    params.set('brand', state.brand.join(','))
  }
  if (state.size && state.size.length > 0) {
    params.set('size', state.size.join(','))
  }
  if (state.color && state.color.length > 0) {
    params.set('color', state.color.join(','))
  }

  // Add numeric parameters
  if (state.minPrice !== undefined) params.set('minPrice', state.minPrice.toString())
  if (state.maxPrice !== undefined) params.set('maxPrice', state.maxPrice.toString())
  if (state.minRating !== undefined) params.set('minRating', state.minRating.toString())
  if (state.page && state.page > 1) params.set('page', state.page.toString())
  if (state.limit && state.limit !== 20) params.set('limit', state.limit.toString())

  return params
}

/**
 * Update search state with new values
 */
export function updateSearchState(
  currentState: SearchState,
  updates: Partial<SearchState>,
  resetPage: boolean = true
): SearchState {
  const newState = { ...currentState, ...updates }

  // Reset page when filters change (unless explicitly disabled)
  if (resetPage && updates.page === undefined) {
    delete newState.page
  }

  // Clean up undefined values
  Object.keys(newState).forEach(key => {
    const value = newState[key as keyof SearchState]
    if (value === undefined || value === null || 
        (Array.isArray(value) && value.length === 0)) {
      delete newState[key as keyof SearchState]
    }
  })

  return newState
}

/**
 * Generate a bookmarkable URL for the current search state
 */
export function generateBookmarkableUrl(
  basePath: string,
  state: SearchState
): string {
  const params = buildSearchParams(state)
  const queryString = params.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}

/**
 * Check if two search states are equivalent
 */
export function areSearchStatesEqual(state1: SearchState, state2: SearchState): boolean {
  const params1 = buildSearchParams(state1).toString()
  const params2 = buildSearchParams(state2).toString()
  return params1 === params2
}

/**
 * Get active filter count from search state
 */
export function getActiveFilterCount(state: SearchState): number {
  let count = 0

  if (state.category) count++
  if (state.brand && state.brand.length > 0) count += state.brand.length
  if (state.size && state.size.length > 0) count += state.size.length
  if (state.color && state.color.length > 0) count += state.color.length
  if (state.minPrice !== undefined || state.maxPrice !== undefined) count++
  if (state.minRating !== undefined) count++

  return count
}

/**
 * Clear all filters from search state (keep query and pagination)
 */
export function clearAllFilters(state: SearchState): SearchState {
  return {
    query: state.query,
    sort: state.sort,
    order: state.order,
    viewMode: state.viewMode,
    limit: state.limit
    // page is intentionally omitted to reset to first page
  }
}

/**
 * Get filter summary for display
 */
export function getFilterSummary(state: SearchState): Array<{
  key: string
  label: string
  value: string
  removable: boolean
}> {
  const summary: Array<{
    key: string
    label: string
    value: string
    removable: boolean
  }> = []

  if (state.category) {
    summary.push({
      key: 'category',
      label: 'Category',
      value: state.category,
      removable: true
    })
  }

  if (state.brand && state.brand.length > 0) {
    state.brand.forEach(brand => {
      summary.push({
        key: 'brand',
        label: 'Brand',
        value: brand,
        removable: true
      })
    })
  }

  if (state.size && state.size.length > 0) {
    state.size.forEach(size => {
      summary.push({
        key: 'size',
        label: 'Size',
        value: size.toUpperCase(),
        removable: true
      })
    })
  }

  if (state.color && state.color.length > 0) {
    state.color.forEach(color => {
      summary.push({
        key: 'color',
        label: 'Color',
        value: color,
        removable: true
      })
    })
  }

  if (state.minPrice !== undefined || state.maxPrice !== undefined) {
    const min = state.minPrice || 0
    const max = state.maxPrice || '∞'
    summary.push({
      key: 'price',
      label: 'Price',
      value: `₦${min.toLocaleString()} - ₦${max === '∞' ? max : max.toLocaleString()}`,
      removable: true
    })
  }

  if (state.minRating !== undefined) {
    summary.push({
      key: 'rating',
      label: 'Rating',
      value: `${state.minRating}+ stars`,
      removable: true
    })
  }

  return summary
}

/**
 * Remove a specific filter from search state
 */
export function removeFilter(
  state: SearchState,
  filterKey: string,
  filterValue?: string
): SearchState {
  const newState = { ...state }

  switch (filterKey) {
    case 'category':
      delete newState.category
      break
    case 'brand':
      if (filterValue && newState.brand) {
        newState.brand = newState.brand.filter(b => b !== filterValue)
        if (newState.brand.length === 0) delete newState.brand
      } else {
        delete newState.brand
      }
      break
    case 'size':
      if (filterValue && newState.size) {
        newState.size = newState.size.filter(s => s !== filterValue)
        if (newState.size.length === 0) delete newState.size
      } else {
        delete newState.size
      }
      break
    case 'color':
      if (filterValue && newState.color) {
        newState.color = newState.color.filter(c => c !== filterValue)
        if (newState.color.length === 0) delete newState.color
      } else {
        delete newState.color
      }
      break
    case 'price':
      delete newState.minPrice
      delete newState.maxPrice
      break
    case 'rating':
      delete newState.minRating
      break
  }

  // Reset page when removing filters
  delete newState.page

  return newState
}

/**
 * Validate search state parameters
 */
export function validateSearchState(state: SearchState): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate price range
  if (state.minPrice !== undefined && state.minPrice < 0) {
    errors.push('Minimum price cannot be negative')
  }
  if (state.maxPrice !== undefined && state.maxPrice < 0) {
    errors.push('Maximum price cannot be negative')
  }
  if (state.minPrice !== undefined && state.maxPrice !== undefined && 
      state.minPrice > state.maxPrice) {
    errors.push('Minimum price cannot be greater than maximum price')
  }

  // Validate rating
  if (state.minRating !== undefined && (state.minRating < 0 || state.minRating > 5)) {
    errors.push('Rating must be between 0 and 5')
  }

  // Validate pagination
  if (state.page !== undefined && state.page < 1) {
    errors.push('Page number must be greater than 0')
  }
  if (state.limit !== undefined && (state.limit < 1 || state.limit > 100)) {
    errors.push('Limit must be between 1 and 100')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}