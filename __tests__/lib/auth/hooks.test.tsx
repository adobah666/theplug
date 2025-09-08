import { render, screen, waitFor } from '@testing-library/react'
import { useRequireAuth, useRedirectIfAuthenticated, useAuthUser } from '@/lib/auth/hooks'
import { AuthProvider } from '@/lib/auth/context'
import { vi } from 'vitest'
import { useSession } from 'next-auth/react'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

// Test components
function RequireAuthTestComponent() {
  const { session, status, isLoading } = useRequireAuth('/custom-login')
  
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{session?.user?.email || 'no-user'}</div>
    </div>
  )
}

function RedirectIfAuthTestComponent() {
  const { session, status, isLoading } = useRedirectIfAuthenticated('/dashboard')
  
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{session?.user?.email || 'no-user'}</div>
    </div>
  )
}

function AuthUserTestComponent() {
  const { user, isAuthenticated, isLoading } = useAuthUser()
  
  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user?.email || 'no-user'}</div>
    </div>
  )
}

const mockUseSession = vi.mocked(useSession)

describe('Auth Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useRequireAuth', () => {
    it('redirects to login when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(
        <AuthProvider>
          <RequireAuthTestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-login')
      })

      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    it('does not redirect when authenticated', async () => {
      const mockSession = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User'
        }
      }

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(
        <AuthProvider>
          <RequireAuthTestComponent />
        </AuthProvider>
      )

      // Wait a bit to ensure no redirect happens
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockPush).not.toHaveBeenCalled()
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    it('shows loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      })

      render(
        <AuthProvider>
          <RequireAuthTestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('status')).toHaveTextContent('loading')
      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('useRedirectIfAuthenticated', () => {
    it('redirects to dashboard when authenticated', async () => {
      const mockSession = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User'
        }
      }

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(
        <AuthProvider>
          <RedirectIfAuthTestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })

      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })

    it('does not redirect when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(
        <AuthProvider>
          <RedirectIfAuthTestComponent />
        </AuthProvider>
      )

      // Wait a bit to ensure no redirect happens
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockPush).not.toHaveBeenCalled()
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })

    it('does not redirect while loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      })

      render(
        <AuthProvider>
          <RedirectIfAuthTestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('useAuthUser', () => {
    it('returns user data when authenticated', () => {
      const mockSession = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          phone: '+1234567890'
        }
      }

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(
        <AuthProvider>
          <AuthUserTestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    it('returns null user when unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(
        <AuthProvider>
          <AuthUserTestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })

    it('shows loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      })

      render(
        <AuthProvider>
          <AuthUserTestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })
  })
})