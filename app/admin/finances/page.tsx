import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Order, { PaymentStatus } from '@/lib/db/models/Order'
import User from '@/lib/db/models/User'
import Product from '@/lib/db/models/Product'
import FinancialDashboard from '@/components/admin/FinancialDashboard'

export const metadata = {
  title: 'Financial Dashboard - Admin',
}

interface FinancialData {
  totalRevenue: number
  todayRevenue: number
  totalOrders: number
  todayOrders: number
  averageOrderValue: number
  topProducts: Array<{
    productId: string
    productName: string
    totalSold: number
    totalRevenue: number
  }>
  recentSales: Array<{
    orderNumber: string
    customerName: string
    total: number
    createdAt: Date
    status: string
    paymentStatus: string
  }>
  salesByStatus: Array<{
    status: string
    count: number
    revenue: number
  }>
  monthlyRevenue: Array<{
    month: string
    revenue: number
    orders: number
  }>
  dailyRevenueCurrentWeek: Array<{
    day: string
    date: string
    revenue: number
    orders: number
  }>
  weeklyRevenue: Array<{
    weekStart: string
    weekEnd: string
    revenue: number
    orders: number
  }>
  wishlistStats: {
    totalWishlistItems: number
    mostWishlistedProducts: Array<{
      productId: string
      productName: string
      wishlistCount: number
    }>
  }
}

