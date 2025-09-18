'use client'

import { useEffect, useMemo, useState } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Calendar,
  Heart,
  Package,
  CreditCard,
  BarChart3,
  Eye,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

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

interface Props {
  data: FinancialData
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS'
  }).format(amount)
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'delivered': return 'bg-green-100 text-green-800'
    case 'shipped': return 'bg-blue-100 text-blue-800'
    case 'processing': return 'bg-yellow-100 text-yellow-800'
    case 'pending': return 'bg-gray-100 text-gray-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    case 'returned': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function FinancialDashboard({ data }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'products' | 'wishlist'>('overview')

  // Sales pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [includeRefunds, setIncludeRefunds] = useState(true)
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesError, setSalesError] = useState<string | null>(null)
  const [salesData, setSalesData] = useState<{
    page: number
    pageSize: number
    total: number
    totalPages: number
    items: Array<{
      id: string
      orderNumber: string
      customerName: string
      total: number
      createdAt: string
      status: string
      paymentStatus: string
      refund: { status: string } | null
    }>
  } | null>(null)

  // Order details modal state
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [orderDetails, setOrderDetails] = useState<null | {
    id: string
    orderNumber: string
    user: { name: string; email: string }
    items: Array<{
      productId: string
      productName: string
      productImage: string
      quantity: number
      unitPrice: number
      totalPrice: number
      size?: string
      color?: string
      variantId?: string
    }>
    pricing: { subtotal: number; tax: number; shipping: number; discount: number; total: number }
    status: string
    paymentStatus: string
    paymentMethod: string
    createdAt: string
    shippingAddress: any
  }>(null)

  useEffect(() => {
    if (!orderModalOpen || !selectedOrderId) return
    const controller = new AbortController()
    async function fetchOrder() {
      try {
        setOrderLoading(true)
        setOrderError(null)
        setOrderDetails(null)
        const res = await fetch(`/api/admin/finances/sales/${selectedOrderId}`, { signal: controller.signal })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `Failed to load order: ${res.status}`)
        }
        const json = await res.json()
        setOrderDetails(json)
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setOrderError(err.message || 'Failed to load order')
      } finally {
        setOrderLoading(false)
      }
    }
    fetchOrder()
    return () => controller.abort()
  }, [orderModalOpen, selectedOrderId])

  // Fetch paginated sales from API
  useEffect(() => {
    if (activeTab !== 'sales') return
    const controller = new AbortController()
    async function fetchSales() {
      try {
        setSalesLoading(true)
        setSalesError(null)
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        if (q) params.set('q', q)
        if (statusFilter) params.set('status', statusFilter)
        params.set('includeRefunds', String(includeRefunds))
        const res = await fetch(`/api/admin/finances/sales?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `Failed to load sales: ${res.status}`)
        }
        const json = await res.json()
        setSalesData(json)
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setSalesError(err.message || 'Failed to load sales')
      } finally {
        setSalesLoading(false)
      }
    }
    fetchSales()
    return () => controller.abort()
  }, [activeTab, page, pageSize, q, statusFilter, includeRefunds])

  // Products tab: client-side sort + pagination
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'units'>('revenue')
  const [productPage, setProductPage] = useState(1)
  const [productPageSize, setProductPageSize] = useState(10)

  useEffect(() => {
    // Reset to first page if tab changes to products
    if (activeTab === 'products') {
      setProductPage(1)
    }
  }, [activeTab, productSortBy, productPageSize])

  const sortedProducts = useMemo(() => {
    const items = [...(data.topProducts || [])]
    if (productSortBy === 'units') {
      items.sort((a, b) => b.totalSold - a.totalSold)
    } else {
      items.sort((a, b) => b.totalRevenue - a.totalRevenue)
    }
    return items
  }, [data.topProducts, productSortBy])

  const productTotal = sortedProducts.length
  const productTotalPages = Math.max(1, Math.ceil(productTotal / productPageSize))
  const productStartIndex = (productPage - 1) * productPageSize
  const paginatedProducts = sortedProducts.slice(productStartIndex, productStartIndex + productPageSize)

  // Buyers modal state for Top Products
  const [buyersModalOpen, setBuyersModalOpen] = useState(false)
  const [buyersProductId, setBuyersProductId] = useState<string | null>(null)
  const [buyersProductName, setBuyersProductName] = useState<string>('')
  const [buyersPage, setBuyersPage] = useState(1)
  const [buyersPageSize] = useState(10)
  const [buyersLoading, setBuyersLoading] = useState(false)
  const [buyersError, setBuyersError] = useState<string | null>(null)
  const [buyersData, setBuyersData] = useState<null | {
    page: number
    pageSize: number
    total: number
    totalPages: number
    buyers: Array<{
      userId: string
      customerName: string
      email?: string
      totalQuantity: number
      totalAmount: number
      ordersCount: number
    }>
  }>(null)

  const openBuyersModal = (productId: string, name: string) => {
    setBuyersProductId(productId)
    setBuyersProductName(name)
    setBuyersPage(1)
    setBuyersModalOpen(true)
  }

  useEffect(() => {
    if (!buyersModalOpen || !buyersProductId) return
    const controller = new AbortController()
    async function fetchBuyers() {
      try {
        setBuyersLoading(true)
        setBuyersError(null)
        const params = new URLSearchParams()
        params.set('page', String(buyersPage))
        params.set('pageSize', String(buyersPageSize))
        const res = await fetch(`/api/admin/finances/products/${buyersProductId}/buyers?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `Failed to load buyers: ${res.status}`)
        }
        const json = await res.json()
        setBuyersData(json)
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setBuyersError(err.message || 'Failed to load buyers')
      } finally {
        setBuyersLoading(false)
      }
    }
    fetchBuyers()
    return () => controller.abort()
  }, [buyersModalOpen, buyersProductId, buyersPage, buyersPageSize])

  const buyersTotal = buyersData?.total ?? 0
  const buyersTotalPages = buyersData?.totalPages ?? 1
  const buyersList = buyersData?.buyers ?? []

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue,
    color = 'blue' 
  }: {
    title: string
    value: string | number
    icon: any
    trend?: 'up' | 'down'
    trendValue?: string
    color?: 'blue' | 'green' | 'purple' | 'orange'
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {trend && trendValue && (
              <div className={`flex items-center mt-2 text-sm ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`h-4 w-4 mr-1 ${trend === 'down' ? 'rotate-180' : ''}`} />
                {trendValue}
              </div>
            )}
          </div>
          <div className={`${colorClasses[color]} p-3 rounded-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(data.todayRevenue)}
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Total Orders"
          value={data.totalOrders.toLocaleString()}
          icon={ShoppingCart}
          color="purple"
        />
        <StatCard
          title="Average Order Value"
          value={formatCurrency(data.averageOrderValue)}
          icon={BarChart3}
          color="orange"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'sales', label: 'Recent Sales', icon: CreditCard },
            { id: 'products', label: 'Top Products', icon: Package },
            { id: 'wishlist', label: 'Wishlist Analytics', icon: Heart }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Revenue */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h3>
            <div className="space-y-3">
              {data.monthlyRevenue.slice(-6).map((month) => (
                <div key={month.month} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(month.month + '-01').toLocaleDateString('en-GH', { year: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{formatCurrency(month.revenue)}</span>
                    <span className="text-xs text-gray-500">({month.orders} orders)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sales by Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Sales by Status</h3>
            <div className="space-y-3">
              {data.salesByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                      {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-600">({status.count} orders)</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(status.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily (Current Week) */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Revenue (This Week)</h3>
            <div className="space-y-3">
              {data.dailyRevenueCurrentWeek.map((d) => (
                <div key={d.date} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{d.day}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{formatCurrency(d.revenue)}</span>
                    <span className="text-xs text-gray-500">({d.orders} orders)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly (Last 8 Weeks) */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Revenue (Last 8 Weeks)</h3>
            <div className="space-y-3">
              {data.weeklyRevenue.map((w) => (
                <div key={w.weekStart} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(w.weekStart).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(w.weekEnd).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{formatCurrency(w.revenue)}</span>
                    <span className="text-xs text-gray-500">({w.orders} orders)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">All Sales</h3>
            <p className="text-sm text-gray-600">Paginated list of all sales including refunds</p>
            {/* Controls */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={q}
                  onChange={(e) => { setPage(1); setQ(e.target.value) }}
                  placeholder="Search by order number..."
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}
                  className="w-full py-2 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All statuses</option>
                  {['pending','confirmed','processing','shipped','delivered','cancelled','returned'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={includeRefunds}
                    onChange={(e) => { setPage(1); setIncludeRefunds(e.target.checked) }}
                    className="h-4 w-4"
                  />
                  <span>Include refunds</span>
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)) }}
                  className="py-2 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[10,20,50].map(size => <option key={size} value={size}>{size} / page</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading sales...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {salesError && !salesLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-center text-sm text-red-600">
                      {salesError}
                    </td>
                  </tr>
                )}
                {!salesLoading && !salesError && salesData?.items?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">
                      No sales found.
                    </td>
                  </tr>
                )}
                {!salesLoading && !salesError && salesData?.items?.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => { setSelectedOrderId(sale.id); setOrderModalOpen(true) }}
                    title="View order details"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.orderNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(sale.total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                        {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{sale.paymentStatus.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.refund ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sale.refund.status === 'approved' ? 'bg-red-100 text-red-800' :
                          sale.refund.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.refund.status.charAt(0).toUpperCase() + sale.refund.status.slice(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(new Date(sale.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination footer */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {salesData ? (
                <>Page <span className="font-medium">{salesData.page}</span> of <span className="font-medium">{salesData.totalPages || 1}</span> • {salesData.total.toLocaleString()} records</>
              ) : (
                '—'
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="inline-flex items-center px-3 py-2 border rounded-md text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={salesLoading || !salesData || salesData.page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </button>
              <button
                className="inline-flex items-center px-3 py-2 border rounded-md text-sm disabled:opacity-50"
                onClick={() => setPage((p) => (salesData ? Math.min(salesData.totalPages || 1, p + 1) : p + 1))}
                disabled={salesLoading || !salesData || (salesData.totalPages || 1) <= salesData.page}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Top Selling Products</h3>
            <p className="text-sm text-gray-600">Products ranked by revenue or units sold</p>

            {/* Controls */}
            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <label className="text-sm text-gray-600">Sort by</label>
                <select
                  className="py-2 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={productSortBy}
                  onChange={(e) => { setProductPage(1); setProductSortBy(e.target.value as 'revenue' | 'units') }}
                >
                  <option value="revenue">Revenue (High → Low)</option>
                  <option value="units">Units Sold (High → Low)</option>
                </select>
              </div>
              <div className="flex items-center space-x-3">
                <label className="text-sm text-gray-600">Rows per page</label>
                <select
                  className="py-2 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={productPageSize}
                  onChange={(e) => { setProductPage(1); setProductPageSize(Number(e.target.value)) }}
                >
                  {[10,20,50,100].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units Sold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product, index) => (
                  <tr
                    key={product.productId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openBuyersModal(product.productId, product.productName)}
                    title="View buyers"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">#{productStartIndex + index + 1}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.totalSold.toLocaleString()} units</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(product.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Page <span className="font-medium">{productPage}</span> of <span className="font-medium">{productTotalPages}</span> • {productTotal.toLocaleString()} products
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="inline-flex items-center px-3 py-2 border rounded-md text-sm disabled:opacity-50"
                onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                disabled={productPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </button>
              <button
                className="inline-flex items-center px-3 py-2 border rounded-md text-sm disabled:opacity-50"
                onClick={() => setProductPage((p) => Math.min(productTotalPages, p + 1))}
                disabled={productPage >= productTotalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wishlist' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wishlist Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Wishlist Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Wishlist Items</span>
                <span className="text-2xl font-bold text-purple-600">
                  {data.wishlistStats.totalWishlistItems.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Unique Products Wishlisted</span>
                <span className="text-lg font-semibold">
                  {data.wishlistStats.mostWishlistedProducts.length}
                </span>
              </div>
            </div>
          </div>

          {/* Most Wishlisted Products */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Most Wishlisted Products</h3>
            <div className="space-y-3">
              {data.wishlistStats.mostWishlistedProducts.slice(0, 5).map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-6 w-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-purple-600">#{index + 1}</span>
                    </div>
                    <span className="text-sm text-gray-900 truncate">{product.productName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">{product.wishlistCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Order details modal (global) */}
      <Modal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title={orderDetails ? `Order ${orderDetails.orderNumber}` : 'Order Details'}
        size="xl"
      >
        {orderLoading && (
          <div className="flex items-center justify-center py-6 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading order details...
          </div>
        )}
        {orderError && !orderLoading && (
          <div className="text-sm text-red-600 py-4">{orderError}</div>
        )}
        {orderDetails && !orderLoading && (
          <div className="space-y-6">
            {/* Order meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Customer</div>
                <div className="font-medium text-gray-900">{orderDetails.user.name || 'Unknown'}</div>
                {orderDetails.user.email && <div className="text-gray-600">{orderDetails.user.email}</div>}
              </div>
              <div>
                <div className="text-gray-500">Payment</div>
                <div className="text-gray-900 capitalize">{orderDetails.paymentMethod.replace(/_/g, ' ')}</div>
                <div className="text-gray-600 capitalize">{orderDetails.paymentStatus.replace(/_/g, ' ')}</div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Items</h4>
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                {orderDetails.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 flex-shrink-0 rounded bg-gray-100 overflow-hidden">
                      {item.productImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{item.productName}</div>
                      <div className="text-xs text-gray-600">
                        Qty {item.quantity}
                        {item.size ? ` • Size: ${item.size}` : ''}
                        {item.color ? ` • Color: ${item.color}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900 font-medium">{formatCurrency(item.totalPrice)}</div>
                      <div className="text-xs text-gray-500">@ {formatCurrency(item.unitPrice)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="ml-auto w-full md:w-1/2">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="text-gray-900">{formatCurrency(orderDetails.pricing.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Tax</span><span className="text-gray-900">{formatCurrency(orderDetails.pricing.tax)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className="text-gray-900">{formatCurrency(orderDetails.pricing.shipping)}</span></div>
                {orderDetails.pricing.discount > 0 && (
                  <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-gray-900">-{formatCurrency(orderDetails.pricing.discount)}</span></div>
                )}
                <div className="pt-2 border-t flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(orderDetails.pricing.total)}</span></div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Buyers modal for a product */}
      <Modal
        isOpen={buyersModalOpen}
        onClose={() => setBuyersModalOpen(false)}
        title={buyersProductName ? `Buyers • ${buyersProductName}` : 'Buyers'}
        size="xl"
      >
        {buyersLoading && (
          <div className="flex items-center justify-center py-6 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading buyers...
          </div>
        )}
        {buyersError && !buyersLoading && (
          <div className="text-sm text-red-600 py-4">{buyersError}</div>
        )}
        {!buyersLoading && !buyersError && (
          <div>
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {buyersList.map((b) => (
                    <tr key={b.userId}>
                      <td className="px-6 py-3 text-sm text-gray-900">{b.customerName || 'Unknown'}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{b.email || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-900">{b.totalQuantity.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm text-gray-900">{formatCurrency(b.totalAmount)}</td>
                      <td className="px-6 py-3 text-sm text-gray-900">{b.ordersCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page <span className="font-medium">{buyersPage}</span> of <span className="font-medium">{buyersTotalPages}</span> • {buyersTotal.toLocaleString()} buyers
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className="inline-flex items-center px-3 py-2 border rounded-md text-sm disabled:opacity-50"
                  onClick={() => setBuyersPage((p) => Math.max(1, p - 1))}
                  disabled={buyersPage <= 1 || buyersLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </button>
                <button
                  className="inline-flex items-center px-3 py-2 border rounded-md text-sm disabled:opacity-50"
                  onClick={() => setBuyersPage((p) => Math.min(buyersTotalPages, p + 1))}
                  disabled={buyersPage >= buyersTotalPages || buyersLoading}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
