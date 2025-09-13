import { headers } from 'next/headers';
import ProductPageClient, { UIProduct, UIItem } from '@/components/product/ProductPageClient';

export const revalidate = 900; // 15 minutes

type PageProps = { params: { id: string } };

async function fetchJSON<T>(url: string) {
  const res = await fetch(url, { next: { revalidate } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error || 'Request failed');
  return json as T;
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
  const id = params.id;
  const hdrs = await headers();
  const host = hdrs.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // Fetch product
  let product: UIProduct | null = null;
  try {
    const pj = await fetchJSON<any>(`${baseUrl}/api/products/${id}`);
    const raw = (pj as any)?.data?.product || (pj as any)?.product || pj;
    product = normalizeProduct(raw);
  } catch (e) {
    product = null;
  }

  if (!product) {
    // Render a minimal error from the client component for consistency
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="min-h-[40vh] flex items-center justify-center text-gray-700">Product not found</div>
      </div>
    );
  }

  // Prepare queries for related and suggestions
  const categorySlug = typeof (product as any).category === 'string' ? (product as any).category : ((product as any).category?.slug || '');
  const categoryName = typeof (product as any).category === 'string' ? (product as any).category : ((product as any).category?.name || '');
  const category = categorySlug || categoryName;

  // Fetch related and suggested on the server
  let relatedItems: UIItem[] = [];
  let suggestedItems: UIItem[] = [];
  try {
    const relatedParams = new URLSearchParams({ category, limit: String(32), sort: 'popularity' });
    const relatedRes = await fetchJSON<any>(`${baseUrl}/api/products/search?${relatedParams.toString()}`);
    const relatedList: any[] = Array.isArray(relatedRes?.products)
      ? relatedRes.products
      : Array.isArray(relatedRes?.data?.data)
        ? relatedRes.data.data
        : Array.isArray(relatedRes?.data)
          ? relatedRes.data
          : [];
    relatedItems = normalizeItems(relatedList).filter(p => p._id !== product!._id).slice(0, 16);
  } catch {}

  try {
    const layers: UIItem[] = [];
    const seen = new Set<string>([product._id]);
    // Same category + brand
    if (category && product.brand) {
      const qs = new URLSearchParams({ category, brand: product.brand, limit: String(32), sort: 'popularity' });
      const r = await fetchJSON<any>(`${baseUrl}/api/products/search?${qs.toString()}`);
      const list: any[] = Array.isArray(r?.products) ? r.products : (Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : []));
      for (const p of normalizeItems(list)) { if (!seen.has(p._id)) { seen.add(p._id); layers.push(p); } if (layers.length >= 16) break; }
    }
    // Same category only
    if (layers.length < 16 && category) {
      const qs = new URLSearchParams({ category, limit: String(32), sort: 'popularity' });
      const r = await fetchJSON<any>(`${baseUrl}/api/products/search?${qs.toString()}`);
      const list: any[] = Array.isArray(r?.products) ? r.products : (Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : []));
      for (const p of normalizeItems(list)) { if (!seen.has(p._id)) { seen.add(p._id); layers.push(p); } if (layers.length >= 16) break; }
    }
    // Same brand only
    if (layers.length < 16 && product.brand) {
      const qs = new URLSearchParams({ brand: product.brand, limit: String(32), sort: 'popularity' });
      const r = await fetchJSON<any>(`${baseUrl}/api/products/search?${qs.toString()}`);
      const list: any[] = Array.isArray(r?.products) ? r.products : (Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : []));
      for (const p of normalizeItems(list)) { if (!seen.has(p._id)) { seen.add(p._id); layers.push(p); } if (layers.length >= 16) break; }
    }
    // Fallback trending
    if (layers.length < 16) {
      try {
        const t = await fetchJSON<any>(`${baseUrl}/api/trending?limit=32`);
        const dataArr: any[] = Array.isArray(t?.data) ? t.data : [];
        for (const tItem of dataArr) {
          const mapped: UIItem = {
            _id: String(tItem.id || tItem._id || ''),
            name: tItem.name,
            price: Number(tItem.price || 0),
            images: Array.isArray(tItem.images) ? tItem.images : (tItem.image ? [tItem.image] : []),
            brand: tItem.brand || tItem.category,
            rating: tItem.rating,
            reviewCount: tItem.reviewCount,
            inventory: tItem.inventory ?? 0,
          };
          if (!seen.has(mapped._id)) { seen.add(mapped._id); layers.push(mapped); }
          if (layers.length >= 16) break;
        }
      } catch {}
    }
    suggestedItems = layers.slice(0, 16);
  } catch {}

  return (
    <ProductPageClient product={product} relatedItems={relatedItems} suggestedItems={suggestedItems} />
  );
}