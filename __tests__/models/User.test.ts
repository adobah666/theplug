import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User, { IUser } from '../../lib/db/models/User'

describe('User Model', () => {

  describe('User Model Validation', () => {
    it('should create a valid user instance with required fields', () => {
      const userData = {
        email: 'test@example.com',
        name: 'John Doe',
        password: 'password123'
      }

      const user = new User(userData)

      expect(user.email).toBe(userData.email)
      expect(user.name).toBe(userData.name)
      expect(user.password).toBe(userData.password)
      expect(user.emailVerified).toBe(false)
      expect(user.addresses).toEqual([])
      expect(user.wishlist).toEqual([])
    })

    it('should create a user with optional phone number', () => {
      const userData = {
        email: 'test@example.com',
        name: 'John Doe',
        password: 'password123',
        phone: '+1234567890'
      }

      const user = new User(userData)
      expect(user.phone).toBe(userData.phone)
    })

    it('should validate required fields', () => {
      const userData = {
        email: 'test@example.com'
        // Missing name and password
      }

      const user = new User(userData)
      const validationError = user.validateSync()
      
      expect(validationError).toBeDefined()
      expect(validationError?.errors.name).toBeDefined()
      expect(validationError?.errors.password).toBeDefined()
    })
  })

  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ]

      for (const email of validEmails) {
        const user = new User({
          email,
          name: 'Test User',
          password: 'password123'
        })
        
        const validationError = user.validateSync()
        expect(validationError?.errors.email).toBeUndefined()
      }
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test@.com',
        'test@example',
        ''
      ]

      for (const email of invalidEmails) {
        const user = new User({
          email,
          name: 'Test User',
          password: 'password123'
        })
        
        const validationError = user.validateSync()
        expect(validationError?.errors.email).toBeDefined()
      }
    })

    it('should convert email to lowercase', () => {
      const user = new User({
        email: 'TEST@EXAMPLE.COM',
        name: 'Test User',
        password: 'password123'
      })

      expect(user.email).toBe('test@example.com')
    })
  })

  describe('Password Validation and Hashing', () => {
    it('should validate password length', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'John Doe',
        password: '1234567' // 7 characters
      })

      const validationError = user.validateSync()
      expect(validationError?.errors.password).toBeDefined()
    })

    it('should accept valid password length', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'John Doe',
        password: 'password123' // 11 characters
      })

      const validationError = user.validateSync()
      expect(validationError?.errors.password).toBeUndefined()
    })

    it('should have comparePassword method', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'John Doe',
        password: 'password123'
      })

      expect(typeof user.comparePassword).toBe('function')
    })

    it('should test password hashing functionality', async () => {
      const plainPassword = 'password123'
      const hashedPassword = await bcrypt.hash(plainPassword, 12)
      
      expect(hashedPassword).not.toBe(plainPassword)
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$/)
      
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword)
      expect(isMatch).toBe(true)
      
      const isWrongMatch = await bcrypt.compare('wrongpassword', hashedPassword)
      expect(isWrongMatch).toBe(false)
    })
  })

  describe('Phone Validation', () => {
    it('should accept valid phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '1234567890',
        '+1 (234) 567-8900',
        '+44 20 7946 0958'
      ]

      for (const phone of validPhones) {
        const user = new User({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
          phone
        })
        
        const validationError = user.validateSync()
        expect(validationError?.errors.phone).toBeUndefined()
      }
    })

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123', // Too short
        'abc123def', // Contains letters
        '++1234567890' // Invalid format
      ]

      for (const phone of invalidPhones) {
        const user = new User({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
          phone
        })
        
        const validationError = user.validateSync()
        expect(validationError?.errors.phone).toBeDefined()
      }
    })
  })

  describe('Address Management', () => {
    it('should add valid addresses', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'John Doe',
        password: 'password123'
      })

      const address = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        isDefault: true
      }

      user.addresses.push(address)

      expect(user.addresses).toHaveLength(1)
      expect(user.addresses[0].street).toBe(address.street)
      expect(user.addresses[0].isDefault).toBe(true)
    })

    it('should validate required address fields', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'John Doe',
        password: 'password123'
      })

      const incompleteAddress = {
        street: '123 Main St',
        city: 'New York'
        // Missing state, zipCode, country
      }

      user.addresses.push(incompleteAddress as any)
      
      const validationError = user.validateSync()
      expect(validationError?.errors['addresses.0.state']).toBeDefined()
      expect(validationError?.errors['addresses.0.zipCode']).toBeDefined()
      expect(validationError?.errors['addresses.0.country']).toBeDefined()
    })

    it('should validate ZIP code format', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'John Doe',
        password: 'password123'
      })

      const addressWithInvalidZip = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: 'invalid', // Invalid ZIP format
        country: 'USA',
        isDefault: false
      }

      user.addresses.push(addressWithInvalidZip)
      
      const validationError = user.validateSync()
      expect(validationError?.errors['addresses.0.zipCode']).toBeDefined()
    })

    it('should accept valid ZIP code formats', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'John Doe',
        password: 'password123'
      })

      const validZipCodes = ['10001', '90210-1234']

      for (const zipCode of validZipCodes) {
        const address = {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode,
          country: 'USA',
          isDefault: false
        }

        const testUser = new User({
          email: 'test@example.com',
          name: 'John Doe',
          password: 'password123',
          addresses: [address]
        })
        
        const validationError = testUser.validateSync()
        expect(validationError?.errors[`addresses.0.zipCode`]).toBeUndefined()
      }
    })
  })

  describe('Name Validation', () => {
    it('should reject names that are too short', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'A', // 1 character, minimum is 2
        password: 'password123'
      })

      const validationError = user.validateSync()
      expect(validationError?.errors.name).toBeDefined()
    })

    it('should reject names that are too long', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'A'.repeat(101), // 101 characters, maximum is 100
        password: 'password123'
      })

      const validationError = user.validateSync()
      expect(validationError?.errors.name).toBeDefined()
    })

    it('should trim whitespace from names', () => {
      const user = new User({
        email: 'test@example.com',
        name: '  John Doe  ',
        password: 'password123'
      })

      expect(user.name).toBe('John Doe')
    })

    it('should accept valid name lengths', () => {
      const user = new User({
        email: 'test@example.com',
        name: 'John Doe', // Valid length
        password: 'password123'
      })

      const validationError = user.validateSync()
      expect(validationError?.errors.name).toBeUndefined()
    })
  })
})