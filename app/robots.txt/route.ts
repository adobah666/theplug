import { getBaseUrl } from '@/lib/utils/server'

export async function GET() {
  const baseUrl = getBaseUrl()
  
  const robotsTxt = `User-agent: *
Allow: /

# Important pages
Allow: /products/
Allow: /categories/
Allow: /new-arrivals
Allow: /search

# Block admin and account pages
Disallow: /admin/
Disallow: /account/
Disallow: /checkout/
Disallow: /login
Disallow: /register

# Block API routes
Disallow: /api/

# Block temporary files
Disallow: /_next/
Disallow: /uploads/

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (optional - be respectful)
Crawl-delay: 1`

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    }
  })
}
