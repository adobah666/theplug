export { default as client, getProductsIndex, PRODUCTS_INDEX } from './client'
export {
  initializeProductsIndex,
  indexProduct,
  indexProducts,
  removeProductFromIndex,
  clearProductsIndex,
  getIndexStats,
  productToMeilisearchDoc,
  type MeilisearchProduct
} from './indexing'
export {
  searchProducts,
  getSearchSuggestions,
  getFacetValues,
  type ProductSearchParams,
  type ProductSearchResults
} from './search'