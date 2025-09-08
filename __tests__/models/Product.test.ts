import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import Product, { IProduct, IProductVariant } from '../../lib/db/models/Product'

// Test database connection
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce-test'
  await mongoose.connect(mongoUri, {
    dbName: 'fashion-ecommerce-test'
  })
}, 30000) // 30 second timeout for database connection

afterAll(async () => {
  await mongoose.connection.close()
}, 30000)

beforeEach(async () => {
  // Clean up the Product collection before each test
  await Product.deleteMany({})
})

describe('Product Model', () => {
  const validProductData = {
    name: 'Classic Cotton T-Shirt',
    description: 'A comfortable and stylish cotton t-shirt perfect for everyday wear',
    price: 29.99,
    images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    category: new mongoose.Types.ObjectId(),
    brand: 'FashionBrand',
    inventory: 100
  }

  const validVariantData: IProductVariant = {
    size: 'M',
    color: 'blue',
    sku: 'TSH-BLU-M-001',
    inventory: 25
  }

  describe('Product Creation', () => {
    it('should create a valid product', async () => {
      const product = new Product(validProductData)
      const savedProduct = await product.save()

      expect(savedProduct._id).toBeDefined()
      expect(savedProduct.name).toBe(validProductData.name)
      expect(savedProduct.description).toBe(validProductData.description)
      expect(savedProduct.price).toBe(validProductData.price)
      expect(savedProduct.brand).toBe(validProductData.brand)
      expect(savedProduct.inventory).toBe(validProductData.inventory)
      expect(savedProduct.rating).toBe(0)
      expect(savedProduct.reviewCount).toBe(0)
      expect(savedProduct.createdAt).toBeDefined()
      expect(savedProduct.updatedAt).toBeDefined()
    })

    it('should generate searchable text on save', async () => {
      const product = new Product(validProductData)
      const savedProduct = await product.save()

      expect(savedProduct.searchableText).toContain('classic cotton t-shirt')
      expect(savedProduct.searchableText).toContain('fashionbrand')
      expect(savedProduct.searchableText).toContain('comfortable')
    })
  })

  describe('Product Validation', () => {
    it('should require name', async () => {
      const productData = { ...validProductData }
      delete (productData as any).name

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Product name is required')
    })

    it('should require description', async () => {
      const productData = { ...validProductData }
      delete (productData as any).description

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Product description is required')
    })

    it('should require price', async () => {
      const productData = { ...validProductData }
      delete (productData as any).price

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Product price is required')
    })

    it('should require at least one image', async () => {
      const productData = { ...validProductData, images: [] }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Product must have between 1 and 10 images')
    })

    it('should not allow more than 10 images', async () => {
      const productData = { 
        ...validProductData, 
        images: Array(11).fill('https://example.com/image.jpg')
      }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Product must have between 1 and 10 images')
    })

    it('should require category', async () => {
      const productData = { ...validProductData }
      delete (productData as any).category

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Product category is required')
    })

    it('should require brand', async () => {
      const productData = { ...validProductData }
      delete (productData as any).brand

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Product brand is required')
    })

    it('should not allow negative price', async () => {
      const productData = { ...validProductData, price: -10 }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Price cannot be negative')
    })

    it('should not allow negative inventory', async () => {
      const productData = { ...validProductData, inventory: -5 }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Inventory cannot be negative')
    })

    it('should validate name length', async () => {
      const productData = { ...validProductData, name: 'A' }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Product name must be at least 2 characters long')
    })

    it('should validate description length', async () => {
      const productData = { ...validProductData, description: 'Short' }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Product description must be at least 10 characters long')
    })
  })

  describe('Product Variants', () => {
    it('should create product with variants', async () => {
      const productData = {
        ...validProductData,
        variants: [validVariantData]
      }

      const product = new Product(productData)
      const savedProduct = await product.save()

      expect(savedProduct.variants).toHaveLength(1)
      expect(savedProduct.variants[0].size).toBe('M')
      expect(savedProduct.variants[0].color).toBe('blue')
      expect(savedProduct.variants[0].sku).toBe('TSH-BLU-M-001')
      expect(savedProduct.variants[0].inventory).toBe(25)
    })

    it('should calculate total inventory from variants', async () => {
      const variants: IProductVariant[] = [
        { size: 'S', color: 'blue', sku: 'TSH-BLU-S-001', inventory: 10 },
        { size: 'M', color: 'blue', sku: 'TSH-BLU-M-001', inventory: 15 },
        { size: 'L', color: 'blue', sku: 'TSH-BLU-L-001', inventory: 20 }
      ]

      const productData = {
        ...validProductData,
        variants,
        inventory: 0 // This should be overridden
      }

      const product = new Product(productData)
      const savedProduct = await product.save()

      expect(savedProduct.inventory).toBe(45) // 10 + 15 + 20
    })

    it('should require SKU for variants', async () => {
      const variantData = { ...validVariantData }
      delete (variantData as any).sku

      const productData = {
        ...validProductData,
        variants: [variantData]
      }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('SKU is required for variant')
    })

    it('should validate SKU format', async () => {
      const variantData = { ...validVariantData, sku: 'invalid sku!' }

      const productData = {
        ...validProductData,
        variants: [variantData]
      }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('SKU must be 3-20 characters with letters, numbers, hyphens, or underscores')
    })

    it('should not allow duplicate SKUs within a product', async () => {
      const variants: IProductVariant[] = [
        { size: 'S', color: 'blue', sku: 'TSH-BLU-001', inventory: 10 },
        { size: 'M', color: 'red', sku: 'TSH-BLU-001', inventory: 15 } // Duplicate SKU
      ]

      const productData = {
        ...validProductData,
        variants
      }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('All variant SKUs must be unique within a product')
    })

    it('should not allow negative variant inventory', async () => {
      const variantData = { ...validVariantData, inventory: -5 }

      const productData = {
        ...validProductData,
        variants: [variantData]
      }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Inventory cannot be negative')
    })

    it('should allow optional variant price', async () => {
      const variantData = { ...validVariantData, price: 35.99 }

      const productData = {
        ...validProductData,
        variants: [variantData]
      }

      const product = new Product(productData)
      const savedProduct = await product.save()

      expect(savedProduct.variants[0].price).toBe(35.99)
    })

    it('should not allow negative variant price', async () => {
      const variantData = { ...validVariantData, price: -10 }

      const productData = {
        ...validProductData,
        variants: [variantData]
      }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Variant price cannot be negative')
    })

    it('should normalize size to uppercase and color to lowercase', async () => {
      const variantData = { 
        ...validVariantData, 
        size: 'xl', 
        color: 'NAVY BLUE' 
      }

      const productData = {
        ...validProductData,
        variants: [variantData]
      }

      const product = new Product(productData)
      const savedProduct = await product.save()

      expect(savedProduct.variants[0].size).toBe('XL')
      expect(savedProduct.variants[0].color).toBe('navy blue')
    })
  })

  describe('Product Search and Indexing', () => {
    it('should include variant information in searchable text', async () => {
      const variants: IProductVariant[] = [
        { size: 'S', color: 'red', sku: 'TSH-RED-S-001', inventory: 10 },
        { size: 'M', color: 'blue', sku: 'TSH-BLU-M-001', inventory: 15 }
      ]

      const productData = {
        ...validProductData,
        variants
      }

      const product = new Product(productData)
      const savedProduct = await product.save()

      expect(savedProduct.searchableText).toContain('s red')
      expect(savedProduct.searchableText).toContain('m blue')
    })
  })

  describe('Product Rating', () => {
    it('should default rating to 0', async () => {
      const product = new Product(validProductData)
      const savedProduct = await product.save()

      expect(savedProduct.rating).toBe(0)
      expect(savedProduct.reviewCount).toBe(0)
    })

    it('should not allow rating below 0', async () => {
      const productData = { ...validProductData, rating: -1 }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Rating cannot be less than 0')
    })

    it('should not allow rating above 5', async () => {
      const productData = { ...validProductData, rating: 6 }

      const product = new Product(productData)
      
      await expect(product.save()).rejects.toThrow('Rating cannot be more than 5')
    })
  })
})