import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import User from '@/lib/db/models/User';
import connectDB from '@/lib/db/connection';

/**
 * Updates an address for a user.
 * 
 * @param request - The incoming request.
 * @param params - The route parameters, including the address ID.
 * @returns A JSON response with the updated address or an error message.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const user = await User.findById((token as any).id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const addressIndex = user.addresses?.findIndex((addr: any) => addr.id === id);
    if (addressIndex === -1 || addressIndex === undefined) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // If this is set as default, unset other default addresses
    if (isDefault) {
      user.addresses = user.addresses!.map((addr: any) => ({
        ...addr,
        isDefault: addr.id === id,
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

/**
 * Deletes an address for a user.
 * 
 * @param request - The incoming request.
 * @param params - The route parameters, including the address ID.
 * @returns A JSON response with a success message or an error message.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !(token as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById((token as any).id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const addressIndex = user.addresses?.findIndex((addr: any) => addr.id === id);
    if (addressIndex === -1 || addressIndex === undefined) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    user.addresses = user.addresses!.filter((addr: any) => addr.id !== id);
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