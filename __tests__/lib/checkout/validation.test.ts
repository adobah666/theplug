import { 
  validateShippingAddress, 
  validatePaymentMethod, 
  validateCheckoutForm,
  formatValidationErrors
} from '@/lib/checkout/validation'
import { z } from 'zod'

describe('Checkout Validation', () => {
  describe('validateShippingAddress', () => {
    it('validates valid shipping address', () => {
      const validAddress = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+2348012345678',
        street: '123 Main Street',
        city: 'Lagos',
        state: 'Lagos',
        zipCode: '100001',
        country: 'Nigeria'
      }

      const result = validateShippingAddress(validAddress)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validAddress)
      }
    })

    it('rejects invalid email', () => {
      const invalidAddress = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        phone: '+2348012345678',
        street: '123 Main Street',
        city: 'Lagos',
        state: 'Lagos',
        zipCode: '100001',
        country: 'Nigeria'
      }

      const result = validateShippingAddress(invalidAddress)
      expect(result.success).toBe(false)
    })

    it('rejects missing required fields', () => {
      const incompleteAddress = {
        firstName: 'John',
        // Missing lastName
        email: 'john.doe@example.com',
        phone: '+2348012345678',
        street: '123 Main Street',
        city: 'Lagos',
        state: 'Lagos',
        zipCode: '100001',
        country: 'Nigeria'
      }

      const result = validateShippingAddress(incompleteAddress)
      expect(result.success).toBe(false)
    })

    it('rejects phone number that is too short', () => {
      const invalidAddress = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '123',
        street: '123 Main Street',
        city: 'Lagos',
        state: 'Lagos',
        zipCode: '100001',
        country: 'Nigeria'
      }

      const result = validateShippingAddress(invalidAddress)
      expect(result.success).toBe(false)
    })
  })

  describe('validatePaymentMethod', () => {
    it('validates card payment method with all details', () => {
      const validCard = {
        type: 'card' as const,
        cardNumber: '1234567890123456',
        expiryMonth: '12',
        expiryYear: '25',
        cvv: '123',
        cardholderName: 'John Doe'
      }

      const result = validatePaymentMethod(validCard)
      expect(result.success).toBe(true)
    })

    it('validates bank transfer payment method', () => {
      const validBankTransfer = {
        type: 'bank_transfer' as const
      }

      const result = validatePaymentMethod(validBankTransfer)
      expect(result.success).toBe(true)
    })

    it('rejects card payment without required details', () => {
      const invalidCard = {
        type: 'card' as const,
        cardNumber: '1234567890123456'
        // Missing other required fields
      }

      const result = validatePaymentMethod(invalidCard)
      expect(result.success).toBe(false)
    })

    it('rejects invalid payment type', () => {
      const invalidPayment = {
        type: 'invalid_type'
      }

      const result = validatePaymentMethod(invalidPayment)
      expect(result.success).toBe(false)
    })
  })

  describe('validateCheckoutForm', () => {
    it('validates complete checkout form', () => {
      const validForm = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+2348012345678',
          street: '123 Main Street',
          city: 'Lagos',
          state: 'Lagos',
          zipCode: '100001',
          country: 'Nigeria'
        },
        paymentMethod: {
          type: 'card' as const,
          cardNumber: '1234567890123456',
          expiryMonth: '12',
          expiryYear: '25',
          cvv: '123',
          cardholderName: 'John Doe'
        },
        agreeToTerms: true
      }

      const result = validateCheckoutForm(validForm)
      expect(result.success).toBe(true)
    })

    it('rejects form without agreeing to terms', () => {
      const invalidForm = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+2348012345678',
          street: '123 Main Street',
          city: 'Lagos',
          state: 'Lagos',
          zipCode: '100001',
          country: 'Nigeria'
        },
        paymentMethod: {
          type: 'bank_transfer' as const
        },
        agreeToTerms: false
      }

      const result = validateCheckoutForm(invalidForm)
      expect(result.success).toBe(false)
    })
  })

  describe('formatValidationErrors', () => {
    it('formats zod errors correctly', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['firstName'],
          message: 'First name is required'
        },
        {
          code: 'invalid_string',
          validation: 'email',
          path: ['email'],
          message: 'Invalid email address'
        }
      ])

      const formatted = formatValidationErrors(zodError)
      expect(formatted).toEqual({
        firstName: 'First name is required',
        email: 'Invalid email address'
      })
    })

    it('handles nested path errors', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['shippingAddress', 'firstName'],
          message: 'First name is required'
        }
      ])

      const formatted = formatValidationErrors(zodError)
      expect(formatted).toEqual({
        'shippingAddress.firstName': 'First name is required'
      })
    })
  })
})