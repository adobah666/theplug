import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderHistory } from '@/components/auth/OrderHistory';
import { useAuth } from '@/lib/auth/hooks';

// Mock the auth hook
jest.mock('@/lib/auth/hooks');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch
global.fetch = jest.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

describe('OrderHistory', () => {
  const mockUser = { id: '1', email: 'test@example.com' };

  const mockOrders = [
    {
      id: '1',
      orderNumber: 'ORD-001',
      status: 'delivered' as const,
      total: 15000,
      createdAt: '2024-01-15T10:00:00Z',
      items: [
        {
          id: '1',
          productId: 'prod1',
          name: 'Test Product',
          image: '/test-image.jpg',
          price: 15000,
          quantity: 1,
        },
      ],
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Test St',
        city: 'Lagos',
        state: 'Lagos',
        postalCode: '100001',
        country: 'Nigeria',
      },
      trackingNumber: 'TRK123456',
    },
  ];

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      updateProfile: jest.fn(),
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<OrderHistory />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders empty state when no orders', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText("You haven't placed any orders yet.")).toBeInTheDocument();
      expect(screen.getByText('Start Shopping')).toBeInTheDocument();
    });
  });

  it('renders orders list', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOrders),
    });

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('₦15,000')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });
  });

  it('handles reorder functionality', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrders),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Items added to cart' }),
      });

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    const reorderButton = screen.getByText('Reorder');
    fireEvent.click(reorderButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/orders/1/reorder', {
        method: 'POST',
      });
    });
  });

  it('shows tracking button when tracking number exists', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOrders),
    });

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Track Package')).toBeInTheDocument();
    });
  });

  it('handles fetch error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('fetches orders for correct user', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<OrderHistory />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/orders/user/1');
    });
  });

  it('displays order status with correct styling', async () => {
    const ordersWithDifferentStatuses = [
      { ...mockOrders[0], status: 'pending' as const },
      { ...mockOrders[0], id: '2', status: 'processing' as const },
      { ...mockOrders[0], id: '3', status: 'shipped' as const },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ordersWithDifferentStatuses),
    });

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Shipped')).toBeInTheDocument();
    });
  });
});