'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RegisterForm } from '@/components/auth/RegisterForm'
import type { RegisterFormData } from '@/lib/auth/validation'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useAuth } from '@/lib/auth/hooks'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const { register } = useAuth()

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    try {
      await register(data) // will auto-login per context implementation
      router.push('/account')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create account')
      throw e
    }
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
