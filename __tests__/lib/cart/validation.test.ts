import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import connectDB, { disconnectDB } from '@/lib/db/connection'
import Cart from '@/lib/db/models/Cart'
import Product from '@/lib/db/models/Product'
import User from '@/lib/db/models/User'
import Category from '@/lib/db/models/Category'
import { 
  validateCartItems, 
  validateCartTotals, 
  checkInventoryAvailability 
} from '@/lib/cart/validation'

describe('Cart Validation', () => {
  let testUser: any
  let testProduct: any
  let testCategory: any
  let testCart: any

  beforeEach(async () => {
    await connectDB()
    
    // Clean up existing data
    await Cart.deleteMany({})
    await Product.deleteMany({})
    await User.deleteMany({})
    await Category.deleteMany({})

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Test category description',
      slug: 'test-category'
    })

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123'
    })

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'Test product description',
      price: 99.99,
      images: ['test-image.jpg'],
      category: testCategory._id,
      brand: 'Test Brand',
      inventory: 10,
      variants: [
        {
          size: 'M',
          color: 'red',
          sku: 'TEST-M-RED',
          inventory: 5
        },
        {
          size: 'L',
          color: 'blue',
          sku: 'TEST-L-BLUE',
          inventory: 3
        }
      ]
    })

    // Create test cart
    testCart = await Cart.create({
      userId: testUser._id,
      items: [
        {
          productId: testProduct._id,
          quantity: 2,
          price: testProduct.price,
          name: testProduct.name,
          image: testProduct.images[0]
        }
      ]
    })
  })

  afterEach(async () => {
    await Cart.deleteMany({})
    await Product.deleteMany({})
    await User.deleteMany({})
    await Category.deleteMany({})
  })

  describe('validateCartItems', () => {
    it('should validate cart with valid items', async () => {
      const result = await validateCartItems(testCart)

      expect(result.isValid).toBe(true)
      expect(result.removedItems).toHaveLength(0)
      expect(result.updatedItems).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should remove items for non-existent products', async () => {
      // Delete the product
      await Product.findByIdAndDelete(testProduct._id)

      const result = await validateCartItems(testCart)

      expect(result.isValid).toBe(false)
      expect(result.removedItems).toHaveLength(1)
      expect(result.errors).toContain('Product "Test Product" is no longer available')
      expect(testCart.items).toHaveLength(0)
    })

    it('should remove items for out of stock products', async () => {
      // Set product inventory to 0
      await Product.findByIdAndUpdate(testProduct._id, { inventory: 0 })

      const result = await validateCartItems(testCart)

      expect(result.isValid).toBe(false)
      expect(result.removedItems).toHaveLength(1)
      expect(result.errors).toContain('"Test Product" is out of stock')
      expect(testCart.items).toHaveLength(0)
    })

    it('should adjust quantity when exceeding available inventory', async () => {
      // Set product inventory to 1 (less than cart quantity of 2)
      await Product.findByIdAndUpdate(testProduct._id, { inventory: 1 })

      const result = await validateCartItems(testCart)

      expect(result.isValid).toBe(false)
      expect(result.updatedItems).toHaveLength(1)
      expect(result.errors).toContain('Quantity for "Test Product" reduced to 1 (maximum available)')
      expect(testCart.items[0].quantity).toBe(1)
    })

    it('should update price when product price changes', async () => {
      // Update product price
      const newPrice = 149.99
      await Product.findByIdAndUpdate(testProduct._id, { price: newPrice })

      const result = await validateCartItems(testCart)

      expect(result.isValid).toBe(false)
      expect(result.updatedItems).toHaveLength(1)
      expect(result.errors).toContain('Price for "Test Product" has been updated')
      expect(testCart.items[0].price).toBe(newPrice)
    })

    it('should handle variant validation', async () => {
      // Create cart with variant item
      const variant = testProduct.variants[0]
      const cartWithVariant = await Cart.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            variantId: variant._id.toString(),
            quantity: 2,
            price: testProduct.price,
            name: testProduct.name,
            image: testProduct.images[0],
            size: variant.size,
            color: variant.color
          }
        ]
      })

      const result = await validateCartItems(cartWithVariant)

      expect(result.isValid).toBe(true)
      expect(cartWithVariant.items).toHaveLength(1)
    })

    it('should remove items with invalid variants', async () => {
      // Create cart with invalid variant
      const cartWithInvalidVariant = await Cart.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            variantId: '507f1f77bcf86cd799439011', // Non-existent variant ID
            quantity: 1,
            price: testProduct.price,
            name: testProduct.name,
            image: testProduct.images[0]
          }
        ]
      })

      const result = await validateCartItems(cartWithInvalidVariant)

      expect(result.isValid).toBe(false)
      expect(result.removedItems).toHaveLength(1)
      expect(result.errors).toContain('Variant for "Test Product" is no longer available')
      expect(cartWithInvalidVariant.items).toHaveLength(0)
    })

    it('should adjust quantity for variant with limited inventory', async () => {
      // Create cart with variant item exceeding variant inventory
      const variant = testProduct.variants[1] // Has inventory of 3
      const cartWithVariant = await Cart.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            variantId: variant._id.toString(),
            quantity: 5, // Exceeds variant inventory of 3
            price: testProduct.price,
            name: testProduct.name,
            image: testProduct.images[0],
            size: variant.size,
            color: variant.color
          }
        ]
      })

      const result = await validateCartItems(cartWithVariant)

      expect(result.isValid).toBe(false)
      expect(result.updatedItems).toHaveLength(1)
      expect(result.errors).toContain('Quantity for "Test Product" reduced to 3 (maximum available)')
      expect(cartWithVariant.items[0].quantity).toBe(3)
    })
  })

  describe('validateCartTotals', () => {
    it('should validate correct cart totals', () => {
      const result = validateCartTotals(testCart)
      expect(result).toBe(true)
    })

    it('should fix incorrect subtotal', () => {
      testCart.subtotal = 50.00 // Incorrect subtotal
      const result = validateCartTotals(testCart)
      
      expect(result).toBe(false)
      expect(testCart.subtotal).toBe(199.98) // 2 * 99.99
    })

    it('should fix incorrect item count', () => {
      testCart.itemCount = 5 // Incorrect item count
      const result = validateCartTotals(testCart)
      
      expect(result).toBe(false)
      expect(testCart.itemCount).toBe(2)
    })
  })

  describe('checkInventoryAvailability', () => {
    it('should return available for valid quantity', async () => {
      const result = await checkInventoryAvailability(testProduct._id.toString(), 5)
      
      expect(result.available).toBe(true)
      expect(result.maxQuantity).toBe(8) // 5 + 3 from variants
      expect(result.error).toBeUndefined()
    })

    it('should return unavailable for excessive quantity', async () => {
      const result = await checkInventoryAvailability(testProduct._id.toString(), 15)
      
      expect(result.available).toBe(false)
      expect(result.maxQuantity).toBe(8) // 5 + 3 from variants
      expect(result.error).toBe('Only 8 items available in stock')
    })

    it('should return unavailable for out of stock product', async () => {
      await Product.findByIdAndUpdate(testProduct._id, { inventory: 0 })
      
      const result = await checkInventoryAvailability(testProduct._id.toString(), 1)
      
      expect(result.available).toBe(false)
      expect(result.maxQuantity).toBe(0)
      expect(result.error).toBe('Product is out of stock')
    })

    it('should return unavailable for non-existent product', async () => {
      const result = await checkInventoryAvailability('507f1f77bcf86cd799439011', 1)
      
      expect(result.available).toBe(false)
      expect(result.maxQuantity).toBe(0)
      expect(result.error).toBe('Product not found')
    })

    it('should check variant inventory', async () => {
      const variant = testProduct.variants[1] // Has inventory of 3
      const result = await checkInventoryAvailability(
        testProduct._id.toString(), 
        2, 
        variant._id.toString()
      )
      
      expect(result.available).toBe(true)
      expect(result.maxQuantity).toBe(3)
    })

    it('should return unavailable for excessive variant quantity', async () => {
      const variant = testProduct.variants[1] // Has inventory of 3
      const result = await checkInventoryAvailability(
        testProduct._id.toString(), 
        5, 
        variant._id.toString()
      )
      
      expect(result.available).toBe(false)
      expect(result.maxQuantity).toBe(3)
      expect(result.error).toBe('Only 3 items available in stock')
    })

    it('should return unavailable for non-existent variant', async () => {
      const result = await checkInventoryAvailability(
        testProduct._id.toString(), 
        1, 
        '507f1f77bcf86cd799439011'
      )
      
      expect(result.available).toBe(false)
      expect(result.maxQuantity).toBe(0)
      expect(result.error).toBe('Product variant not found')
    })
  })
})