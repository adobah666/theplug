'use client';

import { useState, useEffect } from 'react';
import { ProductCard } from './ProductCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type CardProduct = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  brand: string;
  rating: number;
  reviewCount: number;
  inventory: number;
};

interface RelatedProductsProps {
  productId: string;
  category: string;
  className?: string;
}

export function RelatedProducts({ productId, category, className = '' }: RelatedProductsProps) {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/products/search?category=${category}&limit=4&exclude=${productId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch related products:', error);
      } finally {
        setLoading(false);
      }
    };

    if (productId && category) {
      fetchRelatedProducts();
    }
  }, [productId, category]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <h2 className="text-2xl font-bold mb-6">Related Products</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <h2 className="text-2xl font-bold mb-6">Related Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}