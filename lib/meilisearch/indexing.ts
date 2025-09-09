import { getProductsIndex, PRODUCTS_INDEX } from './client'
import { IProduct } from '../db/models/Product'
import client from './client'

// Interface for Meilisearch product document
export interface MeilisearchProduct {
  id: string
  name: string
  description: string
  brand: string
  category: string
  categoryName?: string
  price: number
  images: string[]
  variants: Array<{
    size?: string
    color?: string
    sku: string
    price?: number
    inventory: number
  }>
  inventory: number
  rating: number
  reviewCount: number
  searchableText: string
  createdAt: number
  updatedAt: number
}

// Convert MongoDB product to Meilisearch document
export const productToMeilisearchDoc = (product: IProduct): MeilisearchProduct => {
  return {
    id: ((product as any)?._id?.toString?.() || (product as any)?.id?.toString?.() || ''),
    name: product.name,
    description: product.description,
    brand: product.brand,
    // Use category slug when populated, else fallback to ObjectId string
    category: (product as any)?.category?.slug || product.category?.toString() || '',
    categoryName: (product as any)?.category?.name || undefined,
    price: product.price,
    images: product.images,
    variants: product.variants.map(variant => ({
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      price: variant.price,
      inventory: variant.inventory
    })),
    inventory: product.inventory,
    rating: product.rating,
    reviewCount: product.reviewCount,
    searchableText: `${product.name} ${product.description} ${product.brand}`.toLowerCase(),
    createdAt: product.createdAt.getTime(),
    updatedAt: product.updatedAt.getTime()
  }
}

// Initialize products index with settings
export const initializeProductsIndex = async () => {
  try {
    const index = getProductsIndex()
    
    // Set searchable attributes
    await index.updateSearchableAttributes([
      'name',
      'description',
      'brand',
      'searchableText',
      // Allow searching by category name too
      'categoryName'
    ])
    
    // Set filterable attributes
    await index.updateFilterableAttributes([
      'category',
      'brand',
      'price',
      'rating',
      'inventory',
      'variants.size',
      'variants.color'
    ])
    
    // Set sortable attributes
    await index.updateSortableAttributes([
      'price',
      'rating',
      'createdAt',
      'updatedAt',
      'reviewCount'
    ])
    
    // Set ranking rules
    await index.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness'
    ])
    
    console.log('Products index initialized successfully')
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.warn('Error initializing products index (using mock):', msg)
    // Don't throw error for mock client
  }
}

// Add or update a single product in the index
export const indexProduct = async (product: IProduct) => {
  try {
    const index = getProductsIndex()
    const doc = productToMeilisearchDoc(product)
    
    await index.addDocuments([doc])
    console.log(`Product ${product._id} indexed successfully`)
  } catch (error) {
    const pid = ((product as any)?._id?.toString?.() || (product as any)?.id?.toString?.() || 'unknown')
    const msg = error instanceof Error ? error.message : String(error)
    console.warn(`Error indexing product ${pid} (using mock):`, msg)
    // Don't throw error for mock client
  }
}

// Add or update multiple products in the index
export const indexProducts = async (products: IProduct[]) => {
  try {
    const index = getProductsIndex()
    const docs = products.map(productToMeilisearchDoc)
    
    const task = await index.addDocuments(docs)
    console.log(`Batch indexing task created: ${task.taskUid}`)
    return task
  } catch (error) {
    console.error('Error batch indexing products:', error)
    throw error
  }
}

// Remove a product from the index
export const removeProductFromIndex = async (productId: string) => {
  try {
    const index = getProductsIndex()
    await index.deleteDocument(productId)
    console.log(`Product ${productId} removed from index`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.warn(`Error removing product ${productId} from index (using mock):`, msg)
    // Don't throw error for mock client
  }
}

// Clear all products from the index
export const clearProductsIndex = async () => {
  try {
    const index = getProductsIndex()
    await index.deleteAllDocuments()
    console.log('Products index cleared')
  } catch (error) {
    console.error('Error clearing products index:', error)
    throw error
  }
}

// Get index stats
export const getIndexStats = async () => {
  try {
    const index = getProductsIndex()
    const stats = await index.getStats()
    return stats
  } catch (error) {
    console.error('Error getting index stats:', error)
    throw error
  }
}