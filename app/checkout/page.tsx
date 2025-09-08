import { Metadata } from 'next'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'

export const metadata: Metadata = {
  title: 'Checkout - Fashion Store',
  description: 'Complete your purchase securely',
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>
      
      <CheckoutForm />
    </div>
  )
}