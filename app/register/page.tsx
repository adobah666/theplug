'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RegisterForm } from '@/components/auth/RegisterForm'
import type { RegisterFormData } from '@/lib/auth/validation'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || 'Unable to create account')
    }

    // After successful registration, send user to login
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create your account</h1>
        <p className="text-sm text-gray-600 mb-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>

        {error && <ErrorMessage message={error} className="mb-4" />}

        <RegisterForm onSubmit={onSubmit} className="mt-4" />
      </div>
    </div>
  )
}
