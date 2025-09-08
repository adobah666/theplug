import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import User from '@/lib/db/models/User';
import connectDB from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !(token as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById((token as any).id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user.addresses || []);
  } catch (error) {
    console.error('Get addresses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !(token as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    if (!firstName || !lastName || !street || !city || !state || !postalCode || !country) {
      return NextResponse.json(
        { error: 'All address fields are required' },
        { status: 400 }
      );
    }

    const user = await User.findById((token as any).id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newAddress = {
      id: Date.now().toString(),
      firstName,
      lastName,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault || false,
    };

    // If this is set as default, unset other default addresses
    if (newAddress.isDefault) {
      user.addresses = (user.addresses || []).map((addr: any) => ({
        ...addr,
        isDefault: false,
      }));
    }

    user.addresses = [...(user.addresses || []), newAddress];
    await user.save();

    return NextResponse.json(newAddress, { status: 201 });
  } catch (error) {
    console.error('Add address error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}