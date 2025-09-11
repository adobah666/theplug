'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ProductGrid } from '@/components/product/ProductGrid';
import { FilterSidebar } from '@/components/product/FilterSidebar';
import { MobileFilterDrawer } from '@/components/product/MobileFilterDrawer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Filter, Grid, List } from 'lucide-react';
type ProductListItem = any;

interface BrandPageProps {}

export default function BrandPage({}: BrandPageProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const brand = params.brand as string;
  
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sortBy = searchParams.get('sort') || 'newest';
  const priceRange = searchParams.get('price') || '';
  const category = searchParams.get('category') || '';
  const size = searchParams.get('size') || '';
  const color = searchParams.get('color') || '';

  const brandName = decodeURIComponent(brand).replace(/-/g, ' ');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        const params = new URLSearchParams({
          brand: brandName,
          page: currentPage.toString(),
          limit: '20',
          sort: sortBy
        });

        if (priceRange) params.append('price', priceRange);
        if (category) params.append('category', category);
        if (size) params.append('size', size);
        if (color) params.append('color', color);

        const response = await fetch(`/api/products/search?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const json = await response.json();
        const fetchedProducts = json?.data?.data ?? json?.products ?? [];
        const fetchedTotal = json?.data?.pagination?.total ?? json?.total ?? 0;
        setProducts(fetchedProducts);
        setTotalProducts(fetchedTotal);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [brandName, currentPage, sortBy, priceRange, category, size, color]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalProducts / 20);

  if (loading && products.length === 0) {
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
          { label: 'Brands', href: '/brands' },
          { label: brandName }
        ]}
        className="mb-8"
      />

      {/* Brand Header */}
      <div className="mb-8">
        <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {brandName}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover the latest collection from {brandName}. Quality, style, and innovation in every piece.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop Filters */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>
              
              <p className="text-sm text-gray-600">
                {totalProducts} products found
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('sort', e.target.value);
                  window.history.pushState({}, '', url.toString());
                  window.location.reload();
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : products.length > 0 ? (
            <>
              <ProductGrid products={products} viewMode={viewMode} />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-12">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-2">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No products found for this brand.</p>
              <Button onClick={() => window.location.href = '/'}>
                Browse All Products
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
      />
    </div>
  );
}