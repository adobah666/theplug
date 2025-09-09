'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/lib/utils/currency'

interface PaystackPaymentProps {
  amount: number
  email: string
  orderId: string
  onSuccess: (reference: string) => void
  onError: (error: string) => void
  onClose: () => void
  isLoading?: boolean
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (options: PaystackOptions) => {
        openIframe: () => void
      }
    }
  }
}

interface PaystackOptions {
  key: string
  email: string
  amount: number
  currency: string
  ref: string
  metadata: {
    orderId: string
  }
  callback: (response: PaystackResponse) => void
  onClose: () => void
}

interface PaystackResponse {
  reference: string
  status: string
  trans: string
  transaction: string
  trxref: string
  redirecturl: string
}

const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  amount,
  email,
  orderId,
  onSuccess,
  onError,
  onClose,
  isLoading = false
}) => {
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  useEffect(() => {
    // Load Paystack script
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => onError('Failed to load Paystack script')
    
    document.body.appendChild(script)

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [onError])

  const generateReference = () => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000000)
    return `order_${orderId}_${timestamp}_${random}`
  }

  const handlePayment = async () => {
    if (!scriptLoaded || !window.PaystackPop) {
      onError('Paystack is not loaded yet. Please try again.')
      return
    }

    setPaymentLoading(true)

    try {
      const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
      if (!publicKey) {
        throw new Error('Paystack public key not configured')
      }

      const reference = generateReference()

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: amount * 100, // Paystack expects the smallest currency unit (pesewas for GHS)
        currency: 'GHS',
        ref: reference,
        metadata: {
          orderId: orderId
        },
        callback: (response: PaystackResponse) => {
          setPaymentLoading(false)
          if (response.status === 'success') {
            onSuccess(response.reference)
          } else {
            onError('Payment was not successful')
          }
        },
        onClose: () => {
          setPaymentLoading(false)
          onClose()
        }
      })

      handler.openIframe()
    } catch (error) {
      setPaymentLoading(false)
      onError(error instanceof Error ? error.message : 'Payment initialization failed')
    }
  }

  const formatAmount = (amount: number) => formatCurrency(amount)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Complete Payment</h3>
        
        <div className="space-y-3 text-sm text-gray-600 mb-6">
          <div className="flex justify-between">
            <span>Order ID:</span>
            <span className="font-medium text-gray-900">{orderId}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-medium text-gray-900">{formatAmount(amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Email:</span>
            <span className="font-medium text-gray-900">{email}</span>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handlePayment}
            disabled={!scriptLoaded || isLoading || paymentLoading}
            loading={paymentLoading}
            className="w-full bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
            size="lg"
          >
            {paymentLoading ? 'Processing Payment...' : `Pay ${formatAmount(amount)}`}
          </Button>

          {!scriptLoaded && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <LoadingSpinner size="sm" />
              <span>Loading payment system...</span>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>• Your payment is secured by Paystack</p>
          <p>• A Paystack popup will open to complete the payment</p>
          <p>• Do not refresh or close this page during payment</p>
        </div>
      </div>
    </div>
  )
}

export { PaystackPayment }