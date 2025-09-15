'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { OrderSummary } from './OrderSummary'
import { CartItemData } from '@/components/cart/CartItem'
import { ShippingAddress, PaymentMethod } from '@/types/checkout'

interface CheckoutReviewProps {
  items: CartItemData[]
  shippingAddress: ShippingAddress
  paymentMethod: PaymentMethod
  subtotal: number
  shipping: number
  tax: number
  total: number
  onSubmit: () => void
  onBack: () => void
  isLoading?: boolean
}

const CheckoutReview: React.FC<CheckoutReviewProps> = ({
  items,
  shippingAddress,
  paymentMethod,
  subtotal,
  shipping,
  tax,
  total,
  onSubmit,
  onBack,
  isLoading = false
}) => {
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [termsError, setTermsError] = useState('')

  const handleSubmit = () => {
    if (!agreeToTerms) {
      setTermsError('You must agree to the terms and conditions to place your order')
      return
    }
    
    setTermsError('')
    onSubmit()
  }

  const handleTermsChange = (checked: boolean) => {
    setAgreeToTerms(checked)
    if (checked && termsError) {
      setTermsError('')
    }
  }

  return (
    <div className="space-y-8">
      {/* Review Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review Your Order</h2>
        <p className="mt-2 text-sm text-gray-600">
          Please review your order details before placing your order.
        </p>
      </div>

      {/* Order Summary with all details */}
      <OrderSummary
        items={items}
        shippingAddress={shippingAddress}
        paymentMethod={paymentMethod}
        subtotal={subtotal}
        shipping={shipping}
        tax={tax}
        total={total}
        showItems={true}
        showShipping={true}
        showPayment={true}
      />

      {/* Terms and Conditions */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-start space-x-3">
          <input
            id="agree-terms"
            type="checkbox"
            checked={agreeToTerms}
            onChange={(e) => handleTermsChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isLoading}
          />
          <div className="flex-1">
            <label htmlFor="agree-terms" className="text-sm text-gray-700">
              I agree to the{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-500 underline" target="_blank" rel="noopener noreferrer">
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-500 underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </label>
            {termsError && (
              <p className="mt-1 text-sm text-red-600">{termsError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="rounded-lg bg-yellow-50 p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Important Information</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Orders are typically processed within 1–2 business days</li>
                <li>You will receive an email confirmation once your order is placed</li>
                <li>Delivery times may vary based on your location</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
        >
          Back to Payment
        </Button>
        
        <Button
          onClick={handleSubmit}
          loading={isLoading}
          size="lg"
          className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
        >
          {isLoading ? 'Placing Order...' : 'Place Order'}
        </Button>
      </div>
    </div>
  )
}

export { CheckoutReview }