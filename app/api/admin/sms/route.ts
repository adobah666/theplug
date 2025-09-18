import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import { smsQueue } from '@/lib/sms/queue';

// GET /api/admin/sms - Get SMS queue status and recent logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get queue status
    const queueStatus = smsQueue.getQueueStatus();

    // Get recent SMS logs
    const SMSLog = (await import('@/lib/db/models/SMSLog')).default;
    const recentLogs = await SMSLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get pending SMS queue items
    const SMSQueue = (await import('@/lib/db/models/SMSQueue')).default;
    const pendingMessages = await SMSQueue.find({ status: 'PENDING' })
      .sort({ priority: 1, scheduledAt: 1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        queueStatus,
        recentLogs,
        pendingMessages
      }
    });

  } catch (error) {
    console.error('Error fetching SMS admin data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/sms - Send manual SMS
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumbers, content, priority = 2, scheduledAt } = body;

    // Validate input
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Phone numbers array is required' },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'SMS content is required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'SMS content cannot exceed 1000 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    // Add messages to queue
    const messageIds = await smsQueue.addBulkToQueue(
      phoneNumbers.map((phoneNumber: string) => ({
        to: phoneNumber.trim(),
        content: content.trim(),
        type: 'MANUAL' as const,
        priority: Number(priority) || 2,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        sentBy: (session.user as any)?.id || 'admin'
      }))
    );

    return NextResponse.json({
      success: true,
      message: `${messageIds.length} SMS messages queued successfully`,
      data: { messageIds }
    });

  } catch (error) {
    console.error('Error sending manual SMS:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
