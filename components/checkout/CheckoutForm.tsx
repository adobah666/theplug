"use client"

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ProgressIndicator } from './ProgressIndicator'
import { ShippingAddressForm } from './ShippingAddressForm'
import { PaymentMethodForm } from './PaymentMethodForm'
import { CheckoutReview } from './CheckoutReview'
import { OrderSummary } from './OrderSummary'
import { useCart } from '@/lib/cart/context'
import { useAuth } from '@/lib/auth/context'
import { CheckoutStep, ShippingAddress, PaymentMethod } from '@/types/checkout'

interface CheckoutFormProps {
  onOrderComplete?: (orderId: string) => void
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onOrderComplete }) => {
  const router = useRouter()
  const { state: cartState, refreshCart } = useCart()
  const { session } = useAuth()
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping')
  const [completedSteps, setCompletedSteps] = useState<CheckoutStep[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

  // Hydrate cart once on mount to avoid infinite loop when empty
  const didHydrateRef = useRef(false)
  useEffect(() => {
    if (didHydrateRef.current) return
    didHydrateRef.current = true
    if (cartState.items.length === 0) {
      refreshCart().catch(() => {})
    }
  }, [])

  // Calculate order totals
  const subtotal = cartState.subtotal
  const shipping = subtotal > 50000 ? 0 : 2500 // Free shipping over ₦50,000
  const taxRate = 0.075 // 7.5% VAT
  const tax = Math.round(subtotal * taxRate)
  const total = subtotal + shipping + tax

  // Handle shipping form submission
  const handleShippingSubmit = useCallback((data: ShippingAddress) => {
    setShippingAddress(data)
    setCompletedSteps(prev => [...prev.filter(step => step !== 'shipping'), 'shipping'])
    setCurrentStep('payment')
    setError(null)
  }, [])

  // Handle payment form submission
  const handlePaymentSubmit = useCallback((data: PaymentMethod) => {
    setPaymentMethod(data)
    setCompletedSteps(prev => [...prev.filter(step => step !== 'payment'), 'payment'])
    setCurrentStep('review')
    setError(null)
  }, [])

  // Handle order submission
  const handleOrderSubmit = useCallback(async () => {
    if (!shippingAddress || !paymentMethod) {
      setError('Missing required information')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Map items to the server's expected IOrderItem shape
          items: cartState.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.name,
            productImage: item.image,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
          })),
          // Map shipping address to API contract
          shippingAddress: {
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            ...(shippingAddress.zipCode ? { zipCode: shippingAddress.zipCode } : {}),
            country: shippingAddress.country,
            recipientName: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
            recipientPhone: shippingAddress.phone,
          },
          paymentMethod: paymentMethod.type,
          subtotal,
          shipping,
          tax,
          total
        })
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || errorData.message || 'Failed to create order')
      }

      const orderData = await orderResponse.json()
      const orderId = orderData.order?.id || orderData.data?._id

      // For bank transfer, redirect to order page immediately
      if (paymentMethod.type === 'bank_transfer') {
        if (onOrderComplete) {
          onOrderComplete(orderId)
        } else {
          router.push(`/orders/${orderId}?success=true`)
        }
        return
      }

      // For card payment, redirect to order page where Paystack payment will be handled
      if (onOrderComplete) {
        onOrderComplete(orderId)
      } else {
        router.push(`/orders/${orderId}`)
      }

    } catch (error) {
      console.error('Order submission error:', error)
      setError(error instanceof Error ? error.message : 'Failed to place order')
    } finally {
      setIsLoading(false)
    }
  }, [shippingAddress, paymentMethod, cartState.items, subtotal, shipping, tax, total, session, onOrderComplete, router])

  // Navigation handlers
  const handleBackToCart = useCallback(() => {
    router.push('/cart')
  }, [router])

  const handleBackToShipping = useCallback(() => {
    setCurrentStep('shipping')
  }, [])

  const handleBackToPayment = useCallback(() => {
    setCurrentStep('payment')
  }, [])

  // Redirect/notify if cart is empty (after hydration)
  if (cartState.items.length === 0 && !cartState.isLoading) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h2 className="mt-4 text-lg font-medium text-gray-900">Your cart is empty</h2>
        <p className="mt-2 text-sm text-gray-500">Add some items to your cart to proceed with checkout.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        {/* Main Content */}
        <div className="lg:col-span-7">
          {/* Progress Indicator */}
          <ProgressIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
          />

          {/* Error Display */}
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'shipping' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Information</h2>
              <ShippingAddressForm
                initialData={shippingAddress || undefined}
                onSubmit={handleShippingSubmit}
                onBack={handleBackToCart}
                isLoading={isLoading}
              />
            </div>
          )}

          {currentStep === 'payment' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Method</h2>
              <PaymentMethodForm
                initialData={paymentMethod || undefined}
                onSubmit={handlePaymentSubmit}
                onBack={handleBackToShipping}
                isLoading={isLoading}
              />
            </div>
          )}

          {currentStep === 'review' && shippingAddress && paymentMethod && (
            <CheckoutReview
              items={cartState.items}
              shippingAddress={shippingAddress}
              paymentMethod={paymentMethod}
              subtotal={subtotal}
              shipping={shipping}
              tax={tax}
              total={total}
              onSubmit={handleOrderSubmit}
              onBack={handleBackToPayment}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="mt-10 lg:mt-0 lg:col-span-5">
          <div className="sticky top-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <OrderSummary
                items={cartState.items}
                subtotal={subtotal}
                shipping={shipping}
                tax={tax}
                total={total}
                showItems={true}
                showShipping={false}
                showPayment={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { CheckoutForm }