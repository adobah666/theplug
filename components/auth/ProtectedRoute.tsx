'use client'

import { ReactNode } from 'react'
import { useRequireAuth } from '@/lib/auth/hooks'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: ReactNode
  redirectTo?: string
  fallback?: ReactNode
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/auth/login',
  fallback 
}: ProtectedRouteProps) {
  const { session, isLoading } = useRequireAuth(redirectTo)

  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      )
    )
  }

  if (!session) {
    return null // Will redirect via useRequireAuth
  }

  return <>{children}</>
}