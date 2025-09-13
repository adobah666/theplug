'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/currency'
import { useCart } from '@/lib/cart/hooks'
import { optimizeImageUrl, isCloudinaryUrl } from '@/lib/utils/images'

interface ProductCardProps {
  product: {
    _id: string
    name: string
    description?: string
    price: number
    images: string[]
    brand: string
    rating: number
    reviewCount: number
    inventory: number
  }
  className?: string
  viewMode?: 'grid' | 'list'
  onAddToCart?: (productId: string) => void
  onAddToWishlist?: (productId: string) => void
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  className,
  viewMode = 'grid',
  onAddToCart,
  onAddToWishlist
}) => {
  // Hooks must be called unconditionally at the top level
  const { state } = useCart()

  const formatPrice = (price: number) => formatCurrency(price)

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg key={i} className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20">
            <defs>
              <linearGradient id={`half-${product._id}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#half-${product._id})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        )
      } else {
        stars.push(
          <svg key={i} className="h-4 w-4 text-gray-300" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      }
    }

    return stars
  }

  if (!product) {
    return null
  }

  // Client-side availability (subtract items already in cart for this product)
  const reservedQty = state.items
    .filter((it) => it.productId === product._id)
    .reduce((sum, it) => sum + (it.quantity || 0), 0)
  const availableQty = Math.max(0, (product.inventory || 0) - reservedQty)
  const isOutOfStock = availableQty === 0

  if (viewMode === 'list') {
    return (
      <Card className={cn('group relative overflow-hidden transition-shadow hover:shadow-lg', className)}>
        <div className="flex">
          {/* Image */}
          <div className="relative w-48 h-48 flex-shrink-0 overflow-hidden">
            <Link href={`/products/${product._id}`}>
              <Image
                src={(() => {
                  const raw = product.images[0] || '/placeholder-product.jpg'
                  return isCloudinaryUrl(raw)
                    ? optimizeImageUrl(raw, { width: 384, height: 384, format: 'auto', quality: 'auto', crop: 'fill', gravity: 'auto', dpr: 'auto' })
                    : raw
                })()}
                alt={product.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="192px"
              />
            </Link>
            
            {/* Out of stock overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <span className="rounded bg-white px-3 py-1 text-sm font-medium text-gray-900">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="flex-1 p-6">
            <div className="flex justify-between h-full">
              <div className="flex-1">
                <div className="mb-2">
                  <p className="text-sm text-gray-500">{product.brand}</p>
                  <Link href={`/products/${product._id}`}>
                    <h3 className="text-xl font-medium text-gray-900 hover:text-blue-600 mb-2">
                      {product.name}
                    </h3>
                  </Link>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Rating */}
                <div className="mb-4 flex items-center space-x-1">
                  <div className="flex items-center">
                    {renderStars(product.rating)}
                  </div>
                  <span className="text-sm text-gray-500">
                    ({product.reviewCount} reviews)
                  </span>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-2xl font-bold text-gray-900">{formatPrice(product.price)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col justify-between items-end ml-6">
                {/* Wishlist button */}
                {onAddToWishlist && (
                  <button
                    onClick={() => onAddToWishlist(product._id)}
                    className="rounded-full bg-gray-100 p-2 transition-colors hover:bg-gray-200 mb-4"
                    aria-label="Add to wishlist"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                )}

                {/* Add to cart button */}
                {onAddToCart && (
                  <Button
                    onClick={() => onAddToCart(product._id)}
                    disabled={isOutOfStock}
                    size="lg"
                  >
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    )
  }

  // Grid view (default)
  return (
    <Card className={cn('group relative overflow-hidden transition-shadow hover:shadow-lg', className)}>
      <div className="relative aspect-square overflow-hidden">
        <Link href={`/products/${product._id}`}>
          <Image
            src={(() => {
              const raw = product.images[0] || '/placeholder-product.jpg'
              return isCloudinaryUrl(raw)
                ? optimizeImageUrl(raw, { width: 800, height: 800, format: 'auto', quality: 'auto', crop: 'fill', gravity: 'auto', dpr: 'auto' })
                : raw
            })()}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>
        
        {/* Wishlist button */}
        {onAddToWishlist && (
          <button
            onClick={() => onAddToWishlist(product._id)}
            className="absolute right-2 top-2 rounded-full bg-white p-2 shadow-md transition-colors hover:bg-gray-50"
            aria-label="Add to wishlist"
          >
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <span className="rounded bg-white px-3 py-1 text-sm font-medium text-gray-900">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-2 sm:p-4">
        <div className="mb-1 sm:mb-2">
          <p className="text-xs sm:text-sm text-gray-500 truncate">{product.brand}</p>
          <Link href={`/products/${product._id}`}>
            <h3 className="text-sm sm:font-medium text-gray-900 hover:text-blue-600 line-clamp-2 leading-tight">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Rating */}
        <div className="mb-1 sm:mb-2 flex items-center space-x-1">
          <div className="flex items-center">
            {renderStars(product.rating)}
          </div>
          <span className="text-xs sm:text-sm text-gray-500">
            ({product.reviewCount})
          </span>
        </div>

        {/* Price */}
        <div className="mb-2 sm:mb-3">
          <span className="text-sm sm:text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
        </div>

        {/* Add to cart button */}
        {onAddToCart && (
          <Button
            onClick={() => onAddToCart(product._id)}
            disabled={isOutOfStock}
            className="w-full text-xs sm:text-sm py-1.5 sm:py-2"
            size="sm"
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export { ProductCard }