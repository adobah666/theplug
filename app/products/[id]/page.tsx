import { headers } from 'next/headers';
import ProductPageClient, { UIProduct, UIItem } from '@/components/product/ProductPageClient';

export const revalidate = 900; // 15 minutes for better performance
export const dynamic = 'force-static'; // Enable static generation with ISR

type PageParams = { id: string } | Promise<{ id: string }>;
type PageProps = { params: PageParams };

async function fetchJSON<T>(url: string, retries = 3): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { 
        next: { revalidate: 900 }, // Cache for 15 minutes
        cache: 'force-cache', // Use cache when available
        headers: {
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=900',
        }
      });
      
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        const error = new Error((json as any)?.error || `Request failed with status ${res.status}`);
        lastError = error;
        
        // Don't retry on 404 or client errors, only on server errors
        if (res.status >= 400 && res.status < 500) {
          throw error;
        }
        
        // Wait before retrying on server errors
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
          continue;
        }
        throw error;
      }
      
      return json as T;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors or if it's the last attempt
      if (attempt === retries || (error as any)?.status < 500) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

function normalizeProduct(raw: any): UIProduct {
  const imgs = Array.isArray(raw?.images) ? raw.images : (raw?.images ? [raw.images] : []);
  const product: UIProduct = {
    _id: String(raw?._id || raw?.id || ''),
    name: raw?.name || '',
    description: raw?.description || '',
    price: Number(raw?.price || 0),
    images: imgs.filter(Boolean),
    category: raw?.category,
    brand: raw?.brand,
    rating: raw?.rating ?? 0,
    reviewCount: raw?.reviewCount ?? 0,
    inventory: raw?.inventory ?? 0,
    variants: raw?.variants || [],
    originalPrice: raw?.originalPrice,
  };
  return product;
}

function normalizeItems(list: any[]): UIItem[] {
  return (list || []).map((p: any) => {
    const images = Array.isArray(p?.images) ? p.images : (p?.image ? [p.image] : []);
    return {
      _id: String(p?._id || p?.id || ''),
      name: p?.name || '',
      price: Number(p?.price || 0),
      images,
      brand: p?.brand || p?.category?.name || '',
      rating: p?.rating ?? 0,
      reviewCount: p?.reviewCount ?? 0,
      inventory: p?.inventory ?? 0,
    } as UIItem;
  });
}

export default async function ProductPage({ params }: PageProps) {
  // Support both synchronous and Promise-based params (Next.js dynamic APIs)
  let id: string;
  const maybe: any = params as any;
  if (maybe && typeof maybe.then === 'function') {
    const resolved = await (params as Promise<{ id: string }>);
    id = resolved.id;
  } else {
    id = (params as { id: string }).id;
  }
  const hdrs = await headers();
  const host = hdrs.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // Fetch product with enhanced error handling
  let product: UIProduct | null = null;
  let fetchError: string | null = null;
  
  try {
    const pj = await fetchJSON<any>(`${baseUrl}/api/products/${id}`);
    const raw = (pj as any)?.data?.product || (pj as any)?.product || pj;
    
    if (!raw || !raw._id) {
      fetchError = 'Product data is incomplete';
      product = null;
    } else {
      product = normalizeProduct(raw);
    }
  } catch (e) {
    console.error(`Failed to fetch product ${id}:`, e);
    fetchError = e instanceof Error ? e.message : 'Unknown error occurred';
    product = null;
  }

  if (!product) {
    // Return a simple error page since we can't use client components in server components
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center">
          <div className="text-gray-700 text-lg mb-4">Product not found</div>
          {fetchError && process.env.NODE_ENV === 'development' && (
            <div className="text-sm text-gray-500 max-w-md mb-4">
              Debug info: {fetchError}
            </div>
          )}
          <div className="text-sm text-gray-600">
            Please try refreshing the page or check the URL.
          </div>
        </div>
      </div>
    );
  }

  // Prepare queries for related and suggestions
  const categorySlug = typeof (product as any).category === 'string' ? (product as any).category : ((product as any).category?.slug || '');
  const categoryName = typeof (product as any).category === 'string' ? (product as any).category : ((product as any).category?.name || '');
  const category = categorySlug || categoryName;

  // Fetch related and suggested products in parallel for better performance
  let relatedItems: UIItem[] = [];
  let suggestedItems: UIItem[] = [];
  
  // Use Promise.allSettled to fetch all data in parallel without blocking
  const [relatedResult, suggestedResult] = await Promise.allSettled([
    // Related products
    (async () => {
      try {
        const relatedParams = new URLSearchParams({ category, limit: String(16), sort: 'popularity' });
        const relatedRes = await fetchJSON<any>(`${baseUrl}/api/products/search?${relatedParams.toString()}`);
        const relatedList: any[] = Array.isArray(relatedRes?.products)
          ? relatedRes.products
          : Array.isArray(relatedRes?.data?.data)
            ? relatedRes.data.data
            : Array.isArray(relatedRes?.data)
              ? relatedRes.data
              : [];
        return normalizeItems(relatedList).filter(p => p._id !== product!._id).slice(0, 16);
      } catch {
        return [];
      }
    })(),

    // Suggested products (optimized with fewer API calls)
    (async () => {
      try {
        const layers: UIItem[] = [];
        const seen = new Set<string>([product._id]);
        
        // Fetch multiple product sets in parallel
        const queries = [];
        
        if (category && product.brand) {
          queries.push(
            fetchJSON<any>(`${baseUrl}/api/products/search?${new URLSearchParams({ category, brand: product.brand, limit: '16', sort: 'popularity' }).toString()}`)
          );
        }
        
        if (category) {
          queries.push(
            fetchJSON<any>(`${baseUrl}/api/products/search?${new URLSearchParams({ category, limit: '16', sort: 'popularity' }).toString()}`)
          );
        }
        
        // Execute queries in parallel
        const results = await Promise.allSettled(queries);
        
        // Process results
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const list: any[] = Array.isArray(result.value?.products) 
              ? result.value.products 
              : Array.isArray(result.value?.data?.data) 
                ? result.value.data.data 
                : Array.isArray(result.value?.data) 
                  ? result.value.data 
                  : [];
            
            for (const p of normalizeItems(list)) {
              if (!seen.has(p._id) && layers.length < 16) {
                seen.add(p._id);
                layers.push(p);
              }
            }
          }
        }
        
        return layers.slice(0, 16);
      } catch {
        return [];
      }
    })()
  ]);
  
  // Extract results from Promise.allSettled
  if (relatedResult.status === 'fulfilled') {
    relatedItems = relatedResult.value;
  }
  
  if (suggestedResult.status === 'fulfilled') {
    suggestedItems = suggestedResult.value;
  }

  return (
    <ProductPageClient product={product} relatedItems={relatedItems} suggestedItems={suggestedItems} />
  );
}