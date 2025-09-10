'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ShippingAddress } from '@/types/checkout'
import { validateShippingAddress, formatValidationErrors } from '@/lib/checkout/validation'
import { MapPickerModal } from './MapPickerModal'

interface SavedAddress {
  id: string
  firstName: string
  lastName: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

interface ShippingAddressFormProps {
  initialData?: Partial<ShippingAddress>
  onSubmit: (data: ShippingAddress, options?: { saveAddress?: boolean }) => void
  onBack?: () => void
  isLoading?: boolean
}

const ShippingAddressForm: React.FC<ShippingAddressFormProps> = ({
  initialData = {},
  onSubmit,
  onBack,
  isLoading = false
}) => {
  const { session } = useAuth()
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(false)

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
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)

  // Fetch saved addresses on mount
  useEffect(() => {
    if (!session?.user) return
    
    const fetchAddresses = async () => {
      try {
        setLoadingAddresses(true)
        const res = await fetch('/api/auth/addresses')
        if (res.ok) {
          const addresses = await res.json()
          setSavedAddresses(Array.isArray(addresses) ? addresses : [])
          
          // If no addresses, show form immediately
          if (!addresses || addresses.length === 0) {
            setShowNewAddressForm(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch addresses:', error)
        setShowNewAddressForm(true)
      } finally {
        setLoadingAddresses(false)
      }
    }
    
    fetchAddresses()
  }, [session])

  // Reverse geocode helper used by map confirm
  const reverseGeocodeAndFill = async (lat: number, lon: number) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY || 'bd603f696b62465599f055e3b99cd4bc'
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&apiKey=${apiKey}`
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      const feat = Array.isArray(data?.features) && data.features.length > 0 ? data.features[0] : null
      const props = feat?.properties || {}
      const streetLine = [props.house_number, props.street].filter(Boolean).join(' ').trim() || props.address_line1 || ''
      const city = props.city || props.town || props.suburb || ''
      const state = props.state || props.region || ''
      const zip = props.postcode || ''
      const country = props.country || 'Ghana'
      setFormData(prev => ({
        ...prev,
        street: streetLine || prev.street,
        city: city || prev.city,
        state: state || prev.state,
        zipCode: zip || prev.zipCode,
        country: country || prev.country,
        latitude: lat,
        longitude: lon,
      }))
    } catch (e) {
      // If reverse geocode fails, at least set coords
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }))
    }
  }

  // Use browser geolocation + Geoapify reverse geocoding
  const handleUseMyLocation = async () => {
    setLocError(null)
    if (!('geolocation' in navigator)) {
      setLocError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 })
      })
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude

      const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY || 'bd603f696b62465599f055e3b99cd4bc'
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&apiKey=${apiKey}`
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      const feat = Array.isArray(data?.features) && data.features.length > 0 ? data.features[0] : null
      const props = feat?.properties || {}

      // Build address parts with sensible fallbacks
      const streetLine = [props.house_number, props.street].filter(Boolean).join(' ').trim() || props.address_line1 || ''
      const city = props.city || props.town || props.suburb || ''
      const state = props.state || props.region || ''
      const zip = props.postcode || ''
      const country = props.country || 'Ghana'

      setFormData(prev => ({
        ...prev,
        street: streetLine || prev.street,
        city: city || prev.city,
        state: state || prev.state,
        zipCode: zip || prev.zipCode,
        country: country || prev.country,
        latitude: lat,
        longitude: lon,
      }))
    } catch (err: any) {
      setLocError(err?.message || 'Failed to get current location')
    } finally {
      setLocating(false)
    }
  }

  // Handle address selection
  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId)
    if (addressId === 'new') {
      setShowNewAddressForm(true)
      // Clear form for new address
      setFormData({
        firstName: '',
        lastName: '',
        email: initialData.email || '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Ghana'
      })
    } else {
      setShowNewAddressForm(false)
      const selected = savedAddresses.find(addr => addr.id === addressId)
      if (selected) {
        setFormData({
          firstName: selected.firstName,
          lastName: selected.lastName,
          email: initialData.email || '',
          phone: '',
          street: selected.street,
          city: selected.city,
          state: selected.state,
          zipCode: selected.postalCode,
          country: selected.country
        })
      }
    }
  }

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // If using saved address, submit directly
    if (selectedAddressId && selectedAddressId !== 'new' && !showNewAddressForm) {
      const validation = validateShippingAddress(formData)
      if (validation.success) {
        onSubmit(validation.data, { saveAddress: false })
      }
      return
    }
    
    // Validate new address form
    const validation = validateShippingAddress(formData)
    
    if (!validation.success) {
      setErrors(formatValidationErrors(validation.error))
      return
    }

    onSubmit(validation.data, { saveAddress })
  }

  const ghanaRegions = [
    'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra',
    'North East', 'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta',
    'Western', 'Western North'
  ]

  // Show loading state
  if (loadingAddresses) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Saved Addresses Section */}
      {session?.user && savedAddresses.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Address</h3>
          <div className="space-y-3">
            {savedAddresses.map((address) => (
              <div
                key={address.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedAddressId === address.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleAddressSelect(address.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="address"
                      value={address.id}
                      checked={selectedAddressId === address.id}
                      onChange={() => handleAddressSelect(address.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {address.firstName} {address.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {address.street}
                      </p>
                      <p className="text-sm text-gray-600">
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="text-sm text-gray-600">{address.country}</p>
                    </div>
                  </div>
                  {address.isDefault && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Default
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {/* Add New Address Option */}
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedAddressId === 'new'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleAddressSelect('new')}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="address"
                  value="new"
                  checked={selectedAddressId === 'new'}
                  onChange={() => handleAddressSelect('new')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Add New Address</p>
                  <p className="text-sm text-gray-600">Use a different address</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Form - Show if no saved addresses or "Add New" is selected */}
      {(savedAddresses.length === 0 || showNewAddressForm) && (
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
          <div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Street Address"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  error={errors.street}
                  placeholder="Enter your full street address"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleUseMyLocation} disabled={isLoading || locating} className="whitespace-nowrap h-10">
                  {locating ? 'Locating…' : 'Use my location'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setMapOpen(true)} disabled={isLoading} className="whitespace-nowrap h-10">
                  Adjust on map
                </Button>
              </div>
            </div>
            {locError && <p className="mt-1 text-sm text-red-600">{locError}</p>}
            {(formData.latitude && formData.longitude) && (
              <p className="mt-1 text-xs text-gray-500">Lat: {formData.latitude.toFixed(6)}, Lng: {formData.longitude.toFixed(6)}</p>
            )}
          </div>

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

          {/* Save Address Checkbox - Only show for new addresses */}
          {session?.user && (savedAddresses.length === 0 || selectedAddressId === 'new') && (
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
          )}

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
      )}

      {/* Quick Submit for Saved Address */}
      {selectedAddressId && selectedAddressId !== 'new' && !showNewAddressForm && (
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
            onClick={handleSubmit}
            loading={isLoading}
            className="ml-auto"
          >
            Continue to Payment
          </Button>
        </div>
      )}

      {/* Map Picker Modal */}
      <MapPickerModal
        open={mapOpen}
        apiKey={process.env.NEXT_PUBLIC_GEOAPIFY_KEY || 'bd603f696b62465599f055e3b99cd4bc'}
        lat={typeof formData.latitude === 'number' ? formData.latitude : undefined}
        lon={typeof formData.longitude === 'number' ? formData.longitude : undefined}
        onClose={() => setMapOpen(false)}
        onConfirm={({ lat, lon }) => {
          reverseGeocodeAndFill(lat, lon)
          setMapOpen(false)
        }}
      />
    </div>
  )
}

export { ShippingAddressForm }