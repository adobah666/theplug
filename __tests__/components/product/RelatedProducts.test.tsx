import { render, screen, waitFor } from '@testing-library/react';
import { RelatedProducts } from '@/components/product/RelatedProducts';

// Mock fetch
global.fetch = jest.fn();

const mockProducts = [
  {
    _id: '2',
    name: 'Related Product 1',
    price: 25000,
    images: ['/related1.jpg'],
    brand: 'Brand A',
    rating: 4.0,
    reviewCount: 5
  },
  {
    _id: '3',
    name: 'Related Product 2',
    price: 35000,
    images: ['/related2.jpg'],
    brand: 'Brand B',
    rating: 4.5,
    reviewCount: 8
  }
];

describe('RelatedProducts', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: mockProducts
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders related products correctly', async () => {
    render(
      <RelatedProducts 
        productId="1" 
        category="men" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Related Products')).toBeInTheDocument();
    });

    expect(screen.getByText('Related Product 1')).toBeInTheDocument();
    expect(screen.getByText('Related Product 2')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(
      <RelatedProducts 
        productId="1" 
        category="men" 
      />
    );
    
    expect(screen.getByText('Related Products')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not render when no related products found', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: []
      }),
    });

    const { container } = render(
      <RelatedProducts 
        productId="1" 
        category="men" 
      />
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('handles fetch error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    const { container } = render(
      <RelatedProducts 
        productId="1" 
        category="men" 
      />
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('fetches with correct parameters', async () => {
    render(
      <RelatedProducts 
        productId="1" 
        category="men" 
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/products/search?category=men&limit=4&exclude=1'
      );
    });
  });

  it('applies custom className', async () => {
    render(
      <RelatedProducts 
        productId="1" 
        category="men" 
        className="custom-class"
      />
    );

    await waitFor(() => {
      const container = screen.getByText('Related Products').closest('div');
      expect(container).toHaveClass('custom-class');
    });
  });
});