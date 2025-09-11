import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import User from '@/lib/db/models/User';

export async function PUT(
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
    const addressExists = user.addresses?.some(addr => addr.id === id);
    if (!addressExists) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Set all addresses to non-default, then set the specified one as default
    user.addresses = user.addresses!.map((addr: any) => ({
      ...addr,
      isDefault: addr.id === id,
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