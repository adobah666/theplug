import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import AdminProductsPageClient from '@/components/admin/AdminProductsPageClient'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import connectDB from '@/lib/db/connection'
import Order, { OrderStatus } from '@/lib/db/models/Order'

export const metadata = {
  title: 'Admin Dashboard',
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session) {
    redirect('/login')
  }

  if (role !== 'admin') {
    redirect('/')
  }

  // Compute undelivered orders count (exclude delivered, cancelled, returned)
  await connectDB()
  const undeliveredCount = await Order.countDocuments({
    status: { $nin: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED] }
  }).catch(() => 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="rounded-lg border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm px-4 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your store: products, orders and more.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/orders">
              <Button className="relative whitespace-nowrap">
                Manage Orders
                {undeliveredCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-semibold h-5 min-w-[1.25rem] px-1.5 leading-none shadow ring-2 ring-white"
                    aria-label={`${undeliveredCount} undelivered orders`}
                  >
                    {undeliveredCount > 99 ? '99+' : undeliveredCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Products Management */}
      <AdminProductsPageClient />
    </div>
  )
}
