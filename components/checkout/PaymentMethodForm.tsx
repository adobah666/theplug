'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PaymentMethod } from '@/types/checkout'
import { validatePaymentMethod, formatValidationErrors } from '@/lib/checkout/validation'

interface PaymentMethodFormProps {
  initialData?: Partial<PaymentMethod>
  onSubmit: (data: PaymentMethod) => void
  onBack: () => void
  isLoading?: boolean
}

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  initialData = {},
  onSubmit,
  onBack,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<PaymentMethod>({
    type: initialData.type || 'card'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof PaymentMethod, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handlePaymentTypeChange = (type: 'card' | 'bank_transfer') => {
    setFormData(prev => ({ ...prev, type }))
    setErrors({}) // Clear all errors when switching payment type
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = validatePaymentMethod(formData)
    
    if (!validation.success) {
      setErrors(formatValidationErrors(validation.error))
      return
    }

    onSubmit(validation.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Selection */}
      <div>
        <label className="mb-4 block text-sm font-medium text-gray-700">
          Payment Method
        </label>
        <div className="space-y-3">
          {/* Paystack (Modal) */}
          <div className="flex items-center">
            <input
              id="payment-card"
              type="radio"
              name="paymentType"
              value="card"
              checked={formData.type === 'card'}
              onChange={() => handlePaymentTypeChange('card')}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="payment-card" className="ml-3 flex items-center text-sm text-gray-700">
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pay with Paystack
            </label>
          </div>

          {/* Bank Transfer */}
          <div className="flex items-center">
            <input
              id="payment-transfer"
              type="radio"
              name="paymentType"
              value="bank_transfer"
              checked={formData.type === 'bank_transfer'}
              onChange={() => handlePaymentTypeChange('bank_transfer')}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="payment-transfer" className="ml-3 flex items-center text-sm text-gray-700">
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M10 3v4h4V3m-4 0H6m8 0h4" />
              </svg>
              Bank Transfer
            </label>
          </div>
        </div>
      </div>

      {/* Bank Transfer Info (only show if bank transfer is selected) */}
      {formData.type === 'bank_transfer' && (
        <div className="rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Transfer Instructions</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>You will receive bank transfer details after placing your order.</p>
            <p>Please complete the transfer within 24 hours to secure your order.</p>
            <p>Your order will be processed once payment is confirmed.</p>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
        >
          Back to Shipping
        </Button>
        
        <Button
          type="submit"
          loading={isLoading}
        >
          Continue to Review
        </Button>
      </div>
    </form>
  )
}

export { PaymentMethodForm }