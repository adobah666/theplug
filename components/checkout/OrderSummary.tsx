'use client'

import React from 'react'
import Image from 'next/image'
import { CartItemData } from '@/components/cart/CartItem'
import { ShippingAddress, PaymentMethod } from '@/types/checkout'
import { formatCurrency } from '@/lib/utils/currency'
import { useCart } from '@/lib/cart/context'

interface OrderSummaryProps {
  items: CartItemData[]
  shippingAddress?: ShippingAddress
  paymentMethod?: PaymentMethod
  subtotal: number
  shipping: number
  tax: number
  total: number
  showItems?: boolean
  showShipping?: boolean
  showPayment?: boolean
  allowItemRemoval?: boolean
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  shippingAddress,
  paymentMethod,
  subtotal,
  shipping,
  tax,
  total,
  showItems = true,
  showShipping = false,
  showPayment = false,
  allowItemRemoval = false
}) => {
  const formatPrice = (price: number) => formatCurrency(price)
  const { removeItem, state } = useCart()
  const onRemove = async (item: CartItemData) => {
    try {
      const productId = typeof (item as any).productId === 'string'
        ? (item as any).productId
        : String((item as any).productId?._id || (item as any).productId || '')
      const variantId = typeof (item as any).variantId === 'string'
        ? (item as any).variantId
        : ((item as any).variantId || undefined)
      await removeItem(productId, variantId)
    } catch {}
  }

  const formatCardNumber = (cardNumber: string) => {
    // Show only last 4 digits
    const lastFour = cardNumber.replace(/\s/g, '').slice(-4)
    return `**** **** **** ${lastFour}`
  }

  return (
    <div className="space-y-6">
      {/* Order Items */}
      {showItems && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
          <div className="space-y-4">
            {items.map((item, index) => {
              const productId = typeof (item as any).productId === 'string' ? (item as any).productId : String((item as any).productId?._id || (item as any).productId || '')
              const variantId = typeof (item as any).variantId === 'string' ? (item as any).variantId : ((item as any).variantId || undefined)
              const key = variantId ? `${productId}-${variantId}` : productId
              const isRemoving = state.removingItems.has(key)
              return (
              <div key={`${productId}-${variantId || 'default'}-${index}`} className="flex items-center space-x-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </h4>
                  {(item.size || item.color) && (
                    <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                      {item.size && <span>Size: {item.size}</span>}
                      {item.size && item.color && <span>•</span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </div>
                  )}
                  <p className="mt-1 text-sm text-gray-500">Qty: {item.quantity}</p>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <div className="text-sm font-medium text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                  {allowItemRemoval && (
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      disabled={isRemoving}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {isRemoving ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Shipping Address */}
      {showShipping && shippingAddress && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h3>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="font-medium text-gray-900">
              {shippingAddress.firstName} {shippingAddress.lastName}
            </p>
            <p className="text-sm text-gray-600">{shippingAddress.street}</p>
            <p className="text-sm text-gray-600">
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
            </p>
            <p className="text-sm text-gray-600">{shippingAddress.country}</p>
            <p className="mt-2 text-sm text-gray-600">{shippingAddress.phone}</p>
            <p className="text-sm text-gray-600">{shippingAddress.email}</p>
          </div>
        </div>
      )}

      {/* Payment Method */}
      {showPayment && paymentMethod && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
          <div className="rounded-lg border border-gray-200 p-4">
            {paymentMethod.type === 'card' ? (
              <div className="flex items-center space-x-3">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Mobile Money/Credit/Debit Card</p>
                  {paymentMethod.cardNumber && (
                    <p className="text-sm text-gray-600">
                      {formatCardNumber(paymentMethod.cardNumber)}
                    </p>
                  )}
                  {paymentMethod.cardholderName && (
                    <p className="text-sm text-gray-600">{paymentMethod.cardholderName}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M10 3v4h4V3m-4 0H6m8 0h4" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Bank Transfer</p>
                  <p className="text-sm text-gray-600">Payment details will be provided after order confirmation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Total */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal ({items.length} items)</span>
            <span className="text-gray-900">{formatPrice(subtotal)}</span>
          </div>
          
          {shipping > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery fee</span>
              <span className="text-gray-900">{formatPrice(shipping)}</span>
            </div>
          )}
          
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">{formatPrice(tax)}</span>
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-lg font-medium">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { OrderSummary }