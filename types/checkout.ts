// Checkout-related types

export interface ShippingAddress {
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zipCode?: string
  country: string
}

export interface PaymentMethod {
  type: 'card' | 'bank_transfer'
  cardNumber?: string
  expiryMonth?: string
  expiryYear?: string
  cvv?: string
  cardholderName?: string
}

export interface CheckoutFormData {
  shippingAddress: ShippingAddress
  paymentMethod: PaymentMethod
  saveAddress?: boolean
  agreeToTerms: boolean
}

export interface OrderSummary {
  subtotal: number
  shipping: number
  tax: number
  total: number
  itemCount: number
}

export type CheckoutStep = 'shipping' | 'payment' | 'review'

export interface CheckoutState {
  currentStep: CheckoutStep
  formData: Partial<CheckoutFormData>
  isLoading: boolean
  error: string | null
}