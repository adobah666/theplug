import { render, screen, waitFor } from '@testing-library/react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
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

const mockUseSession = vi.mocked(useSession)

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when user is authenticated', async () => {
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
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows loading spinner when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading'
    })

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows custom fallback when provided and loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading'
    })

    render(
      <AuthProvider>
        <ProtectedRoute fallback={<div data-testid="custom-loading">Custom Loading</div>}>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(screen.getByTestId('custom-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('redirects to custom redirect path when provided', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(
      <AuthProvider>
        <ProtectedRoute redirectTo="/custom-login">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-login')
    })

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('renders nothing when not authenticated and no session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    const { container } = render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    // Should render nothing (empty container)
    expect(container.firstChild).toBeEmptyDOMElement()
  })
})