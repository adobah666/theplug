# Meilisearch Integration

This directory contains the Meilisearch integration for fast product search and filtering in the fashion ecommerce platform.

## Overview

Meilisearch is a fast, open-source search engine that provides instant search results with typo tolerance, filtering, and faceting capabilities. This integration allows for:

- Fast full-text search across product names, descriptions, and brands
- Advanced filtering by category, price, rating, size, color, and stock status
- Sorting by price, rating, date, and popularity
- Search suggestions and autocomplete
- Faceted search with dynamic filter options

## Architecture

### Components

1. **Client** (`client.ts`) - Meilisearch client configuration with fallback to mock client
2. **Indexing** (`indexing.ts`) - Product indexing utilities and automatic sync
3. **Search** (`search.ts`) - Search and filtering functions
4. **Mock Client** (`mock-client.ts`) - Development fallback when Meilisearch is not available
5. **API Routes** (`/api/products/meilisearch/`) - REST endpoints for search functionality

### Data Flow

```
Product CRUD → MongoDB → Mongoose Hooks → Meilisearch Index → Search API → Frontend
```

## Setup

### 1. Install Meilisearch

#### Option A: Docker (Recommended)
```bash
docker run -it --rm \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=your-meilisearch-master-key \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:v1.5
```

#### Option B: Binary Installation
```bash
# Download and install Meilisearch
curl -L https://install.meilisearch.com | sh

# Start Meilisearch
./meilisearch --master-key=your-meilisearch-master-key
```

### 2. Environment Configuration

Add to your `.env.local`:
```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-meilisearch-master-key
```

### 3. Initialize Index

```bash
# Initialize Meilisearch index and sync existing products
npm run init:meilisearch
```

## Usage

### Search Products

```typescript
import { searchProducts } from '@/lib/meilisearch/search'

const results = await searchProducts({
  query: 'nike shoes',
  category: 'footwear',
  minPrice: 50,
  maxPrice: 200,
  brand: 'Nike',
  size: '10',
  color: 'black',
  minRating: 4.0,
  inStock: true,
  sortBy: 'price_asc',
  page: 1,
  limit: 20
})
```

### Get Search Suggestions

```typescript
import { getSearchSuggestions } from '@/lib/meilisearch/search'

const suggestions = await getSearchSuggestions('nike', 5)
```

### Manual Product Indexing

```typescript
import { indexProduct, indexProducts } from '@/lib/meilisearch/indexing'

// Index single product
await indexProduct(product)

// Index multiple products
await indexProducts([product1, product2, product3])
```

## API Endpoints

### GET /api/products/meilisearch

Search products with query parameters:

- `q` - Search query
- `category` - Filter by category ID
- `brand` - Filter by brand name
- `minPrice` / `maxPrice` - Price range filter
- `size` - Filter by product variant size
- `color` - Filter by product variant color
- `minRating` - Minimum rating filter
- `inStock` - Filter in-stock products only (true/false)
- `sortBy` - Sort order (price_asc, price_desc, rating_desc, newest, oldest, popularity)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)

Example:
```
GET /api/products/meilisearch?q=nike&brand=Nike&minPrice=50&maxPrice=200&sortBy=price_asc&page=1&limit=20
```

### POST /api/products/meilisearch/suggestions

Get search suggestions:

```json
{
  "query": "nike",
  "limit": 5
}
```

## Automatic Indexing

Products are automatically indexed when:

- A new product is created (via Mongoose post-save hook)
- An existing product is updated (via Mongoose post-save hook)
- A product is deleted (via Mongoose post-remove hook)

## Development Mode

When Meilisearch is not available (e.g., in development), the system automatically falls back to a mock client that provides the same API but stores data in memory. This allows development to continue without requiring a Meilisearch installation.

## Testing

```bash
# Test Meilisearch connection
npm run test:meilisearch

# Run integration tests
npm test -- __tests__/lib/meilisearch/meilisearch.test.ts

# Run API tests
npm test -- __tests__/api/products/meilisearch.test.ts
```

## Performance Considerations

1. **Batch Indexing**: Use `indexProducts()` for bulk operations
2. **Index Settings**: Optimized for search performance with proper ranking rules
3. **Pagination**: Always use pagination for large result sets
4. **Caching**: Consider implementing Redis caching for frequently accessed searches

## Monitoring

Monitor Meilisearch performance:

```typescript
import { getIndexStats } from '@/lib/meilisearch/indexing'

const stats = await getIndexStats()
console.log('Documents:', stats.numberOfDocuments)
console.log('Indexing:', stats.isIndexing)
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure Meilisearch is running on the correct port
2. **Index Not Found**: Run `npm run init:meilisearch` to initialize
3. **Slow Searches**: Check index settings and consider adding more filterable attributes
4. **Memory Usage**: Monitor Meilisearch memory usage in production

### Debug Mode

Enable debug logging:
```env
MEILISEARCH_LOG_LEVEL=DEBUG
```

## Production Deployment

1. Use a dedicated Meilisearch instance or Meilisearch Cloud
2. Set up proper authentication with API keys
3. Configure SSL/TLS for secure connections
4. Monitor index size and performance
5. Set up backup and recovery procedures
6. Consider using a reverse proxy for load balancing

## Security

- Never expose the master key in client-side code
- Use search-only API keys for frontend applications
- Implement rate limiting on search endpoints
- Validate and sanitize all search inputs
- Monitor for abuse and unusual search patterns