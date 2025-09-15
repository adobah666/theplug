import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getBaseUrl } from '@/lib/utils/server'
import { OrderConfirmation } from '@/components/checkout/OrderConfirmation'

interface OrderPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; reference?: string }>
}

export const metadata: Metadata = {
  title: 'Order Confirmation - Fashion Store',
  description: 'Your order confirmation details',
}

async function getOrder(orderId: string) {
  try {
    const url = `${getBaseUrl()}/api/orders/${orderId}`
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()

    const response = await fetch(url, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('Failed to fetch order:', error)
    return null
  }
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { id } = await params
  const { success, reference } = await searchParams
  
  const order = await getOrder(id)
  
  if (!order) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrderConfirmation
          order={order}
          isSuccess={success === 'true'}
          paymentReference={reference}
        />
      </div>
    </div>
  )
}