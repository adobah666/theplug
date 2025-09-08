import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useParams } from 'next/navigation';
import ProductPage from '@/app/products/[id]/page';
import { useCart } from '@/lib/cart/hooks';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

jest.mock('@/lib/cart/hooks', () => ({
  useCart: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockProduct = {
  _id: '1',
  name: 'Test Product',
  description: 'Test product description',
  price: 50000,
  originalPrice: 60000,
  images: ['/test-image.jpg'],
  category: 'men',
  brand: 'Test Brand',
  rating: 4.5,
  reviewCount: 10,
  variants: [
    {
      _id: 'v1',
      size: 'M',
      color: 'Blue',
      price: 50000,
      stock: 5
    }
  ]
};

const mockUseCart = {
  addToCart: jest.fn(),
  isLoading: false,
};

describe('ProductPage', () => {
  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({ id: '1' });
    (useCart as jest.Mock).mockReturnValue(mockUseCart);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProduct),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders product information correctly', async () => {
    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    expect(screen.getByText('Test product description')).toBeInTheDocument();
    expect(screen.getByText('₦50,000')).toBeInTheDocument();
    expect(screen.getByText('₦60,000')).toBeInTheDocument();
    expect(screen.getByText('Test Brand')).toBeInTheDocument();
  });

  it('displays breadcrumb navigation', async () => {
    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    expect(screen.getByText('Men')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('handles add to cart functionality', async () => {
    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });

    const addToCartButton = screen.getByText('Add to Cart');
    fireEvent.click(addToCartButton);

    expect(mockUseCart.addToCart).toHaveBeenCalledWith({
      productId: '1',
      variantId: 'v1',
      quantity: 1
    });
  });

  it('handles quantity changes', async () => {
    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    const increaseButton = screen.getByText('+');
    fireEvent.click(increaseButton);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays discount percentage when on sale', async () => {
    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('-17%')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<ProductPage />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('handles product not found error', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText(/Product not found/i)).toBeInTheDocument();
    });
  });

  it('displays product features', async () => {
    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('Free Shipping')).toBeInTheDocument();
    });

    expect(screen.getByText('Easy Returns')).toBeInTheDocument();
    expect(screen.getByText('Secure Payment')).toBeInTheDocument();
  });
});