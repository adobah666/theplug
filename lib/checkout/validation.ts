import { z } from 'zod'

// Shipping address validation schema
export const shippingAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number is too long'),
  street: z.string().min(1, 'Street address is required').max(100, 'Street address is too long'),
  city: z.string().min(1, 'City is required').max(50, 'City name is too long'),
  // "state" field is used to capture Ghana Region
  state: z.string().min(1, 'Region is required').max(50, 'Region name is too long'),
  // Optional GhanaPost GPS address (stored in zipCode for compatibility)
  zipCode: z.string().max(15, 'GhanaPost address is too long').optional().or(z.literal('')),
  // Country fixed to Ghana
  country: z.literal('Ghana')
})

// Payment method validation schema
export const paymentMethodSchema = z.object({
  type: z.literal('card'),
  cardNumber: z.string().optional(),
  expiryMonth: z.string().optional(),
  expiryYear: z.string().optional(),
  cvv: z.string().optional(),
  cardholderName: z.string().optional()
})

// Complete checkout form validation schema
export const checkoutFormSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: paymentMethodSchema,
  saveAddress: z.boolean().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions'
  })
})

export type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>
export type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>
export type CheckoutFormData = z.infer<typeof checkoutFormSchema>

// Validation helper functions
export const validateShippingAddress = (data: unknown) => {
  return shippingAddressSchema.safeParse(data)
}

export const validatePaymentMethod = (data: unknown) => {
  return paymentMethodSchema.safeParse(data)
}

export const validateCheckoutForm = (data: unknown) => {
  return checkoutFormSchema.safeParse(data)
}

// Format validation errors for display
export const formatValidationErrors = (errors: z.ZodError) => {
  const formattedErrors: Record<string, string> = {}
  
  errors.issues.forEach((error) => {
    const path = error.path.join('.')
    formattedErrors[path] = error.message
  })
  
  return formattedErrors
}