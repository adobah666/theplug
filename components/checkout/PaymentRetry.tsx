'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PaystackPayment } from './PaystackPayment'

interface PaymentRetryProps {
  orderId: string
  amount: number
  email: string
  onSuccess: (reference: string) => void
  onError: (error: string) => void
  maxRetries?: number
}

const PaymentRetry: React.FC<PaymentRetryProps> = ({
  orderId,
  amount,
  email,
  onSuccess,
  onError,
  maxRetries = 3
}) => {
  const [retryCount, setRetryCount] = useState(0)
  const [showPayment, setShowPayment] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const handleRetryPayment = () => {
    if (retryCount >= maxRetries) {
      onError(`Maximum retry attempts (${maxRetries}) exceeded. Please contact support.`)
      return
    }

    setRetryCount(prev => prev + 1)
    setShowPayment(true)
    setLastError(null)
  }

  const handlePaymentSuccess = (reference: string) => {
    setShowPayment(false)
    onSuccess(reference)
  }

  const handlePaymentError = (error: string) => {
    setShowPayment(false)
    setLastError(error)
    onError(error)
  }

  const handlePaymentClose = () => {
    setShowPayment(false)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  if (showPayment) {
    return (
      <PaystackPayment
        amount={amount}
        email={email}
        orderId={orderId}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        onClose={handlePaymentClose}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Retry Information */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Payment Required</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Your order has been created but payment is still pending.</p>
              <p>Please complete the payment to confirm your order.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
        
        <div className="space-y-3 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Order ID:</span>
            <span className="font-medium text-gray-900">{orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium text-gray-900">{formatAmount(amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium text-gray-900">{email}</span>
          </div>
          {retryCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Retry Attempts:</span>
              <span className="font-medium text-gray-900">{retryCount} of {maxRetries}</span>
            </div>
          )}
        </div>

        {/* Last Error */}
        {lastError && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Previous Payment Failed</h3>
                <p className="mt-1 text-sm text-red-700">{lastError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Retry Button */}
        <div className="space-y-4">
          <Button
            onClick={handleRetryPayment}
            disabled={retryCount >= maxRetries}
            className="w-full bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
            size="lg"
          >
            {retryCount >= maxRetries 
              ? 'Maximum Retries Exceeded' 
              : `${retryCount > 0 ? 'Retry' : 'Complete'} Payment`
            }
          </Button>

          {retryCount >= maxRetries && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Having trouble with payment? Contact our support team.
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Tips */}
      <div className="rounded-lg bg-blue-50 p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Payment Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ensure your card has sufficient funds</li>
          <li>• Check that your card is enabled for online transactions</li>
          <li>• Try using a different card if the payment fails</li>
          <li>• Contact your bank if you continue to experience issues</li>
        </ul>
      </div>
    </div>
  )
}

export { PaymentRetry }