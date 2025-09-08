'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';

interface Brand {
  name: string;
  slug: string;
  logo?: string;
  description: string;
  productCount: number;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/brands');
        
        if (!response.ok) {
          throw new Error('Failed to fetch brands');
        }

        const data = await response.json();
        setBrands(data.brands || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load brands');
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error} />
      </div>
    );
  }

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