async function getFinancialData(): Promise<FinancialData> {
  await connectDB()
  
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  
  // Get all paid orders
  const paidOrders = await Order.find({
    paymentStatus: PaymentStatus.PAID
  }).populate('userId', 'firstName lastName')
  
  // Calculate total revenue
  const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0)
  
  // Calculate today's revenue
  const todayOrders = paidOrders.filter(order => 
    order.createdAt >= startOfDay && order.createdAt < endOfDay
  )
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
  
  // Calculate average order value
  const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0
  
  // Get top products by sales
  const productSales = new Map<string, { name: string, sold: number, revenue: number }>()
  
  paidOrders.forEach(order => {
    order.items.forEach((item: any) => {
      const key = item.productId.toString()
      if (productSales.has(key)) {
        const existing = productSales.get(key)!
        existing.sold += item.quantity
        existing.revenue += item.totalPrice
      } else {
        productSales.set(key, {
          name: item.productName,
          sold: item.quantity,
          revenue: item.totalPrice
        })
      }
    })
  })
  
  const topProducts = Array.from(productSales.entries())
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      totalSold: data.sold,
      totalRevenue: data.revenue
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
  
  // Get recent sales (last 20)
  const recentSales = paidOrders
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20)
    .map(order => ({
      orderNumber: order.orderNumber,
      customerName: `${(order.userId as any)?.firstName || 'Unknown'} ${(order.userId as any)?.lastName || 'Customer'}`,
      total: order.total,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus
    }))
  
  // Sales by status
  const statusCounts = new Map<string, { count: number, revenue: number }>()
  paidOrders.forEach(order => {
    if (statusCounts.has(order.status)) {
      const existing = statusCounts.get(order.status)!
      existing.count += 1
      existing.revenue += order.total
    } else {
      statusCounts.set(order.status, { count: 1, revenue: order.total })
    }
  })
  
  const salesByStatus = Array.from(statusCounts.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    revenue: data.revenue
  }))
  
  // Monthly revenue for the last 12 months
  const monthlyData = new Map<string, { revenue: number, orders: number }>()
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return date.toISOString().slice(0, 7) // YYYY-MM format
  }).reverse()
  
  // Initialize all months
  last12Months.forEach(month => {
    monthlyData.set(month, { revenue: 0, orders: 0 })
  })
  
  paidOrders.forEach(order => {
    const month = order.createdAt.toISOString().slice(0, 7)
    if (monthlyData.has(month)) {
      const existing = monthlyData.get(month)!
      existing.revenue += order.total
      existing.orders += 1
    }
  })
  
  const monthlyRevenue = Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    orders: data.orders
  }))

  // Daily revenue for current week (Mon-Sun)
  const getMonday = (d: Date) => {
    const date = new Date(d)
    const day = (date.getDay() + 6) % 7 // 0 = Monday
    date.setHours(0,0,0,0)
    date.setDate(date.getDate() - day)
    return date
  }
  const startOfWeek = getMonday(today)
  const daysOfWeek = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const dailyMap = new Map<string, { revenue: number, orders: number }>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    const key = d.toISOString().slice(0,10)
    dailyMap.set(key, { revenue: 0, orders: 0 })
  }
  paidOrders.forEach(order => {
    const key = order.createdAt.toISOString().slice(0,10)
    if (dailyMap.has(key)) {
      const v = dailyMap.get(key)!
      v.revenue += order.total
      v.orders += 1
    }
  })
  const dailyRevenueCurrentWeek = Array.from(dailyMap.entries()).map(([dateStr, data], idx) => ({
    day: daysOfWeek[idx],
    date: dateStr,
    revenue: data.revenue,
    orders: data.orders
  }))

  // Weekly revenue for last 8 weeks (Mon-Sun)
  const weekKey = (d: Date) => getMonday(d).toISOString().slice(0,10)
  const weeklyMap = new Map<string, { revenue: number, orders: number }>()
  // initialize last 8 weeks
  for (let i = 7; i >= 0; i--) {
    const base = new Date(startOfWeek)
    base.setDate(startOfWeek.getDate() - i * 7)
    weeklyMap.set(weekKey(base), { revenue: 0, orders: 0 })
  }
  paidOrders.forEach(order => {
    const key = weekKey(order.createdAt)
    if (weeklyMap.has(key)) {
      const v = weeklyMap.get(key)!
      v.revenue += order.total
      v.orders += 1
    }
  })
  const weeklyRevenue = Array.from(weeklyMap.entries()).map(([startStr, data]) => {
    const start = new Date(startStr)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return {
      weekStart: start.toISOString().slice(0,10),
      weekEnd: end.toISOString().slice(0,10),
      revenue: data.revenue,
      orders: data.orders
    }
  })
  
  // Wishlist statistics
  const users = await User.find({ wishlist: { $exists: true, $ne: [] } })
  const wishlistItems = users.flatMap(user => user.wishlist || [])
  
  const wishlistCounts = new Map<string, number>()
  wishlistItems.forEach(item => {
    const productId = item.productId
    wishlistCounts.set(productId, (wishlistCounts.get(productId) || 0) + 1)
  })
  
  // Get product names for most wishlisted
  const topWishlistProductIds = Array.from(wishlistCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([productId]) => productId)
  
  const wishlistProducts = await Product.find({
    _id: { $in: topWishlistProductIds }
  }).select('_id name')
  
  const mostWishlistedProducts = topWishlistProductIds.map(productId => {
    const product = wishlistProducts.find(p => p._id.toString() === productId)
    return {
      productId,
      productName: product?.name || 'Unknown Product',
      wishlistCount: wishlistCounts.get(productId) || 0
    }
  })
  
  return {
    totalRevenue,
    todayRevenue,
    totalOrders: paidOrders.length,
    todayOrders: todayOrders.length,
    averageOrderValue,
    topProducts,
    recentSales,
    salesByStatus,
    monthlyRevenue,
    dailyRevenueCurrentWeek,
    weeklyRevenue,
    wishlistStats: {
      totalWishlistItems: wishlistItems.length,
      mostWishlistedProducts
    }
  }
}

export default async function FinancesPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session) {
    redirect('/login')
  }

  if (role !== 'admin') {
    redirect('/')
  }

  const financialData = await getFinancialData()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your store's financial performance and sales analytics</p>
      </div>
      
      <FinancialDashboard data={financialData} />
    </div>
  )
}
