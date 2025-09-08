'use client'

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CartItem, CartItemData } from './CartItem'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: CartItemData[]
  subtotal: number
  itemCount: number
  isLoading?: boolean
  onUpdateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void
  onRemoveItem: (productId: string, variantId: string | undefined) => void
  onCheckout: () => void
  updatingItems?: Set<string>
  removingItems?: Set<string>
}

const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  itemCount,
  isLoading = false,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  updatingItems = new Set(),
  removingItems = new Set()
}) => {
  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price)
  }

  const getItemKey = (productId: string, variantId?: string) => {
    return variantId ? `${productId}-${variantId}` : productId
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 ease-in-out translate-x-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <h2 id="cart-drawer-title" className="text-lg font-semibold text-gray-900">
            Shopping Cart ({itemCount})
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close cart"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex h-full flex-col">
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : items.length === 0 ? (
              /* Empty Cart State */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-gray-100 p-6">
                  <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">Your cart is empty</h3>
                <p className="mb-6 text-sm text-gray-500">
                  Add some items to your cart to get started
                </p>
                <Button onClick={onClose} className="w-full max-w-xs">
                  Continue Shopping
                </Button>
              </div>
            ) : (
              /* Cart Items List */
              <div className="py-4">
                {items.map((item) => {
                  const itemKey = getItemKey(item.productId, item.variantId)
                  return (
                    <CartItem
                      key={itemKey}
                      item={item}
                      onUpdateQuantity={onUpdateQuantity}
                      onRemove={onRemoveItem}
                      isUpdating={updatingItems.has(itemKey)}
                      isRemoving={removingItems.has(itemKey)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer - Checkout Section */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
              {/* Subtotal */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-base font-medium text-gray-900">Subtotal</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatPrice(subtotal)}
                </span>
              </div>

              {/* Shipping Notice */}
              <p className="mb-4 text-xs text-gray-500">
                Shipping and taxes calculated at checkout
              </p>

              {/* Checkout Button */}
              <Button
                onClick={onCheckout}
                className="w-full"
                size="lg"
                disabled={isLoading || items.length === 0}
              >
                Proceed to Checkout
              </Button>

              {/* Continue Shopping Link */}
              <button
                onClick={onClose}
                className="mt-3 w-full text-center text-sm text-gray-600 hover:text-gray-900"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export { CartDrawer }