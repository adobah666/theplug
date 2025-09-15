import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { Setting } from '@/lib/db/models/Setting'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET() {
  try {
    await connectDB()
    const doc = await Setting.findOne().lean()
    return NextResponse.json({
      success: true,
      data: doc || { taxRate: 0, deliveryFeeDefault: 0, deliveryFeeByRegion: [] }
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!(session as any) || ((session as any).user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as any
    const taxRate = typeof body.taxRate === 'number' ? body.taxRate : Number(body.taxRate)
    const deliveryFeeDefault = typeof body.deliveryFeeDefault === 'number' ? body.deliveryFeeDefault : Number(body.deliveryFeeDefault)
    const deliveryFeeByRegion = Array.isArray(body.deliveryFeeByRegion) ? body.deliveryFeeByRegion : []

    // Basic validation
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 1) {
      return NextResponse.json({ success: false, error: 'taxRate must be between 0 and 1' }, { status: 400 })
    }
    if (Number.isNaN(deliveryFeeDefault) || deliveryFeeDefault < 0) {
      return NextResponse.json({ success: false, error: 'deliveryFeeDefault must be >= 0' }, { status: 400 })
    }
    const sanitizedRegions = deliveryFeeByRegion
      .filter((r: any) => r && typeof r.region === 'string' && r.region.trim().length > 0)
      .map((r: any) => ({ region: String(r.region).trim(), fee: Math.max(0, Number(r.fee) || 0) }))

    await connectDB()
    const updated = await Setting.findOneAndUpdate(
      {},
      { $set: { taxRate, deliveryFeeDefault, deliveryFeeByRegion: sanitizedRegions } },
      { upsert: true, new: true }
    ).lean()

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 })
  }
}
