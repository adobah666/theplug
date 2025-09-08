import Order, { IOrder, IOrderItem, OrderStatus, PaymentStatus, PaymentMethod, IShippingAddress } from '@/lib/db/models/Order'
import Product from '@/lib/db/models/Product'
import Cart from '@/lib/db/models/Cart'
import { checkInventoryAvailability } from '@/lib/cart/validation'
import mongoose from 'mongoose'

export interface CreateOrderRequest {
  userId: string
  cartId?: string
  items?: IOrderItem[]
  shippingAddress: IShippingAddress
  paymentMethod: PaymentMethod
  tax?: number
  shipping?: number
  discount?: number
}

export interface OrderCreationResult {
  success: boolean
  order?: IOrder
  errors?: string[]
}

/**
 * Creates a new order from cart or provided items
 */
export async function createOrder(request: CreateOrderRequest): Promise<OrderCreationResult> {
  const session = await mongoose.startSession()
  
  try {
    session.startTransaction()

    // Get order items either from cart or from provided items
    let orderItems: IOrderItem[]
    
    if (request.cartId) {
      const cart = await Cart.findById(request.cartId).session(session)
      if (!cart || cart.items.length === 0) {
        return {
          success: false,
          errors: ['Cart not found or empty']
        }
      }
      
      // Convert cart items to order items
      orderItems = await convertCartItemsToOrderItems(cart.items, session)
    } else if (request.items && request.items.length > 0) {
      orderItems = request.items
    } else {
      return {
        success: false,
        errors: ['No items provided for order']
      }
    }

    // Validate inventory for all items
    const inventoryValidation = await validateOrderInventory(orderItems, session)
    if (!inventoryValidation.success) {
      return {
        success: false,
        errors: inventoryValidation.errors
      }
    }

    // Reserve inventory for all items
    await reserveInventory(orderItems, session)

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const tax = request.tax || 0
    const shipping = request.shipping || 0
    const discount = request.discount || 0
    const total = subtotal + tax + shipping - discount

    // Create the order
    const order = new Order({
      userId: new mongoose.Types.ObjectId(request.userId),
      items: orderItems,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: request.paymentMethod,
      shippingAddress: request.shippingAddress
    })

    await order.save({ session })

    // Clear the cart if order was created from cart
    if (request.cartId) {
      await Cart.findByIdAndDelete(request.cartId).session(session)
    }

    await session.commitTransaction()

    return {
      success: true,
      order
    }

  } catch (error) {
    await session.abortTransaction()
    console.error('Error creating order:', error)
    
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to create order']
    }
  } finally {
    session.endSession()
  }
}

/**
 * Converts cart items to order items with product snapshots
 */
async function convertCartItemsToOrderItems(
  cartItems: any[], 
  session: mongoose.ClientSession
): Promise<IOrderItem[]> {
  const orderItems: IOrderItem[] = []
  
  // Get all unique product IDs
  const productIds = [...new Set(cartItems.map(item => item.productId.toString()))]
  
  // Fetch all products at once
  const products = await Product.find({
    _id: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) }
  }).session(session)

  const productMap = new Map(products.map(p => [p._id.toString(), p]))

  for (const cartItem of cartItems) {
    const product = productMap.get(cartItem.productId.toString())
    
    if (!product) {
      throw new Error(`Product ${cartItem.productId} not found`)
    }

    let unitPrice = product.price
    let size = cartItem.size
    let color = cartItem.color

    // Get variant details if applicable
    if (cartItem.variantId) {
      const variant = product.variants.find(v => v._id?.toString() === cartItem.variantId)
      if (!variant) {
        throw new Error(`Variant ${cartItem.variantId} not found for product ${product.name}`)
      }
      
      unitPrice = variant.price || product.price
      size = variant.size || size
      color = variant.color || color
    }

    orderItems.push({
      productId: product._id,
      variantId: cartItem.variantId,
      productName: product.name,
      productImage: product.images[0],
      size,
      color,
      quantity: cartItem.quantity,
      unitPrice,
      totalPrice: unitPrice * cartItem.quantity
    })
  }

  return orderItems
}

