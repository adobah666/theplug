'use client'

import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export interface CartItemData {
  _id?: string
  productId: string
  variantId?: string
  quantity: number
  price: number
  name: string
  image: string
  size?: string
  color?: string
}

interface CartItemProps {
  item: CartItemData
  onUpdateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void
  onRemove: (productId: string, variantId: string | undefined) => void
  isUpdating?: boolean
  isRemoving?: boolean
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating = false,
  isRemoving = false
}) => {
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      onRemove(item.productId, item.variantId)
    } else if (newQuantity <= 99) {
      onUpdateQuantity(item.productId, item.variantId, newQuantity)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price)
  }

  return (
    <div className="flex items-start space-x-4 py-4 border-b border-gray-200 last:border-b-0">
      {/* Product Image */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {item.name}
        </h3>
        
        {/* Variant Info */}
        {(item.size || item.color) && (
          <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
            {item.size && <span>Size: {item.size}</span>}
            {item.size && item.color && <span>•</span>}
            {item.color && <span>Color: {item.color}</span>}
          </div>
        )}

        {/* Price */}
        <div className="mt-1 text-sm font-medium text-gray-900">
          {formatPrice(item.price)}
        </div>

        {/* Quantity Controls */}
        <div className="mt-2 flex items-center space-x-2">
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isUpdating || isRemoving}
              className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            
            <span className="px-3 py-1 text-sm font-medium text-gray-900 min-w-[2rem] text-center">
              {isUpdating ? (
                <LoadingSpinner size="sm" />
              ) : (
                item.quantity
              )}
            </span>
            
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdating || isRemoving || item.quantity >= 99}
              className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.productId, item.variantId)}
            disabled={isUpdating || isRemoving}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {isRemoving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </Button>
        </div>
      </div>

      {/* Total Price */}
      <div className="text-sm font-medium text-gray-900">
        {formatPrice(item.price * item.quantity)}
      </div>
    </div>
  )
}

export { CartItem }