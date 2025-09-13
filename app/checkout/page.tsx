import { Metadata } from 'next'
import { Suspense } from 'react'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Checkout - Fashion Store',
  description: 'Complete your purchase securely',
}

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent('/checkout')}`)
  }

  return (
    <Suspense fallback={<div className="min-h-[200px] flex items-center justify-center">Loading…</div>}>
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          </div>
        </div>
        
        <CheckoutForm />
      </div>
    </Suspense>
  )
}