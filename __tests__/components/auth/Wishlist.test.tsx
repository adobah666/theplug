import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Wishlist } from '@/components/auth/Wishlist';
import { useAuth } from '@/lib/auth/hooks';
import { useCart } from '@/lib/cart/hooks';

// Mock the hooks
jest.mock('@/lib/auth/hooks');
jest.mock('@/lib/cart/hooks');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

// Mock fetch
global.fetch = jest.fn();

describe('Wishlist', () => {
  const mockUser = { id: '1', email: 'test@example.com' };
  const mockAddToCart = jest.fn();

  const mockWishlistItems = [
    {
      id: '1',
      productId: 'prod1',
      name: 'Test Product 1',
      price: 15000,
      originalPrice: 20000,
      image: '/test-image1.jpg',
      brand: 'Test Brand',
      inStock: true,
      addedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      productId: 'prod2',
      name: 'Test Product 2',
      price: 25000,
      image: '/test-image2.jpg',
      brand: 'Another Brand',
      inStock: false,
      addedAt: '2024-01-16T10:00:00Z',
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

    mockUseCart.mockReturnValue({
      items: [],
      addToCart: mockAddToCart,
      removeFromCart: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
      total: 0,
      itemCount: 0,
    });

    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<Wishlist />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders empty wishlist state', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<Wishlist />);

    await waitFor(() => {
      expect(screen.getByText('Your wishlist is empty.')).toBeInTheDocument();
      expect(screen.getByText('Browse Products')).toBeInTheDocument();
    });
  });

  it('renders wishlist items', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWishlistItems),
    });

    render(<Wishlist />);

    await waitFor(() => {
      expect(screen.getByText('My Wishlist (2 items)')).toBeInTheDocument();
      expect(screen.getByText('1 items in stock')).toBeInTheDocument();
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    });
  });

  it('shows correct stock status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWishlistItems),
    });

    render(<Wishlist />);

    await waitFor(() => {
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('handles add to cart', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWishlistItems),
    });

    mockAddToCart.mockResolvedValue(undefined);

    render(<Wishlist />);

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    });

    const addToCartButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addToCartButtons[0]);

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith({
        productId: 'prod1',
        quantity: 1,
      });
    });
  });

  it('handles remove from wishlist', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWishlistItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Removed from wishlist' }),
      });

    render(<Wishlist />);

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/wishlist/1', {
        method: 'DELETE',
      });
    });
  });

  it('handles move all to cart', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWishlistItems),
    });

    mockAddToCart.mockResolvedValue(undefined);

    render(<Wishlist />);

    await waitFor(() => {
      expect(screen.getByText('Move All to Cart')).toBeInTheDocument();
    });

    const moveAllButton = screen.getByText('Move All to Cart');
    fireEvent.click(moveAllButton);

    await waitFor(() => {
      // Should only add in-stock items
      expect(mockAddToCart).toHaveBeenCalledTimes(1);
      expect(mockAddToCart).toHaveBeenCalledWith({
        productId: 'prod1',
        quantity: 1,
      });
    });
  });

  it('disables add to cart for out of stock items', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWishlistItems),
    });

    render(<Wishlist />);

    await waitFor(() => {
      const outOfStockButton = screen.getByText('Out of Stock');
      expect(outOfStockButton).toBeDisabled();
    });
  });

  it('shows original price when discounted', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWishlistItems),
    });

    render(<Wishlist />);

    await waitFor(() => {
      expect(screen.getByText('₦15,000')).toBeInTheDocument();
      expect(screen.getByText('₦20,000')).toBeInTheDocument();
    });
  });

  it('handles fetch error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<Wishlist />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});