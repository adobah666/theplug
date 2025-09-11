'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ProductGrid } from '@/components/product/ProductGrid';
import { FilterSidebar } from '@/components/product/FilterSidebar';
import { MobileFilterDrawer } from '@/components/product/MobileFilterDrawer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Button } from '@/components/ui/Button';
import { Filter, Grid, List } from 'lucide-react';
// Lightweight product type for client rendering
type UIProduct = {
  _id: string
  name: string
  description?: string
  price: number
  images: string[]
  category?: { _id: string; name: string; slug: string }
  brand: string
  rating: number
  reviewCount: number
  inventory: number
}

interface CategoryPageProps {}

interface CategoryInfo {
  name: string;
  description: string;
  image: string;
  subcategories: string[];
}

const CATEGORY_INFO: Record<string, CategoryInfo> = {
  'men': {
    name: "Men's Fashion",
    description: "Discover the latest trends in men's clothing, from casual wear to formal attire.",
    image: '/categories/men-banner.jpg',
    subcategories: ['shirts', 'pants', 'shoes', 'accessories', 'suits', 'casual']
  },
  'women': {
    name: "Women's Fashion",
    description: "Explore our curated collection of women's fashion for every occasion.",
    image: '/categories/women-banner.jpg',
    subcategories: ['dresses', 'tops', 'bottoms', 'shoes', 'accessories', 'bags']
  },
  'kids': {
    name: "Kids' Fashion",
    description: "Comfortable and stylish clothing for children of all ages.",
    image: '/categories/kids-banner.jpg',
    subcategories: ['boys', 'girls', 'baby', 'shoes', 'accessories']
  },
  'accessories': {
    name: 'Accessories',
    description: 'Complete your look with our range of fashion accessories.',
    image: '/categories/accessories-banner.jpg',
    subcategories: ['bags', 'jewelry', 'watches', 'belts', 'hats', 'sunglasses']
  }
};

export default function CategoryPage({}: CategoryPageProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = params.category as string;
  
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  const categoryInfo = CATEGORY_INFO[category] || {
    name: category.charAt(0).toUpperCase() + category.slice(1),
    description: `Browse our ${category} collection`,
    image: '/categories/default-banner.jpg',
    subcategories: []
  };

  const sortBy = searchParams.get('sort') || 'newest';
  const priceRange = searchParams.get('price') || '';
  const subcategory = searchParams.get('subcategory') || '';
  const brand = searchParams.get('brand') || '';
  const size = searchParams.get('size') || '';
  const color = searchParams.get('color') || '';

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        const params = new URLSearchParams({
          category,
          page: currentPage.toString(),
          limit: '20',
          // Map UI sort to API sort/order
          // UI: newest | price-low | price-high | rating | popular
          // API expects: sort=[createdAt|price|rating|popularity] and optional order=[asc|desc]
          // We'll set defaults here; order can be appended conditionally below.
          sort: ((): string => {
            switch (sortBy) {
              case 'newest': return 'createdAt';
              case 'price-low': return 'price';
              case 'price-high': return 'price';
              case 'rating': return 'rating';
              case 'popular': return 'popularity';
              default: return 'createdAt';
            }
          })()
        });
        if (sortBy === 'price-low') params.append('order', 'asc');
        if (sortBy === 'price-high') params.append('order', 'desc');
        if (sortBy === 'newest') params.append('order', 'desc');
        if (sortBy === 'rating') params.append('order', 'desc');
        if (sortBy === 'popular') params.append('order', 'desc');

        if (priceRange) params.append('price', priceRange);
        if (subcategory) params.append('subcategory', subcategory);
        if (brand) params.append('brand', brand);
        if (size) params.append('size', size);
        if (color) params.append('color', color);

        const response = await fetch(`/api/products/search?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        const payload = data?.data || {};
        const raw: any[] = payload.data || [];
        const normalized: UIProduct[] = raw.map((p: any) => ({
          _id: p._id,
          name: p.name,
          description: p.description,
          price: p.price,
          images: p.images || [],
          brand: p.brand || '',
          rating: p.rating ?? 0,
          reviewCount: p.reviewCount ?? 0,
          inventory: p.inventory ?? 0,
          category: p.category ? {
            _id: p.category._id?.toString?.() || p.category._id || '',
            name: p.category.name || '',
            slug: p.category.slug || ''
          } : undefined,
        }))
        setProducts(normalized);
        setTotalProducts(payload.pagination?.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category, currentPage, sortBy, priceRange, subcategory, brand, size, color]);

  // Fetch top popular items for hero collage
  useEffect(() => {
    const fetchHero = async () => {
      try {
        const params = new URLSearchParams({
          category,
          sort: 'popularity',
          order: 'desc',
          page: '1',
          limit: '4'
        })
        const res = await fetch(`/api/products/search?${params.toString()}`, { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        const list: any[] = json?.data?.data || []
        const imgs: string[] = list
          .flatMap((p: any) => (Array.isArray(p?.images) ? p.images : []))
          .filter((src: any) => typeof src === 'string' && src.length > 0)
          .slice(0, 4)
        setHeroImages(imgs)
      } catch {
        setHeroImages([])
      }
    }
    fetchHero()
  }, [category])

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
      <nav className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-6">
        <a href="/" className="inline-flex items-center leading-none hover:text-gray-900">Home</a>
        <span className="px-1 text-gray-400 leading-none">/</span>
        <span className="inline-flex items-center leading-none text-gray-900">{categoryInfo.name}</span>
        {subcategory && (
          <>
            <span className="px-1 text-gray-400 leading-none">/</span>
            <span className="inline-flex items-center leading-none text-gray-900 capitalize">{subcategory}</span>
          </>
        )}
      </nav>

      {/* Category Header */}
      <div className="mb-8">
        <div className="relative h-48 md:h-64 lg:h-72 rounded-lg overflow-hidden mb-6 bg-gray-200">
          {/* Collage background */}
          <div className="absolute inset-0">
            {heroImages.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 h-full w-full">
                {(heroImages.length ? heroImages : [categoryInfo.image]).map((src, i) => (
                  <div
                    key={`hero-img-${i}`}
                    className="h-full w-full bg-center bg-cover"
                    style={{ backgroundImage: `url(${src})` }}
                  />
                ))}
              </div>
            ) : (
              <div
                className="h-full w-full bg-center bg-cover"
                style={{ backgroundImage: `url(${categoryInfo.image})` }}
              />
            )}
          </div>

          {/* Blur + dark overlay */}
          <div className="absolute inset-0 backdrop-blur-sm">
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Title/description overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h1 className="text-3xl md:text-5xl font-bold mb-2">{categoryInfo.name}</h1>
              <p className="text-base md:text-xl opacity-90">{categoryInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Subcategories */}
        {categoryInfo.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <a
              href={`/categories/${category}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !subcategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </a>
            {categoryInfo.subcategories.map((sub) => (
              <a
                key={sub}
                href={`/categories/${category}?subcategory=${sub}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                  subcategory === sub
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sub}
              </a>
            ))}
          </div>
        )}
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
                  router.push(url.pathname + '?' + url.searchParams.toString());
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
              <p className="text-gray-600 mb-4">No products found in this category.</p>
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