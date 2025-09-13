'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { OrderSummary } from './OrderSummary'
import { PaystackPayment } from './PaystackPayment'
import { useCart } from '@/lib/cart/context'

interface Order {
  _id: string
  userId: string | { _id: string; email?: string; name?: string }
  items: Array<{
    productId: string
    variantId?: string
    quantity: number
    price: number
    name: string
    image?: string
    size?: string
    color?: string
  }>
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: string
  paymentStatus: string
  paystackReference?: string
  shippingAddress: {
    firstName: string
    lastName: string
    email: string
    phone: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  createdAt: string
  updatedAt: string
  paidAt?: string
}

interface OrderConfirmationProps {
  order: Order
  isSuccess?: boolean
  paymentReference?: string
}

const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  order,
  isSuccess = false,
  paymentReference
}) => {
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus)
  const [showPayment, setShowPayment] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const { clearCart } = useCart()
  const [cartCleared, setCartCleared] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundSubmitting, setRefundSubmitting] = useState(false)
  const [refundMessage, setRefundMessage] = useState<string | null>(null)
  const [refundRequested, setRefundRequested] = useState(false)
  const [refundStatus, setRefundStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  // Track local paidAt to avoid needing page refresh after verification
  const [localPaidAt, setLocalPaidAt] = useState<string | undefined>(
    (order as any)?.paidAt
  )

  const withinRefundWindow = () => {
    try {
      const paidAtIso = localPaidAt || (order as any)?.paidAt
      const paidAt = paidAtIso ? new Date(paidAtIso) : null
      if (!paidAt) return false
      const now = new Date()
      const hours = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60)
      return hours <= 6
    } catch { return false }
  }

  const submitRefund = async () => {
    setRefundSubmitting(true)
    setRefundMessage(null)
    try {
      const res = await fetch(`/api/orders/${order._id}/refund-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason })
      })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok || json?.error) {
        setRefundMessage(json?.error || 'Failed to submit refund request')
        return
      }
      setRefundMessage('Refund request submitted. We will notify you once it is reviewed.')
      setRefundOpen(false)
      setRefundReason('')
      setRefundRequested(true)
      setRefundStatus('pending')
    } catch {
      setRefundMessage('Failed to submit refund request')
    } finally {
      setRefundSubmitting(false)
    }
  }

  // Prefer account email populated by API (userId.email), fallback to shipping email if present
  const paymentEmail: string | undefined =
    typeof order.userId === 'object' && order.userId?.email
      ? (order.userId.email as string)
      : order.shippingAddress?.email

  // Verify payment if reference is provided
  useEffect(() => {
    if (paymentReference && paymentStatus === 'pending') {
      verifyPayment(paymentReference)
    }
  }, [paymentReference, paymentStatus])

  // Persist refund request state on load and when payment transitions to paid
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/orders/${order._id}/refund-request`, { method: 'GET' })
        const json = await res.json().catch(() => ({} as any))
        if (!mounted) return
        if (res.ok && json?.success && json?.exists) {
          setRefundRequested(true)
          if (typeof json.status === 'string') setRefundStatus(json.status as any)
        } else {
          setRefundRequested(false)
          setRefundStatus(null)
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [order._id, paymentStatus])

  const verifyPayment = async (reference: string) => {
    setIsVerifying(true)
    setVerificationError(null)

    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference,
          orderId: order._id
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setPaymentStatus('paid')
        // Prefer server-provided paidAt if returned; otherwise set to now
        const paidAtFromServer: string | undefined = (data?.data && (data.data.paidAt || data.data.order?.paidAt)) || undefined
        setLocalPaidAt(paidAtFromServer || new Date().toISOString())
      } else {
        setVerificationError(data.message || 'Payment verification failed')
      }
    } catch (error) {
      setVerificationError('Failed to verify payment')
    } finally {
      setIsVerifying(false)
    }
  }

  const handlePaymentSuccess = async (reference: string) => {
    await verifyPayment(reference)
    setShowPayment(false)
    // Clear cart once when payment is successful
    if (!cartCleared) {
      await clearCart()
      setCartCleared(true)
    }
  }

  const handlePaymentError = (error: string) => {
    setVerificationError(error)
    setShowPayment(false)
  }

  const handleRetryPayment = async () => {
    setVerificationError(null)
    setIsVerifying(true)
    try {
      const res = await fetch('/api/payments/precheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order._id }),
      })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok || json?.success === false) {
        const msg = Array.isArray(json?.errors) && json.errors.length > 0
          ? json.errors.join('\n')
          : (json?.error || 'One or more items are no longer available. Please update your cart.')
        setVerificationError(msg)
        setShowPayment(false)
        return
      }
      setShowPayment(true)
    } catch (e) {
      setVerificationError('Unable to start payment. Please try again.')
      setShowPayment(false)
    } finally {
      setIsVerifying(false)
    }
  }

  // If page loads with a paid status (e.g., after redirect), ensure cart is cleared once
  useEffect(() => {
    if ((paymentStatus === 'paid' || isSuccess) && !cartCleared) {
      clearCart().finally(() => setCartCleared(true))
    }
  }, [paymentStatus, isSuccess, cartCleared, clearCart])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'pending':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        {paymentStatus === 'paid' || isSuccess ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
            <p className="text-lg text-gray-600">
              Thank you for your purchase. Your order has been successfully placed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Order Placed</h1>
            <p className="text-lg text-gray-600">
              Your order has been created. Please complete the payment to confirm your order.
            </p>
          </div>
        )}
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(paymentStatus)}`}>
              {getStatusIcon(paymentStatus)}
              <span className="ml-1 capitalize">{paymentStatus}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Order Information</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Order ID:</span> {order._id}</p>
              <p><span className="font-medium">Date:</span> {formatDate(order.createdAt)}</p>
              <p><span className="font-medium">Status:</span> {order.status}</p>
              {order.paystackReference && (
                <p><span className="font-medium">Payment Reference:</span> {order.paystackReference}</p>
              )}
              <p><span className="font-medium">Email:</span> {paymentEmail || order.shippingAddress.email}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Delivery Information</h3>
            <div className="text-sm">
              <p className="font-medium">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="mt-2">{order.shippingAddress.phone}</p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <OrderSummary
          items={order.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            // API returns unitPrice and productName/productImage
            price: (item as any).unitPrice ?? (item as any).price ?? 0,
            name: (item as any).productName ?? (item as any).name ?? 'Item',
            image: (item as any).productImage || (item as any).image || '/placeholder-image.jpg',
            size: item.size,
            color: item.color
          }))}
          subtotal={order.subtotal}
          shipping={order.shipping}
          tax={order.tax}
          total={order.total}
          showItems={true}
        />
      </div>

      {/* Payment Section */}
      {paymentStatus === 'pending' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Complete Payment</h2>
          
          {verificationError && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
                  <p className="mt-1 text-sm text-red-700">{verificationError}</p>
                </div>
              </div>
            </div>
          )}

          {isVerifying ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Verifying payment...</span>
              </div>
            </div>
          ) : showPayment ? (
            <PaystackPayment
              amount={order.total}
              email={paymentEmail || order.shippingAddress.email}
              orderId={order._id}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onClose={() => setShowPayment(false)}
            />
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">
                Your order is waiting for payment confirmation.
              </p>
              <Button
                onClick={handleRetryPayment}
                className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
              >
                Pay Now
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tracking Section */}
      {(order as any).trackingNumber || (order as any).trackingUrl ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tracking Information</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {(order as any).trackingNumber && (
              <div>
                <p className="text-sm text-gray-600">Tracking Number</p>
                <p className="font-mono font-medium">{(order as any).trackingNumber}</p>
              </div>
            )}
            {(order as any).trackingUrl && (
              <Button
                variant="outline"
                onClick={() => window.open((order as any).trackingUrl, '_blank')}
              >
                Track Package
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tracking</h2>
          <p className="text-sm text-gray-600">
            Tracking details will appear here once your order ships. You'll receive an email and can also view updates on your orders page.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/account/orders">
              <Button variant="outline">Go to My Orders</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Success Actions */}
      {paymentStatus === 'paid' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What's Next?</h2>
          <div className="space-y-3 text-sm text-gray-600 mb-6">
            <p>• You will receive an email confirmation shortly</p>
            <p>• Your order will be processed within 1-2 business days</p>
            <p>• You'll receive tracking information once your order ships</p>
            <p>• Estimated delivery: 3-7 business days</p>
          </div>
          
          {refundStatus && (
            <div className="mb-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                refundStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                refundStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                Refund {refundStatus}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/">
              <Button variant="outline">Continue Shopping</Button>
            </Link>
            <Link href="/account/orders">
              <Button variant="outline">View All Orders</Button>
            </Link>
            {withinRefundWindow() && (
              <Button
                variant="outline"
                onClick={() => { setRefundOpen(true); setRefundMessage(null) }}
                disabled={refundStatus === 'pending'}
              >
                {!refundRequested ? 'Request Refund' : (
                  refundStatus === 'pending' ? 'Refund Requested' : (
                    refundStatus === 'approved' ? 'Refund Approved' : 'Refund Rejected'
                  )
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold">Request a Refund</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                You can request a refund within 6 hours after payment. An admin will review your request.
              </p>
              {refundStatus && (
                <div className="text-xs">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${
                    refundStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    refundStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    Refund {refundStatus}
                  </span>
                </div>
              )}
              <label className="block text-sm text-gray-700 mb-1">Reason (optional)</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Tell us briefly why you're requesting a refund"
                disabled={refundSubmitting}
              />
              {refundMessage && (
                <div className="text-sm text-red-600">{refundMessage}</div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={refundSubmitting}>Cancel</Button>
              <Button onClick={submitRefund} loading={refundSubmitting}>Submit Request</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { OrderConfirmation }