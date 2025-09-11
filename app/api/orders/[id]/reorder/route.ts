import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import Order from '@/lib/db/models/Order';
import Product from '@/lib/db/models/Product';
import User from '@/lib/db/models/User';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify order belongs to user
    if (order.userId !== payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check product availability and add to cart
    const cartItems = [];
    const unavailableItems = [];

    for (const orderItem of order.items) {
      const product = await Product.findById(orderItem.productId);
      
      if (!product || product.stock < orderItem.quantity) {
        unavailableItems.push({
          name: orderItem.name,
          requestedQuantity: orderItem.quantity,
          availableQuantity: product?.stock || 0,
        });
        continue;
      }

      cartItems.push({
        id: Date.now().toString() + Math.random(),
        productId: orderItem.productId,
        quantity: orderItem.quantity,
        variant: orderItem.variant,
        addedAt: new Date(),
      });
    }

    if (cartItems.length === 0) {
      return NextResponse.json(
        { 
          error: 'None of the items from this order are currently available',
          unavailableItems 
        },
        { status: 400 }
      );
    }

    // Add available items to cart
    user.cart = [...(user.cart || []), ...cartItems];
    await user.save();

    const response: any = {
      message: `${cartItems.length} items added to cart`,
      addedItems: cartItems.length,
    };

    if (unavailableItems.length > 0) {
      response.unavailableItems = unavailableItems;
      response.message += `. ${unavailableItems.length} items were not available.`;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}