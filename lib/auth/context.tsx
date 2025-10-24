'use client'

import { createContext, useContext, ReactNode, useEffect } from 'react'
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react'
import { Session } from 'next-auth'
import { LoginFormData, RegisterFormData, PasswordResetFormData } from './validation'
import type { CartItemData } from '@/components/cart/CartItem'

interface ProfileUpdateData {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

interface AuthContextType {
  session: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  login: (data: LoginFormData) => Promise<void>
  register: (data: RegisterFormData) => Promise<void>
  logout: () => Promise<void>
  requestPasswordReset: (data: PasswordResetFormData) => Promise<void>
  updateProfile: (data: ProfileUpdateData) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
  session?: Session | null
}

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  // Merge guest cart (localStorage) into authenticated server cart
  const mergeGuestCart = async () => {
    try {
      if (typeof window === 'undefined') return
      const saved = localStorage.getItem('cart')
      if (!saved) return
      const items: CartItemData[] = JSON.parse(saved)
      if (!Array.isArray(items) || items.length === 0) return
      // Ensure session cookies are up-to-date before cart API calls
      try { await fetch('/api/auth/session?update', { credentials: 'include' }) } catch {}
      // Sequentially add to server cart to preserve quantities
      for (const it of items) {
        await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            productId: it.productId,
            variantId: it.variantId,
            quantity: it.quantity,
            price: it.price,
            name: it.name,
            image: it.image,
            size: (it as any).size,
            color: (it as any).color,
          })
        }).catch(() => {})
      }
      // Read server cart and persist it locally so reloads survive
      try {
        const res = await fetch('/api/cart', { credentials: 'include' })
        const data = await res.json().catch(() => ({} as any))
        const serverItems = data?.data?.cart?.items
        if (Array.isArray(serverItems)) {
          localStorage.setItem('cart', JSON.stringify(serverItems))
        }
      } catch {}
      // Optionally clear guest cart copy to avoid duplication across devices
      // localStorage.removeItem('cart')
    } catch {}
  }

  // Also run merge when status flips to authenticated (covers OAuth and external flows)
  useEffect(() => {
    if (status === 'authenticated') {
      mergeGuestCart()
    }
  }, [status])

  const login = async (data: LoginFormData) => {
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        // If we get a 401 error, try cleaning up auth data first
        if (result.error.includes('401') || result.error.includes('Authentication failed')) {
          try {
            await fetch('/api/auth/cleanup', { 
              method: 'POST',
              credentials: 'include'
            })
            
            // Try login again after cleanup
            const retryResult = await signIn('credentials', {
              email: data.email,
              password: data.password,
              redirect: false,
            })
            
            if (retryResult?.error) {
              throw new Error(retryResult.error)
            }
            
            if (!retryResult?.ok) {
              throw new Error('Login failed after cleanup')
            }
          } catch (cleanupError) {
            // If cleanup fails, throw original error
            throw new Error(result.error)
          }
        } else {
          throw new Error(result.error)
        }
      }

      if (!result?.ok) {
        throw new Error('Login failed')
      }

      // On successful login, merge any guest cart into the authenticated cart
      await mergeGuestCart()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (data: RegisterFormData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error || error?.message || `Registration failed (${response.status})`)
    }

    // Auto-login after successful registration
    await login({
      email: data.email,
      password: data.password,
    })
  }

  const logout = async () => {
    try {
      // Clear cart client-side to avoid persisting previous user's items
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart')
        // Clear any other auth-related localStorage items
        localStorage.removeItem('next-auth.session-token')
        localStorage.removeItem('next-auth.callback-url')
        localStorage.removeItem('next-auth.csrf-token')
      }
      
      // Sign out with NextAuth
      await signOut({ 
        redirect: false,
        callbackUrl: '/' 
      })
      
      // Force clear any remaining session cookies
      if (typeof window !== 'undefined') {
        // Clear cookies by setting them to expire
        document.cookie = 'next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie = 'next-auth.callback-url=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie = 'next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie = '__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails, try to clear local data
      if (typeof window !== 'undefined') {
        localStorage.clear()
        // Force reload to clear any cached state
        window.location.reload()
      }
    }
  }

  const requestPasswordReset = async (data: PasswordResetFormData) => {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error || error?.message || `Failed to send reset email (${response.status})`)
    }
  }

  const updateProfile = async (data: ProfileUpdateData) => {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error || error?.message || `Failed to update profile (${response.status})`)
    }

    // Refresh session to get updated user data
    await fetch('/api/auth/session?update', { credentials: 'include' })
  }

  // Force clear all authentication state (for debugging)
  const clearAuthState = async () => {
    try {
      // Call cleanup endpoint
      await fetch('/api/auth/cleanup', { 
        method: 'POST',
        credentials: 'include'
      })
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        
        // Clear all cookies
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=")
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        })
        
        // Reload page to reset all state
        window.location.reload()
      }
    } catch (error) {
      console.error('Clear auth state error:', error)
    }
  }

  // Expose clearAuthState in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).clearAuthState = clearAuthState
  }

  const value: AuthContextType = {
    session,
    status,
    login,
    register,
    logout,
    requestPasswordReset,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider session={session}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}