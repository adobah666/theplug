import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import User from '@/lib/db/models/User';
import Product from '@/lib/db/models/Product';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get full product details for wishlist items
    const wishlistItems = await Promise.all(
      (user.wishlist || []).map(async (item: any) => {
        const product = await Product.findById(item.productId);
        if (!product) return null;

        return {
          id: item.id,
          productId: item.productId,
          name: product.name,
          price: product.price,
          image: product.images[0],
          brand: product.brand,
          inStock: (product.inventory || 0) > 0,
          addedAt: item.addedAt,
        };
      })
    );

    // Filter out null items (products that no longer exist)
    const validItems = wishlistItems.filter(item => item !== null);

    return NextResponse.json(validItems);
  } catch (error) {
    console.error('Get wishlist error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if product is already in wishlist
    const existingItem = user.wishlist?.find((item: any) => item.productId === productId);
    if (existingItem) {
      return NextResponse.json(
        { error: 'Product already in wishlist' },
        { status: 400 }
      );
    }

    const newWishlistItem = {
      id: Date.now().toString(),
      productId,
      addedAt: new Date(),
    };

    user.wishlist = [...(user.wishlist || []), newWishlistItem];
    await user.save();

    return NextResponse.json(newWishlistItem, { status: 201 });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}