'use client'

import { createContext, useContext, ReactNode } from 'react'
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react'
import { Session } from 'next-auth'
import { LoginFormData, RegisterFormData, PasswordResetFormData } from './validation'

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

  const login = async (data: LoginFormData) => {
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      throw new Error(result.error)
    }

    if (!result?.ok) {
      throw new Error('Login failed')
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
    await signOut({ redirect: false })
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
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error || error?.message || `Failed to update profile (${response.status})`)
    }

    // Refresh session to get updated user data
    await fetch('/api/auth/session?update')
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