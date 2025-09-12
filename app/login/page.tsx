'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import type { LoginFormData } from '@/lib/auth/validation'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useState } from 'react'
import { useAuth } from '@/lib/auth/hooks'
import { useCart } from '@/lib/cart/context'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const searchParams = useSearchParams()
  const { state: cartState, refreshCart } = useCart()

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    try {
      await login(data)
      // Ensure we have latest cart
      await refreshCart()
      const callbackUrl = searchParams?.get('callbackUrl') || ''
      const hasItems = (cartState?.itemCount || 0) > 0 || (cartState?.items || []).length > 0
      if (callbackUrl === '/checkout' || hasItems) {
        router.push(hasItems ? '/checkout' : '/')
      } else {
        router.push('/')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in')
      throw e
    }
  }

  return (
    <Suspense fallback={<div className="min-h-[200px] flex items-center justify-center">Loading…</div>}>
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sign in to your account</h1>
          <p className="text-sm text-gray-600 mb-6">
            Or{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>

          {error && <ErrorMessage message={error} className="mb-4" />}

          <LoginForm onSubmit={onSubmit} className="mt-4" />
        </div>
      </div>
    </Suspense>
  )
}
