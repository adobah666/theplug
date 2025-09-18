import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import { smsQueue } from '@/lib/sms/queue';

// DELETE /api/admin/sms/queue - Clear SMS queue (emergency)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await smsQueue.clearQueue();

    return NextResponse.json({
      success: true,
      message: 'SMS queue cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing SMS queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/sms/queue - Control queue processing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'stop') {
      smsQueue.stopProcessing();
      return NextResponse.json({
        success: true,
        message: 'SMS queue processing stopped'
      });
    } else if (action === 'start') {
      // Note: Starting is handled automatically, but we can restart if needed
      return NextResponse.json({
        success: true,
        message: 'SMS queue processing is managed automatically'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error controlling SMS queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
