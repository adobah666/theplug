import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { User } from '@/lib/db/models/User';

export async function PUT(
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

    const addressExists = user.addresses?.some(addr => addr.id === params.id);
    if (!addressExists) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Set all addresses to non-default, then set the specified one as default
    user.addresses = user.addresses!.map(addr => ({
      ...addr,
      isDefault: addr.id === params.id,
    }));

    await user.save();

    return NextResponse.json({ message: 'Default address updated successfully' });
  } catch (error) {
    console.error('Set default address error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}