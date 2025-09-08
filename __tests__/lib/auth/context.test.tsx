import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/lib/auth/context'
import { vi } from 'vitest'
import { signIn, signOut, useSession } from 'next-auth/react'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

// Test component that uses the auth context
function TestComponent() {
  const { session, status, login, register, logout, requestPasswordReset } = useAuth()

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="user-email">{session?.user?.email || 'No user'}</div>
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => register({ 
        name: 'Test User',
        email: 'test@example.com', 
        phone: '+1234567890',
        password: 'password',
        confirmPassword: 'password'
      })}>
        Register
      </button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => requestPasswordReset({ email: 'test@example.com' })}>
        Reset Password
      </button>
    </div>
  )
}

const mockSignIn = vi.mocked(signIn)
const mockSignOut = vi.mocked(signOut)
const mockUseSession = vi.mocked(useSession)

describe('AuthProvider and useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })
  })

  it('provides authentication context', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
  })

  it('displays user session when authenticated', () => {
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
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
  })

  it('calls signIn when login is called', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ ok: true })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await user.click(screen.getByText('Login'))

    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'test@example.com',
      password: 'password',
      redirect: false,
    })
  })

  it('handles login failure gracefully', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Click login button - the error will be thrown but caught by the component
    await user.click(screen.getByText('Login'))
    expect(mockSignIn).toHaveBeenCalled()
  })

  it('calls register API and then login on successful registration', async () => {
    const user = userEvent.setup()
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Registration successful' })
    } as Response)
    
    mockSignIn.mockResolvedValue({ ok: true })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await user.click(screen.getByText('Register'))

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        password: 'password',
        confirmPassword: 'password'
      }),
    })

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password',
        redirect: false,
      })
    })
  })

  it('calls signOut when logout is called', async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValue(undefined)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await user.click(screen.getByText('Logout'))

    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false })
  })

  it('calls password reset API', async () => {
    const user = userEvent.setup()
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Reset email sent' })
    } as Response)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await user.click(screen.getByText('Reset Password'))

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
  })

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})