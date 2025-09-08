import React, { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ProductVariantSelector } from './ProductVariantSelector'

interface ProductVariant {
  _id?: string
  size?: string
  color?: string
  sku: string
  price?: number
  inventory: number
}

interface Product {
  _id: string
  name: string
  description: string
  price: number
  images: string[]
  brand: string
  rating: number
  reviewCount: number
  inventory: number
  variants: ProductVariant[]
}

interface ProductDetailsProps {
  product: Product
  onAddToCart?: (productId: string, variantId?: string, quantity?: number) => void
  onAddToWishlist?: (productId: string) => void
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onAddToCart,
  onAddToWishlist
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price)
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg key={i} className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20">
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
          <svg key={i} className="h-5 w-5 text-gray-300" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      }
    }

    return stars
  }

  const getCurrentPrice = () => {
    if (selectedVariant && selectedVariant.price) {
      return selectedVariant.price
    }
    return product.price
  }

  const getCurrentInventory = () => {
    if (selectedVariant) {
      return selectedVariant.inventory
    }
    return product.inventory
  }

  const isOutOfStock = getCurrentInventory() === 0
  const maxQuantity = Math.min(getCurrentInventory(), 10) // Limit to 10 or available inventory

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product._id, selectedVariant?._id, quantity)
    }
  }

  const handleAddToWishlist = () => {
    if (onAddToWishlist) {
      onAddToWishlist(product._id)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Image Gallery */}
      <div className="space-y-4">
        {/* Main Image */}
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
          <Image
            src={product.images[selectedImageIndex] || '/placeholder-product.jpg'}
            alt={product.name}
            width={600}
            height={600}
            className="h-full w-full object-cover"
            priority
          />
        </div>

        {/* Thumbnail Images */}
        {product.images.length > 1 && (
          <div className="flex space-x-2 overflow-x-auto">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`flex-shrink-0 overflow-hidden rounded-md border-2 ${
                  selectedImageIndex === index
                    ? 'border-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Image
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  width={80}
                  height={80}
                  className="h-20 w-20 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="space-y-6">
        {/* Basic Info */}
        <div>
          <p className="text-sm text-gray-500">{product.brand}</p>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          
          {/* Rating */}
          <div className="mt-2 flex items-center space-x-2">
            <div className="flex items-center">
              {renderStars(product.rating)}
            </div>
            <span className="text-sm text-gray-500">
              {product.rating.toFixed(1)} ({product.reviewCount} reviews)
            </span>
          </div>
        </div>

        {/* Price */}
        <div>
          <span className="text-3xl font-bold text-gray-900">
            {formatPrice(getCurrentPrice())}
          </span>
          {selectedVariant && selectedVariant.price && selectedVariant.price !== product.price && (
            <span className="ml-2 text-lg text-gray-500 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Variants */}
        {product.variants.length > 0 && (
          <ProductVariantSelector
            variants={product.variants}
            selectedVariant={selectedVariant}
            onVariantChange={setSelectedVariant}
          />
        )}

        {/* Quantity Selector */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantity
          </label>
          <div className="mt-1 flex items-center space-x-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="rounded-md border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="w-12 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              disabled={quantity >= maxQuantity}
              className="rounded-md border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {getCurrentInventory()} items available
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full"
            size="lg"
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
          
          {onAddToWishlist && (
            <Button
              onClick={handleAddToWishlist}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Add to Wishlist
            </Button>
          )}
        </div>

        {/* Product Description */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700 leading-relaxed">{product.description}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export { ProductDetails }