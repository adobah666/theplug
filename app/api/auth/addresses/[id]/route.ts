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

    const addressData = await request.json();
    const {
      firstName,
      lastName,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = addressData;

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const addressIndex = user.addresses?.findIndex(addr => addr.id === params.id);
    if (addressIndex === -1 || addressIndex === undefined) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // If this is set as default, unset other default addresses
    if (isDefault) {
      user.addresses = user.addresses!.map(addr => ({
        ...addr,
        isDefault: addr.id === params.id,
      }));
    }

    // Update the address
    user.addresses![addressIndex] = {
      ...user.addresses![addressIndex],
      firstName,
      lastName,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault || false,
    };

    await user.save();

    return NextResponse.json(user.addresses![addressIndex]);
  } catch (error) {
    console.error('Update address error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const addressIndex = user.addresses?.findIndex(addr => addr.id === params.id);
    if (addressIndex === -1 || addressIndex === undefined) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    user.addresses = user.addresses!.filter(addr => addr.id !== params.id);
    await user.save();

    return NextResponse.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}