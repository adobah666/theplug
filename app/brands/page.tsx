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

async function getBrands(baseUrl: string): Promise<Brand[]> {
  try {
    const res = await fetch(`${baseUrl}/api/brands`, {
      next: { revalidate }
    });
    if (!res.ok) throw new Error('Failed to fetch brands');
    const json = await res.json();
    return json?.brands ?? [];
  } catch {
    return [];
  }
}

export default async function BrandsPage() {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const brands = await getBrands(origin);

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