'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ShippingAddress } from '@/types/checkout'
import { validateShippingAddress, formatValidationErrors } from '@/lib/checkout/validation'

interface ShippingAddressFormProps {
  initialData?: Partial<ShippingAddress>
  onSubmit: (data: ShippingAddress) => void
  onBack?: () => void
  isLoading?: boolean
}

const ShippingAddressForm: React.FC<ShippingAddressFormProps> = ({
  initialData = {},
  onSubmit,
  onBack,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<ShippingAddress>({
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    street: initialData.street || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zipCode: initialData.zipCode || '',
    country: initialData.country || 'Ghana'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveAddress, setSaveAddress] = useState(false)

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = validateShippingAddress(formData)
    
    if (!validation.success) {
      setErrors(formatValidationErrors(validation.error))
      return
    }

    onSubmit(validation.data)
  }

  const ghanaRegions = [
    'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra',
    'North East', 'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta',
    'Western', 'Western North'
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* First Name */}
        <Input
          label="First Name"
          value={formData.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
          error={errors.firstName}
          required
          disabled={isLoading}
        />

        {/* Last Name */}
        <Input
          label="Last Name"
          value={formData.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
          error={errors.lastName}
          required
          disabled={isLoading}
        />

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          error={errors.email}
          required
          disabled={isLoading}
        />

        {/* Phone */}
        <Input
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          error={errors.phone}
          placeholder="+233 200 000 000"
          required
          disabled={isLoading}
        />
      </div>

      {/* Street Address */}
      <Input
        label="Street Address"
        value={formData.street}
        onChange={(e) => handleInputChange('street', e.target.value)}
        error={errors.street}
        placeholder="Enter your full street address"
        required
        disabled={isLoading}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* City */}
        <Input
          label="City"
          value={formData.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          error={errors.city}
          required
          disabled={isLoading}
        />

        {/* Region */}
        <div>
          <label htmlFor="state-select" className="mb-2 block text-sm font-medium text-gray-700">
            Region
          </label>
          <select
            id="state-select"
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
            disabled={isLoading}
          >
            <option value="">Select Region</option>
            {ghanaRegions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          {errors.state && (
            <p className="mt-1 text-sm text-red-600">{errors.state}</p>
          )}
        </div>

        {/* GhanaPost GPS Address (optional) */}
        <Input
          label="GhanaPost GPS Address (optional)"
          value={formData.zipCode}
          onChange={(e) => handleInputChange('zipCode', e.target.value)}
          error={errors.zipCode}
          placeholder="GA-123-4567"
          disabled={isLoading}
        />
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country-select" className="mb-2 block text-sm font-medium text-gray-700">
          Country
        </label>
        <select
          id="country-select"
          value={formData.country}
          onChange={(e) => handleInputChange('country', e.target.value)}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
          disabled={true}
        >
          <option value="Ghana">Ghana</option>
        </select>
        {errors.country && (
          <p className="mt-1 text-sm text-red-600">{errors.country}</p>
        )}
      </div>

      {/* Save Address Checkbox */}
      <div className="flex items-center">
        <input
          id="save-address"
          type="checkbox"
          checked={saveAddress}
          onChange={(e) => setSaveAddress(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          disabled={isLoading}
        />
        <label htmlFor="save-address" className="ml-2 text-sm text-gray-700">
          Save this address for future orders
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between pt-6">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            Back to Cart
          </Button>
        )}
        
        <Button
          type="submit"
          loading={isLoading}
          className="ml-auto"
        >
          Continue to Payment
        </Button>
      </div>
    </form>
  )
}

export { ShippingAddressForm }