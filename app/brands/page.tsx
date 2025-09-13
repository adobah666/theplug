import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';

export const revalidate = 900; // 15 minutes

interface Brand {
  name: string;
  slug: string;
  logo?: string;
  description: string;
  productCount: number;
}

async function getBrands(): Promise<Brand[]> {
  try {
    const hdrs = await headers();
    const host = hdrs.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const base = `${protocol}://${host}`;
    const res = await fetch(`${base}/api/brands`, {
      next: { revalidate }
    });
    if (!res.ok) throw new Error('Failed to fetch brands');
    const json = await res.json();
    let brands: Brand[] = json?.brands ?? [];

    // Fallback: derive brands from products if API returns empty
    if (!brands || brands.length === 0) {
      try {
        const params = new URLSearchParams({ sort: 'createdAt', order: 'desc', page: '1', limit: '100' });
        const prodRes = await fetch(`${base}/api/products/search?${params.toString()}`, { next: { revalidate } });
        const prodJson = await prodRes.json().catch(() => ({} as any));
        const list: any[] = Array.isArray(prodJson?.data?.data) ? prodJson.data.data : [];
        const map = new Map<string, { name: string; slug: string; count: number }>();
        for (const p of list) {
          const name = (p?.brand || '').toString().trim();
          if (!name) continue;
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const prev = map.get(slug) || { name, slug, count: 0 };
          prev.count += 1;
          map.set(slug, prev);
        }
        brands = Array.from(map.values())
          .sort((a, b) => b.count - a.count)
          .map(b => ({ name: b.name, slug: b.slug, description: `Discover the latest collection from ${b.name}.`, productCount: b.count }));
      } catch {}
    }

    return brands;
  } catch {
    return [];
  }
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Brands' }
        ]}
        className="mb-8"
      />

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Our Brands
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover fashion from the world's most trusted and innovative brands. 
          Quality, style, and craftsmanship in every collection.
        </p>
      </div>

      {/* Brands Grid */}
      {brands.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {brands.map((brand) => (
            <Link key={brand.slug} href={`/brands/${brand.slug}`}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="text-center">
                  {brand.logo ? (
                    <div className="w-20 h-20 mx-auto mb-4 relative">
                      <Image
                        src={brand.logo}
                        alt={`${brand.name} logo`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-600">
                        {brand.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {brand.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {brand.description}
                  </p>
                  
                  <p className="text-sm text-blue-600 font-medium">
                    {brand.productCount} products
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No brands available at the moment.</p>
        </div>
      )}
    </div>
  );
}