/**
 * Validates inventory availability for all order items
 */
async function validateOrderInventory(
  orderItems: IOrderItem[], 
  session: mongoose.ClientSession
): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = []

  for (const item of orderItems) {
    const inventoryCheck = await checkInventoryAvailability(
      item.productId.toString(),
      item.quantity,
      item.variantId
    )

    if (!inventoryCheck.available) {
      errors.push(`${item.productName}: ${inventoryCheck.error}`)
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  }
}

/**
 * Reserves inventory for order items
 */
async function reserveInventory(
  orderItems: IOrderItem[], 
  session: mongoose.ClientSession
): Promise<void> {
  for (const item of orderItems) {
    const product = await Product.findById(item.productId).session(session)
    
    if (!product) {
      throw new Error(`Product ${item.productId} not found`)
    }

    if (item.variantId) {
      // Reserve variant inventory
      const variantIndex = product.variants.findIndex(v => v._id?.toString() === item.variantId)
      if (variantIndex === -1) {
        throw new Error(`Variant ${item.variantId} not found`)
      }
      
      if (product.variants[variantIndex].inventory < item.quantity) {
        throw new Error(`Insufficient inventory for ${product.name} variant`)
      }
      
      product.variants[variantIndex].inventory -= item.quantity
    } else {
      // Reserve main product inventory
      if (product.inventory < item.quantity) {
        throw new Error(`Insufficient inventory for ${product.name}`)
      }
      
      product.inventory -= item.quantity
    }

    await product.save({ session })
  }
}

/**
 * Restores inventory when an order is cancelled
 */
export async function restoreInventory(orderId: string): Promise<void> {
  const session = await mongoose.startSession()
  
  try {
    session.startTransaction()

    const order = await Order.findById(orderId).session(session)
    if (!order) {
      throw new Error('Order not found')
    }

    for (const item of order.items) {
      const product = await Product.findById(item.productId).session(session)
      
      if (!product) {
        console.warn(`Product ${item.productId} not found when restoring inventory`)
        continue
      }

      if (item.variantId) {
        // Restore variant inventory
        const variantIndex = product.variants.findIndex(v => v._id?.toString() === item.variantId)
        if (variantIndex !== -1) {
          product.variants[variantIndex].inventory += item.quantity
        }
      } else {
        // Restore main product inventory
        product.inventory += item.quantity
      }

      await product.save({ session })
    }

    await session.commitTransaction()
  } catch (error) {
    await session.abortTransaction()
    console.error('Error restoring inventory:', error)
    throw error
  } finally {
    session.endSession()
  }
}

/**
 * Updates order status
 */
export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus, 
  cancelReason?: string
): Promise<IOrder | null> {
  const order = await Order.findById(orderId)
  
  if (!order) {
    return null
  }

  // If cancelling order, restore inventory
  if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
    await restoreInventory(orderId)
    
    if (cancelReason) {
      order.cancelReason = cancelReason
    }
  }

  order.status = status
  await order.save()

  return order
}

/**
 * Gets order by ID with user validation
 */
export async function getOrderById(orderId: string, userId?: string): Promise<IOrder | null> {
  const query: any = { _id: orderId }
  
  if (userId) {
    query.userId = userId
  }

  return await Order.findOne(query).populate('userId', 'name email')
}

/**
 * Gets orders for a specific user
 */
export async function getUserOrders(
  userId: string, 
  page: number = 1, 
  limit: number = 10
): Promise<{ orders: IOrder[]; total: number; pages: number }> {
  const skip = (page - 1) * limit
  
  const [orders, total] = await Promise.all([
    Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email'),
    Order.countDocuments({ userId })
  ])

  return {
    orders,
    total,
    pages: Math.ceil(total / limit)
  }
}