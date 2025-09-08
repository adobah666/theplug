import { Suspense } from 'react'
import { Hero } from '@/components/layout/Hero'
import { FeaturedProducts } from '@/components/product/FeaturedProducts'
import { CategoryShowcase } from '@/components/layout/CategoryShowcase'
import { PromotionalBanner } from '@/components/layout/PromotionalBanner'
import { Newsletter } from '@/components/layout/Newsletter'
import { Testimonials } from '@/components/layout/Testimonials'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

// This would typically come from an API
async function getFeaturedProducts() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  return [
    {
      id: '1',
      name: 'Summer Floral Dress',
      price: 25000,
      originalPrice: 35000,
      image: '/images/products/dress-1.jpg',
      category: 'Clothing',
      rating: 4.8,
      reviewCount: 124,
      isNew: true,
      isOnSale: true
    },
    {
      id: '2',
      name: 'Classic Denim Jacket',
      price: 18000,
      image: '/images/products/jacket-1.jpg',
      category: 'Clothing',
      rating: 4.6,
      reviewCount: 89,
      isNew: false,
      isOnSale: false
    },
    {
      id: '3',
      name: 'Leather Ankle Boots',
      price: 32000,
      originalPrice: 40000,
      image: '/images/products/boots-1.jpg',
      category: 'Shoes',
      rating: 4.9,
      reviewCount: 156,
      isNew: false,
      isOnSale: true
    },
    {
      id: '4',
      name: 'Gold Chain Necklace',
      price: 15000,
      image: '/images/products/necklace-1.jpg',
      category: 'Accessories',
      rating: 4.7,
      reviewCount: 67,
      isNew: true,
      isOnSale: false
    },
    {
      id: '5',
      name: 'Casual Sneakers',
      price: 22000,
      image: '/images/products/sneakers-1.jpg',
      category: 'Shoes',
      rating: 4.5,
      reviewCount: 203,
      isNew: false,
      isOnSale: false
    },
    {
      id: '6',
      name: 'Designer Handbag',
      price: 45000,
      originalPrice: 55000,
      image: '/images/products/handbag-1.jpg',
      category: 'Accessories',
      rating: 4.8,
      reviewCount: 91,
      isNew: true,
      isOnSale: true
    }
  ]
}

async function getCategories() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 50))
  
  return [
    {
      id: 'clothing',
      name: 'Clothing',
      description: 'Discover the latest trends in fashion',
      image: '/images/categories/clothing.jpg',
      href: '/search?category=clothing',
      productCount: 1250,
      isPopular: true
    },
    {
      id: 'shoes',
      name: 'Shoes',
      description: 'Step up your style game',
      image: '/images/categories/shoes.jpg',
      href: '/search?category=shoes',
      productCount: 850,
      isPopular: true
    },
    {
      id: 'accessories',
      name: 'Accessories',
      description: 'Complete your look with perfect accessories',
      image: '/images/categories/accessories.jpg',
      href: '/search?category=accessories',
      productCount: 650
    }
  ]
}

interface HomePageContentProps {
  featuredProducts: Awaited<ReturnType<typeof getFeaturedProducts>>
  categories: Awaited<ReturnType<typeof getCategories>>
}

function HomePageContent({ featuredProducts, categories }: HomePageContentProps) {
  // Prepare hero featured products (first 4 products)
  const heroProducts = featuredProducts.slice(0, 4).map(product => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    href: `/products/${product.id}`
  }))

  return (
    <>
      {/* Hero Section */}
      <Hero featuredProducts={heroProducts} />

      {/* Promotional Banner */}
      <PromotionalBanner />

      {/* Featured Products */}
      <FeaturedProducts 
        products={featuredProducts}
        title="Trending Now"
        subtitle="Discover what's popular with our customers this week"
      />

      {/* Category Showcase */}
      <CategoryShowcase 
        categories={categories}
        title="Shop by Category"
        subtitle="Find exactly what you're looking for in our curated collections"
      />

      {/* Customer Testimonials */}
      <Testimonials />

      {/* Newsletter Signup */}
      <Newsletter />
    </>
  )
}

export default async function Home() {
  try {
    // Fetch data in parallel
    const [featuredProducts, categories] = await Promise.all([
      getFeaturedProducts(),
      getCategories()
    ])

    return (
      <div className="min-h-screen">
        <Suspense 
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <HomePageContent 
            featuredProducts={featuredProducts}
            categories={categories}
          />
        </Suspense>
      </div>
    )
  } catch (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage 
          message="Failed to load homepage content. Please try refreshing the page." 
        />
      </div>
    )
  }
}
