import Link from 'next/link';
import { headers } from 'next/headers';
import { Metadata } from 'next';
import { ProductGrid } from '@/components/product/ProductGrid';
import { FilterSidebar, FilterSection } from '@/components/product/FilterSidebar';
import { Filter, Grid, List } from 'lucide-react';
import { SortSelect } from '@/components/product/SortSelect';

export const revalidate = 900; // 15 minutes

// Lightweight product type for server rendering into ProductGrid
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
interface PageProps { params: Promise<{ category: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }

// Generate dynamic metadata for category pages
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const sp = searchParams ? await searchParams : {} as Record<string, string | string[] | undefined>;
  const categoryInfo = CATEGORY_INFO[category] || {
    name: category.charAt(0).toUpperCase() + category.slice(1),
    description: `Browse our ${category} collection`,
    image: '/categories/default-banner.jpg',
    subcategories: []
  };

  const subcategory = String(sp.subcategory ?? '');
  const title = subcategory 
    ? `${subcategory.charAt(0).toUpperCase() + subcategory.slice(1)} ${categoryInfo.name} | ThePlugOnline`
    : `${categoryInfo.name} | ThePlugOnline`;
  
  const description = subcategory
    ? `Shop ${subcategory} in our ${categoryInfo.name.toLowerCase()} collection. ${categoryInfo.description}`
    : `${categoryInfo.description} Shop in Ghana with local delivery options.`;

