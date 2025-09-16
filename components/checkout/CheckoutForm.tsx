"use client"

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()
  const wishlistItemId = searchParams?.get('wishlistItemId') || null
  const { state: cartState, refreshCart, clearCart } = useCart()
  const { session } = useAuth()
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping')
  const [completedSteps, setCompletedSteps] = useState<CheckoutStep[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [settings, setSettings] = useState<{ taxRate: number; deliveryFeeDefault: number; deliveryFeeByRegion: Array<{ region: string; fee: number }> } | null>(null)

  // Hydrate cart once on mount to avoid infinite loop when empty
  const didHydrateRef = useRef(false)
  useEffect(() => {
    if (didHydrateRef.current) return
    didHydrateRef.current = true
    if (cartState.items.length === 0) {
      refreshCart().catch(() => {})
    }
  }, [])

  // Prefill from default saved address when authenticated
  useEffect(() => {
    let ignore = false
    ;(async () => {
      if (!session?.user) return
      try {
        const res = await fetch('/api/auth/addresses', { cache: 'no-store' })
        if (!res.ok) return
        const list = await res.json()
        const addresses = Array.isArray(list) ? list : []
        if (addresses.length === 0) return
        const def = addresses.find((a: any) => a.isDefault) || addresses[0]
        if (!def) return
        if (ignore) return
        setShippingAddress(prev => prev ?? {
          firstName: def.firstName || '',
          lastName: def.lastName || '',
          email: (session.user as any)?.email || '',
          phone: '',
          street: def.street || '',
          city: def.city || '',
          state: def.state || '',
          zipCode: def.postalCode || '',
          country: def.country || 'Ghana'
        })
      } catch {
        // ignore
      }
    })()
    return () => { ignore = true }
  }, [session])

  // Load admin-configurable settings (delivery fee + tax)
  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        const json = await res.json().catch(() => ({} as any))
        if (!res.ok) return
        if (!ignore) setSettings(json?.data || { taxRate: 0, deliveryFeeDefault: 0, deliveryFeeByRegion: [] })
      } catch {}
    })()
    return () => { ignore = true }
  }, [])

  // Calculate order totals
  const subtotal = cartState.subtotal
  const region = (shippingAddress?.state || '').trim()
  const regionalOverride = settings?.deliveryFeeByRegion?.find(r => r.region?.toLowerCase() === region.toLowerCase())
  const shipping = Math.max(0, regionalOverride?.fee ?? settings?.deliveryFeeDefault ?? 0)
  const taxRate = Math.max(0, settings?.taxRate ?? 0)
  const tax = Math.round(subtotal * taxRate)
  const total = subtotal + (shipping || 0) + (tax || 0)

  // Handle shipping form submission
  const handleShippingSubmit = useCallback(async (data: ShippingAddress, options?: { saveAddress?: boolean }) => {
    setShippingAddress(data)
    setCompletedSteps(prev => [...prev.filter(step => step !== 'shipping'), 'shipping'])
    setCurrentStep('payment')
    setError(null)

    // Persist address if requested and user is authenticated
    try {
      if (options?.saveAddress && session?.user) {
        const saveRes = await fetch('/api/auth/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            street: data.street,
            city: data.city,
            state: data.state,
            postalCode: data.zipCode,
            country: data.country,
            isDefault: true,
            ...(typeof data.latitude === 'number' ? { latitude: data.latitude } : {}),
            ...(typeof data.longitude === 'number' ? { longitude: data.longitude } : {}),
          })
        })
        if (!saveRes.ok) {
          // Log but don't block checkout
          try { console.warn('Save address failed', await saveRes.json()) } catch {}
        }
      }
    } catch {
      // Non-blocking: ignore save errors to not disrupt checkout flow
    }
  }, [session])

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
      // Require authentication before submitting an order
      if (!session?.user) {
        setError('Please sign in to place your order')
        // Redirect to login and return to checkout after auth
        router.push('/login?callbackUrl=/checkout')
        return
      }
      // Get current cart from server to obtain cartId for proper deletion
      let cartId: string | null = null
      try {
        const cartResponse = await fetch('/api/cart', { method: 'GET', credentials: 'include', cache: 'no-store' })
        if (cartResponse.ok) {
          const cartData = await cartResponse.json()
          cartId = cartData?.data?.cart?.id
        }
      } catch {
        // Continue without cartId if cart fetch fails
      }

      // Create order - prefer cartId over items for proper cart deletion
      const orderPayload: any = {
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
      }

      // Use cartId if available, otherwise fall back to items
      if (cartId) {
        orderPayload.cartId = cartId
      } else {
        orderPayload.items = cartState.items.map(item => ({
          productId: typeof (item as any).productId === 'string'
            ? (item as any).productId
            : ((item as any).productId?._id || String((item as any).productId || '')),
          variantId: typeof item.variantId === 'string' ? item.variantId : (item as any).variantId || undefined,
          productName: item.name,
          productImage: item.image,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        }))
      }

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload)
      })

      if (!orderResponse.ok) {
        // If unauthorized, prompt login and redirect
        if (orderResponse.status === 401) {
          setError('You need to sign in to place your order')
          router.push('/login?callbackUrl=/checkout')
          return
        }
        const errorData = await orderResponse.json().catch(() => ({}))
        const details = Array.isArray(errorData?.details) ? `\n${errorData.details.join('\n')}` : ''
        throw new Error((errorData.error || errorData.message || 'Failed to create order') + details)
      }

      const orderData = await orderResponse.json()
      const orderId = orderData.order?.id || orderData.data?._id

      // If arriving from wishlist with a specific item, remove it now
      if (wishlistItemId) {
        try {
          await fetch(`/api/wishlist/${encodeURIComponent(wishlistItemId)}`, { method: 'DELETE' })
        } catch {}
      }

      // Redirect to order page where Paystack payment will be handled
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
                allowItemRemoval={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { CheckoutForm }