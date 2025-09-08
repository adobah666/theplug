import { getProductsIndex } from './client'
import { MeilisearchProduct } from './indexing'

// Search parameters interface
export interface ProductSearchParams {
  query?: string
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  size?: string
  color?: string
  minRating?: number
  inStock?: boolean
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'newest' | 'oldest' | 'popularity'
  page?: number
  limit?: number
}

// Search results interface
export interface ProductSearchResults {
  hits: MeilisearchProduct[]
  totalHits: number
  totalPages: number
  currentPage: number
  processingTimeMs: number
  query: string
}

// Build filter string from search parameters
const buildFilters = (params: ProductSearchParams): string[] => {
  const filters: string[] = []
  
  if (params.category) {
    filters.push(`category = "${params.category}"`)
  }
  
  if (params.brand) {
    filters.push(`brand = "${params.brand}"`)
  }
  
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const min = params.minPrice || 0
    const max = params.maxPrice || Number.MAX_SAFE_INTEGER
    filters.push(`price ${min} TO ${max}`)
  }
  
  if (params.size) {
    filters.push(`variants.size = "${params.size}"`)
  }
  
  if (params.color) {
    filters.push(`variants.color = "${params.color}"`)
  }
  
  if (params.minRating !== undefined) {
    filters.push(`rating >= ${params.minRating}`)
  }
  
  if (params.inStock) {
    filters.push('inventory > 0')
  }
  
  return filters
}

// Build sort array from sort parameter
const buildSort = (sortBy?: string): string[] => {
  switch (sortBy) {
    case 'price_asc':
      return ['price:asc']
    case 'price_desc':
      return ['price:desc']
    case 'rating_desc':
      return ['rating:desc']
    case 'newest':
      return ['createdAt:desc']
    case 'oldest':
      return ['createdAt:asc']
    case 'popularity':
      return ['reviewCount:desc', 'rating:desc']
    default:
      return []
  }
}

// Search products using Meilisearch
export const searchProducts = async (params: ProductSearchParams): Promise<ProductSearchResults> => {
  try {
    const index = getProductsIndex()
    const page = params.page || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit
    
    const filters = buildFilters(params)
    const sort = buildSort(params.sortBy)
    
    const searchParams: any = {
      offset,
      limit,
      attributesToHighlight: ['name', 'description'],
      attributesToCrop: ['description'],
      cropLength: 100
    }
    
    if (filters.length > 0) {
      searchParams.filter = filters
    }
    
    if (sort.length > 0) {
      searchParams.sort = sort
    }
    
    const results = await index.search(params.query || '', searchParams)
    
    const totalPages = Math.ceil(results.estimatedTotalHits / limit)
    
    return {
      hits: results.hits as MeilisearchProduct[],
      totalHits: results.estimatedTotalHits,
      totalPages,
      currentPage: page,
      processingTimeMs: results.processingTimeMs,
      query: params.query || ''
    }
  } catch (error) {
    console.error('Error searching products:', error)
    throw error
  }
}

// Get search suggestions/autocomplete
export const getSearchSuggestions = async (query: string, limit: number = 5): Promise<string[]> => {
  try {
    const index = getProductsIndex()
    
    const results = await index.search(query, {
      limit,
      attributesToRetrieve: ['name'],
      attributesToHighlight: []
    })
    
    return results.hits.map((hit: any) => hit.name)
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    throw error
  }
}

// Get facet values for filters
export const getFacetValues = async (facetName: string): Promise<Record<string, number>> => {
  try {
    const index = getProductsIndex()
    
    const results = await index.search('', {
      facets: [facetName],
      limit: 0
    })
    
    return results.facetDistribution?.[facetName] || {}
  } catch (error) {
    console.error(`Error getting facet values for ${facetName}:`, error)
    throw error
  }
}