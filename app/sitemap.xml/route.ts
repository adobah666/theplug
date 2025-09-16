import { getBaseUrl } from '@/lib/utils/server'

export async function GET() {
  const baseUrl = getBaseUrl()
  
  try {
    // Fetch categories for dynamic sitemap
    const categoriesRes = await fetch(`${baseUrl}/api/categories`, { 
      next: { revalidate: 86400 } // Cache for 24 hours
    })
    const categoriesData = await categoriesRes.json().catch(() => ({ data: { categories: [] } }))
    const categories = categoriesData?.data?.categories || []

    // Fetch recent products for sitemap (limit to 1000 for performance)
    const productsRes = await fetch(`${baseUrl}/api/products/search?limit=1000&sort=createdAt&order=desc`, {
      next: { revalidate: 86400 }
    })
    const productsData = await productsRes.json().catch(() => ({ data: { data: [] } }))
    const products = productsData?.data?.data || []

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/new-arrivals</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <!-- Category Pages -->
  ${categories.map((category: any) => `
  <url>
    <loc>${baseUrl}/categories/${category.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  
  <!-- Product Pages -->
  ${products.map((product: any) => `
  <url>
    <loc>${baseUrl}/products/${product._id}</loc>
    <lastmod>${product.updatedAt || product.createdAt || new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}
</urlset>`

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    
    // Fallback minimal sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

    return new Response(fallbackSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  }
}
