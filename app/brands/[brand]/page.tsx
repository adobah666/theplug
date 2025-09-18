import Link from 'next/link';
import { headers } from 'next/headers';
import { ProductGrid } from '@/components/product/ProductGrid';
import { FilterSidebar, FilterSection } from '@/components/product/FilterSidebar';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Filter, Grid, List } from 'lucide-react';
import { SortSelect } from '@/components/product/SortSelect';

export const revalidate = 900; // 15 minutes

type ProductListItem = any;

function mapSort(sortBy: string): { sort: string; order?: string } {
  switch (sortBy) {
    case 'price-low':
      return { sort: 'price', order: 'asc' };
    case 'price-high':
      return { sort: 'price', order: 'desc' };
    case 'rating':
      return { sort: 'rating', order: 'desc' };
    case 'popular':
      return { sort: 'popularity', order: 'desc' };
    case 'newest':
    default:
      return { sort: 'createdAt', order: 'desc' };
  }
}

async function fetchProductsAndFacets(params: { baseUrl: string; brandName: string; page: number; limit: number; sortBy: string; price?: string; category?: string; size?: string; color?: string; }) {
  const { baseUrl, brandName, page, limit, sortBy, price, category, size, color } = params;

  const sp = new URLSearchParams({
    brand: brandName,
    page: String(page),
    limit: String(limit),
    ...mapSort(sortBy),
  });
  if (price) sp.append('price', price);
  if (category) sp.append('category', category);
  if (size) sp.append('size', size);
  if (color) sp.append('color', color);

  const [productsRes, facetsRes] = await Promise.all([
    fetch(`${baseUrl}/api/products/search?${sp.toString()}`, { next: { revalidate } }),
    fetch(`${baseUrl}/api/products/facets?brand=${encodeURIComponent(brandName)}`, { next: { revalidate } })
  ]);

  if (!productsRes.ok) {
    console.error('Failed to fetch products:', productsRes.status);
  }
  if (!facetsRes.ok) {
    console.error('Failed to fetch facets:', facetsRes.status);
  }

  const productsJson = await productsRes.json().catch(() => ({} as any));
  const facetsJson = await facetsRes.json().catch(() => ({} as any));

  const products: ProductListItem[] = productsJson?.data?.data ?? productsJson?.products ?? [];
  const total: number = productsJson?.data?.pagination?.total ?? productsJson?.total ?? 0;

  const data = facetsJson?.data || {};
  const sections: FilterSection[] = [
    { key: 'category', title: 'Category', type: 'radio', options: (data.categories || []).map((c: any) => ({ value: c.slug, label: c.name, count: c.count })) },
    { key: 'brand', title: 'Brand', type: 'checkbox', options: (data.brands || []).map((b: any) => ({ value: b.name, label: b.name, count: b.count })) },
    { key: 'price', title: 'Price Range', type: 'range', min: 0, max: 1000000 },
    { key: 'size', title: 'Size', type: 'checkbox', options: (data.sizes || []).map((s: any) => ({ value: s.value, label: String(s.value).toUpperCase(), count: s.count })) },
    { key: 'color', title: 'Color', type: 'checkbox', options: (data.colors || []).map((c: any) => ({ value: c.value, label: c.value.charAt(0).toUpperCase() + c.value.slice(1), count: c.count })) },
    { key: 'rating', title: 'Customer Rating', type: 'radio', options: [
      { value: '4', label: '4 Stars & Up' },
      { value: '3', label: '3 Stars & Up' },
      { value: '2', label: '2 Stars & Up' },
      { value: '1', label: '1 Star & Up' },
    ]},
  ];

  return { products, total, sections };
}

interface PageProps { params: Promise<{ brand: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { brand: slug } = await params;
  let spAll: Record<string, string | string[] | undefined> = {};
  if (searchParams && typeof (searchParams as any).then === 'function') {
    spAll = await searchParams as Record<string, string | string[] | undefined>;
  }
  const brandName = decodeURIComponent(slug).replace(/-/g, ' ');

  const sortBy = String(spAll.sort ?? 'newest');
  const priceRange = String(spAll.price ?? '');
  const category = String(spAll.category ?? '');
  const size = String(spAll.size ?? '');
  const color = String(spAll.color ?? '');
  const page = Number(spAll.page ?? '1');

  const hdrs = await headers();
  const host = hdrs.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const { products, total, sections } = await fetchProductsAndFacets({
    baseUrl,
    brandName,
    page: isNaN(page) ? 1 : page,
    limit: 20,
    sortBy,
    price: priceRange || undefined,
    category: category || undefined,
    size: size || undefined,
    color: color || undefined,
  });

  const totalPages = Math.ceil(total / 20);

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
          <FilterSidebar serverSections={sections} />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <Link
                href={{ pathname: `/brands/${slug}`, query: { ...spAll, filters: 'open' } }}
                className="lg:hidden inline-flex items-center space-x-2 border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Link>
              
              <p className="text-sm text-gray-600">
                {total} products found
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle - non-functional placeholder server-side */}
              <div className="hidden sm:flex items-center border border-gray-300 rounded-md opacity-60 pointer-events-none">
                <button className={`p-2 bg-blue-600 text-white`}>
                  <Grid className="w-4 h-4" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <SortSelect value={sortBy} />
            </div>
          </div>

          {/* Products Grid */}
          {products.length > 0 ? (
            <>
              <ProductGrid products={products} viewMode={'grid'} />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-12">
                  <div className="flex items-center space-x-2">
                    <Link
                      href={{ pathname: `/brands/${slug}`, query: { ...spAll, page: String(Math.max(1, page - 1)) } }}
                      className={`px-3 py-1.5 text-sm border rounded ${page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
                    >
                      Previous
                    </Link>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const p = i + 1;
                      const active = p === page;
                      return (
                        <Link
                          key={p}
                          href={{ pathname: `/brands/${slug}`, query: { ...spAll, page: String(p) } }}
                          className={`px-3 py-1.5 text-sm border rounded ${active ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                        >
                          {p}
                        </Link>
                      );
                    })}
                    <Link
                      href={{ pathname: `/brands/${slug}`, query: { ...spAll, page: String(Math.min(totalPages, page + 1)) } }}
                      className={`px-3 py-1.5 text-sm border rounded ${page >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
                    >
                      Next
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No products found for this brand.</p>
              <Link href="/" className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Browse All Products</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}