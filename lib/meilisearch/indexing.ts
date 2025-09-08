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
    id: product._id.toString(),
    name: product.name,
    description: product.description,
    brand: product.brand,
    category: product.category?.toString() || '',
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
      'searchableText'
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
    console.warn('Error initializing products index (using mock):', error.message)
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
    console.warn(`Error indexing product ${product._id} (using mock):`, error.message)
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
    console.warn(`Error removing product ${productId} from index (using mock):`, error.message)
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