  return {
    title,
    description,
    keywords: `${categoryInfo.name}, ${category}, fashion, clothing, online shopping, Ghana, ThePlugOnline${subcategory ? `, ${subcategory}` : ''}`,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'en_GH',
      siteName: 'ThePlugOnline',
      images: [
        {
          url: categoryInfo.image,
          width: 1200,
          height: 630,
          alt: categoryInfo.name,
        },
      ],
      url: `/categories/${category}${subcategory ? `?subcategory=${subcategory}` : ''}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [categoryInfo.image],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: `/categories/${category}${subcategory ? `?subcategory=${subcategory}` : ''}`,
    },
  };
}

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

async function fetchAll({ baseUrl, category, page, limit, sortBy, price, subcategory, brand, size, color }: { baseUrl: string; category: string; page: number; limit: number; sortBy: string; price?: string; subcategory?: string; brand?: string; size?: string; color?: string; }) {
  const sp = new URLSearchParams({
    category,
    page: String(page),
    limit: String(limit),
    ...mapSort(sortBy),
  });
  if (price) sp.append('price', price);
  if (subcategory) sp.append('subcategory', subcategory);
  if (brand) sp.append('brand', brand);
  if (size) sp.append('size', size);
  if (color) sp.append('color', color);

  const [productsRes, facetsRes, heroRes] = await Promise.all([
    fetch(`${baseUrl}/api/products/search?${sp.toString()}`, { next: { revalidate } }),
    fetch(`${baseUrl}/api/products/facets?category=${encodeURIComponent(category)}`, { next: { revalidate } }),
    fetch(`${baseUrl}/api/products/search?${new URLSearchParams({ category, sort: 'popularity', order: 'desc', page: '1', limit: '4' }).toString()}`, { next: { revalidate } }),
  ]);

  const productsJson = await productsRes.json().catch(() => ({} as any));
  const facetsJson = await facetsRes.json().catch(() => ({} as any));
  const heroJson = await heroRes.json().catch(() => ({} as any));

  const payload = productsJson?.data || {};
  const raw: any[] = payload.data || [];
  const products: UIProduct[] = raw.map((p: any) => ({
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
  const total: number = payload.pagination?.total || 0;

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

  const heroList: any[] = heroJson?.data?.data || [];
  const heroImages: string[] = heroList
    .flatMap((p: any) => (Array.isArray(p?.images) ? p.images : []))
    .filter((src: any) => typeof src === 'string' && src.length > 0)
    .slice(0, 4);

  return { products, total, sections, heroImages };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const awaitedParams = await params;
  const awaitedSearch: Record<string, string | string[] | undefined> = searchParams ? await searchParams : {};

  const category = awaitedParams.category as string;
  const categoryInfo = CATEGORY_INFO[category] || {
    name: category.charAt(0).toUpperCase() + category.slice(1),
    description: `Browse our ${category} collection`,
    image: '/categories/default-banner.jpg',
    subcategories: []
  };

  const sortBy = String(awaitedSearch.sort ?? 'newest');
  const priceRange = String(awaitedSearch.price ?? '');
  const subcategory = String(awaitedSearch.subcategory ?? '');
  const brand = String(awaitedSearch.brand ?? '');
  const size = String(awaitedSearch.size ?? '');
  const color = String(awaitedSearch.color ?? '');
  const page = Number(awaitedSearch.page ?? '1');

  const hdrs = await headers();
  const host = hdrs.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const { products, total, sections, heroImages } = await fetchAll({
    baseUrl,
    category,
    page: isNaN(page) ? 1 : page,
    limit: 20,
    sortBy,
    price: priceRange || undefined,
    subcategory: subcategory || undefined,
    brand: brand || undefined,
    size: size || undefined,
    color: color || undefined,
  });

  const totalPages = Math.ceil(total / 20);

  // Build safe string hrefs (avoid passing non-plain objects to Client Components)
  const toURLSearchParams = (sp: Record<string, string | string[] | undefined>) => {
    const usp = new URLSearchParams();
    for (const [key, val] of Object.entries(sp)) {
      if (typeof val === 'string') {
        if (val !== undefined && val !== null && val !== '') usp.set(key, val);
      } else if (Array.isArray(val)) {
        for (const v of val) {
          if (v !== undefined && v !== null && v !== '') usp.append(key, String(v));
        }
      }
    }
    return usp;
  };
  const buildHref = (base: string, overrides: Record<string, string | undefined> = {}) => {
    const usp = toURLSearchParams(awaitedSearch);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === null || v === '') usp.delete(k);
      else usp.set(k, v);
    }
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  };

  // Generate structured data for the category page
  const categoryStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": categoryInfo.name,
    "description": categoryInfo.description,
    "url": `${baseUrl}/categories/${category}`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": total,
      "itemListElement": products.slice(0, 10).map((product, index) => ({
        "@type": "Product",
        "position": index + 1,
        "name": product.name,
        "description": product.description,
        "image": product.images[0],
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": "GHS",
          "availability": product.inventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
      }))
    }
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": categoryInfo.name,
        "item": `${baseUrl}/categories/${category}`
      },
      ...(subcategory ? [{
        "@type": "ListItem",
        "position": 3,
        "name": subcategory.charAt(0).toUpperCase() + subcategory.slice(1),
        "item": `${baseUrl}/categories/${category}?subcategory=${subcategory}`
      }] : [])
    ]
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-6">
        <Link href="/" className="inline-flex items-center leading-none hover:text-gray-900">Home</Link>
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
            <Link
              href={`/categories/${category}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !subcategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </Link>
            {categoryInfo.subcategories.map((sub) => (
              <Link
                key={sub}
                href={`/categories/${category}?subcategory=${sub}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                  subcategory === sub
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sub}
              </Link>
            ))}
          </div>
        )}
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
                href={buildHref(`/categories/${category}`, { filters: 'open' })}
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
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center border border-gray-300 rounded-md opacity-60 pointer-events-none">
                <button className={`p-2 bg-blue-600 text-white`}>
                  <Grid className="w-4 h-4" />
                </button>
                <button className={`p-2 text-gray-600`}>
                  <List className="w-4 h-4" />
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
                      href={buildHref(`/categories/${category}`, { page: String(Math.max(1, page - 1)) })}
                      className={`px-3 py-1.5 text-sm border rounded ${page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
                    >
                      Previous
                    </Link>
                    {(() => {
                      const maxVisible = 5;
                      let start = Math.max(1, page - Math.floor(maxVisible / 2));
                      let end = Math.min(totalPages, start + maxVisible - 1);

                      // Adjust start if we're near the end
                      if (end - start < maxVisible - 1) {
                        start = Math.max(1, end - maxVisible + 1);
                      }

                      const pages = [];
                      for (let p = start; p <= end; p++) {
                        const active = p === page;
                        pages.push(
                          <Link
                            key={p}
                            href={buildHref(`/categories/${category}`, { page: String(p) })}
                            className={`px-3 py-1.5 text-sm border rounded ${active ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                          >
                            {p}
                          </Link>
                        );
                      }
                      return pages;
                    })()}
                    <Link
                      href={buildHref(`/categories/${category}`, { page: String(Math.min(totalPages, page + 1)) })}
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
              <p className="text-gray-600 mb-4">No products found in this category.</p>
              <Link href="/" className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Browse All Products</Link>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}