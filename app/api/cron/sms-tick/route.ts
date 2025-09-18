import { NextRequest, NextResponse } from 'next/server'
import { smsQueue } from '@/lib/sms/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Simple protected cron endpoint that runs one queue processing cycle.
// Auth options:
// - URL token: /api/cron/sms-tick?token=CRON_SMS_TOKEN (works with UptimeRobot free tier)
// - OR Header: Authorization: Bearer CRON_SMS_TOKEN
async function handle(req: NextRequest) {
  try {
    const envToken = process.env.CRON_SMS_TOKEN
    const urlToken = req.nextUrl.searchParams.get('token')
    const headerAuth = req.headers.get('authorization') || ''

    const authorized = !!envToken && (urlToken === envToken || headerAuth === `Bearer ${envToken}`)
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const result = await smsQueue.tick()
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error('cron sms-tick error', e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) { return handle(req) }
export async function GET(req: NextRequest) { return handle(req) }
