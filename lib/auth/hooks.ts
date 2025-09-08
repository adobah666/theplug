'use client'

import { useAuth } from './context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useRequireAuth(redirectTo: string = '/auth/login') {
  const { session, status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (status === 'unauthenticated') {
      router.push(redirectTo)
    }
  }, [status, router, redirectTo])

  return { session, status, isLoading: status === 'loading' }
}

export function useRedirectIfAuthenticated(redirectTo: string = '/') {
  const { session, status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (status === 'authenticated') {
      router.push(redirectTo)
    }
  }, [status, router, redirectTo])

  return { session, status, isLoading: status === 'loading' }
}

export function useAuthUser() {
  const { session, status, login, logout, register, updateProfile } = useAuth()
  
  return {
    user: session?.user || null,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    login,
    logout,
    register,
    updateProfile,
    error: null, // Add error handling if needed
  }
}

export { useAuth }