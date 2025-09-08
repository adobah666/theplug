'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import type { LoginFormData } from '@/lib/auth/validation'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || 'Unable to sign in')
    }

    // On success, navigate to account page or home
    router.push('/account')
  }

  return (
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
  )
}
