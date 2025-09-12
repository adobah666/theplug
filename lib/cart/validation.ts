import Cart, { ICart, ICartItem } from '@/lib/db/models/Cart'
import Product, { type IProductVariant } from '@/lib/db/models/Product'
import mongoose from 'mongoose'

export interface CartValidationResult {
  isValid: boolean
  removedItems: ICartItem[]
  updatedItems: ICartItem[]
  errors: string[]
}

/**
 * Validates cart items against current product data and inventory
 * Removes unavailable items and updates prices if needed
 */
export async function validateCartItems(cart: ICart): Promise<CartValidationResult> {
  const result: CartValidationResult = {
    isValid: true,
    removedItems: [],
    updatedItems: [],
    errors: []
  }

  if (!cart.items || cart.items.length === 0) {
    return result
  }

  // Get all unique product IDs from cart
  const productIds = [...new Set(cart.items.map(item => item.productId.toString()))]
  
  // Fetch all products at once for efficiency
  const products = await Product.find({
    _id: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) }
  })

  // Create a map for quick product lookup
  const productMap = new Map<string, any>(products.map((p: any) => [p._id.toString(), p]))

  const validItems: ICartItem[] = []

  for (const item of cart.items) {
    const product = productMap.get(item.productId.toString())
    
    // Remove item if product no longer exists
    if (!product) {
      result.removedItems.push(item)
      result.errors.push(`Product "${item.name}" is no longer available`)
      result.isValid = false
      continue
    }

    // Check variant if item has one
    let availableInventory = product.inventory
    let currentPrice = product.price
    let isVariantValid = true

    if (item.variantId) {
      const variant = (product.variants as any[]).find((v: any) => v._id?.toString() === item.variantId)
      
      if (!variant) {
        result.removedItems.push(item)
        result.errors.push(`Variant for "${item.name}" is no longer available`)
        result.isValid = false
        continue
      }
      
      availableInventory = variant.inventory
      currentPrice = variant.price || product.price
    }

    // Check if product/variant is out of stock
    if (availableInventory === 0) {
      result.removedItems.push(item)
      result.errors.push(`"${item.name}" is out of stock`)
      result.isValid = false
      continue
    }

    // Adjust quantity if it exceeds available inventory
    let adjustedQuantity = item.quantity
    if (item.quantity > availableInventory) {
      adjustedQuantity = availableInventory
      result.updatedItems.push({
        ...item,
        quantity: adjustedQuantity
      })
      result.errors.push(`Quantity for "${item.name}" reduced to ${adjustedQuantity} (maximum available)`)
      result.isValid = false
    }

    // Update price if it has changed
    let updatedItem = { ...item }
    if (Math.abs(item.price - currentPrice) > 0.01) { // Allow for small floating point differences
      updatedItem.price = currentPrice
      result.updatedItems.push(updatedItem)
      result.errors.push(`Price for "${item.name}" has been updated`)
      result.isValid = false
    }

    // Use adjusted quantity if it was changed
    if (adjustedQuantity !== item.quantity) {
      updatedItem.quantity = adjustedQuantity
    }

    validItems.push(updatedItem)
  }

  // Update cart with valid items
  cart.items = validItems

  return result
}

/**
 * Validates and cleans up a cart, removing unavailable items and updating quantities/prices
 */
export async function validateAndCleanCart(cartId: string): Promise<CartValidationResult> {
  const cart = await Cart.findById(cartId)
  
  if (!cart) {
    throw new Error('Cart not found')
  }

  const validationResult = await validateCartItems(cart)
  
  // Save the cart if any changes were made
  if (!validationResult.isValid) {
    await cart.save()
  }

  return validationResult
}

/**
 * Validates cart totals and recalculates if necessary
 */
export function validateCartTotals(cart: ICart): boolean {
  const calculatedSubtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0)
  const calculatedItemCount = cart.items.reduce((total, item) => total + item.quantity, 0)

  // Check if calculated values match stored values (allowing for small floating point differences)
  const subtotalMatches = Math.abs(cart.subtotal - calculatedSubtotal) < 0.01
  const itemCountMatches = cart.itemCount === calculatedItemCount

  if (!subtotalMatches || !itemCountMatches) {
    cart.subtotal = calculatedSubtotal
    cart.itemCount = calculatedItemCount
    return false // Indicates cart was updated
  }

  return true // Cart totals are correct
}

/**
 * Checks if a specific quantity of a product/variant is available
 */
export async function checkInventoryAvailability(
  productId: string, 
  quantity: number, 
  variantId?: string
): Promise<{ available: boolean; maxQuantity: number; error?: string }> {
  const product = await Product.findById(productId)
  
  if (!product) {
    return {
      available: false,
      maxQuantity: 0,
      error: 'Product not found'
    }
  }

  let availableInventory = product.inventory

  if (variantId) {
    const variant = (product.variants as IProductVariant[]).find((v: IProductVariant) => v._id?.toString() === variantId)
    if (!variant) {
      return {
        available: false,
        maxQuantity: 0,
        error: 'Product variant not found'
      }
    }
    availableInventory = variant.inventory
  }

  if (availableInventory === 0) {
    return {
      available: false,
      maxQuantity: 0,
      error: 'Product is out of stock'
    }
  }

  if (quantity > availableInventory) {
    return {
      available: false,
      maxQuantity: availableInventory,
      error: `Only ${availableInventory} items available in stock`
    }
  }

  return {
    available: true,
    maxQuantity: availableInventory
  }
}