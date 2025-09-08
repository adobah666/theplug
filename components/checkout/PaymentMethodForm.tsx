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
    type: initialData.type || 'card',
    cardNumber: initialData.cardNumber || '',
    expiryMonth: initialData.expiryMonth || '',
    expiryYear: initialData.expiryYear || '',
    cvv: initialData.cvv || '',
    cardholderName: initialData.cardholderName || ''
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

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Add spaces every 4 digits
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ')
    
    return formatted.substring(0, 19) // Limit to 16 digits + 3 spaces
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    handleInputChange('cardNumber', formatted)
  }

  const handleExpiryChange = (field: 'expiryMonth' | 'expiryYear', value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, '')
    
    if (field === 'expiryMonth') {
      // Limit to 2 digits and validate range
      const month = digits.substring(0, 2)
      if (month === '' || (parseInt(month) >= 1 && parseInt(month) <= 12)) {
        handleInputChange(field, month)
      }
    } else {
      // Limit to 2 digits for year
      const year = digits.substring(0, 2)
      handleInputChange(field, year)
    }
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, limit to 4
    const digits = e.target.value.replace(/\D/g, '').substring(0, 4)
    handleInputChange('cvv', digits)
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

  const currentYear = new Date().getFullYear() % 100
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Selection */}
      <div>
        <label className="mb-4 block text-sm font-medium text-gray-700">
          Payment Method
        </label>
        <div className="space-y-3">
          {/* Card Payment */}
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
              Credit/Debit Card
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

      {/* Card Details (only show if card is selected) */}
      {formData.type === 'card' && (
        <div className="space-y-6 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900">Card Details</h3>
          
          {/* Cardholder Name */}
          <Input
            label="Cardholder Name"
            value={formData.cardholderName}
            onChange={(e) => handleInputChange('cardholderName', e.target.value)}
            error={errors.cardholderName}
            placeholder="John Doe"
            required
            disabled={isLoading}
          />

          {/* Card Number */}
          <Input
            label="Card Number"
            value={formData.cardNumber}
            onChange={handleCardNumberChange}
            error={errors.cardNumber}
            placeholder="1234 5678 9012 3456"
            required
            disabled={isLoading}
          />

          <div className="grid grid-cols-3 gap-4">
            {/* Expiry Month */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Month
              </label>
              <select
                value={formData.expiryMonth}
                onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={isLoading}
              >
                <option value="">MM</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month.toString().padStart(2, '0')}>
                    {month.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              {errors.expiryMonth && (
                <p className="mt-1 text-sm text-red-600">{errors.expiryMonth}</p>
              )}
            </div>

            {/* Expiry Year */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Year
              </label>
              <select
                value={formData.expiryYear}
                onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={isLoading}
              >
                <option value="">YY</option>
                {years.map(year => (
                  <option key={year} value={year.toString().padStart(2, '0')}>
                    {year.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              {errors.expiryYear && (
                <p className="mt-1 text-sm text-red-600">{errors.expiryYear}</p>
              )}
            </div>

            {/* CVV */}
            <Input
              label="CVV"
              value={formData.cvv}
              onChange={handleCvvChange}
              error={errors.cvv}
              placeholder="123"
              required
              disabled={isLoading}
            />
          </div>

          {/* Security Notice */}
          <div className="flex items-start space-x-2 rounded-md bg-blue-50 p-3">
            <svg className="mt-0.5 h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-blue-700">
              Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
            </p>
          </div>
        </div>
      )}

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