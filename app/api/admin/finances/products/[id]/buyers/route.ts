import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Order, { PaymentStatus } from '@/lib/db/models/Order'
import mongoose from 'mongoose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any)
    // @ts-expect-error role in session
    const role = (session?.user as any)?.role
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))

    const { id: productIdStr } = await context.params
    if (!mongoose.Types.ObjectId.isValid(productIdStr)) {
      return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
    }
    const productId = new mongoose.Types.ObjectId(productIdStr)

    // We consider orders that were paid or refunded (shows that a purchase happened)
    const paymentStatuses = [PaymentStatus.PAID, PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED]

    const pipeline: any[] = [
      { $match: { paymentStatus: { $in: paymentStatuses } } },
      { $unwind: '$items' },
      { $match: { 'items.productId': productId } },
      {
        $group: {
          _id: '$userId',
          totalQuantity: { $sum: '$items.quantity' },
          totalAmount: { $sum: '$items.totalPrice' },
          ordersCount: { $sum: 1 },
        }
      },
      { $sort: { totalAmount: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          customerName: { $concat: [{ $ifNull: ['$user.firstName', ''] }, ' ', { $ifNull: ['$user.lastName', ''] }] },
          email: '$user.email',
          totalQuantity: 1,
          totalAmount: 1,
          ordersCount: 1,
        }
      }
    ]

    // Count total distinct buyers first
    const countPipeline = pipeline.slice(0, 6) // up to the $sort stage
    countPipeline.push({ $count: 'count' })
    const countRes = await Order.aggregate(countPipeline)
    const total = countRes[0]?.count || 0

    // Pagination
    pipeline.push({ $skip: (page - 1) * pageSize })
    pipeline.push({ $limit: pageSize })

    const buyers = await Order.aggregate(pipeline)

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      buyers,
    })
  } catch (err) {
    console.error('GET /api/admin/finances/products/[id]/buyers error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
