import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { User } from '@/lib/db/models/User';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const itemExists = user.wishlist?.some(item => item.id === params.id);
    if (!itemExists) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }

    user.wishlist = user.wishlist!.filter(item => item.id !== params.id);
    await user.save();

    return NextResponse.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}