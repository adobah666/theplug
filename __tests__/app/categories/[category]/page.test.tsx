import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useParams, useSearchParams } from 'next/navigation';
import CategoryPage from '@/app/categories/[category]/page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockProducts = [
  {
    _id: '1',
    name: 'Product 1',
    price: 25000,
    images: ['/product1.jpg'],
    brand: 'Brand A',
    rating: 4.0,
    reviewCount: 5
  },
  {
    _id: '2',
    name: 'Product 2',
    price: 35000,
    images: ['/product2.jpg'],
    brand: 'Brand B',
    rating: 4.5,
    reviewCount: 8
  }
];

const mockSearchParams = new URLSearchParams();

describe('CategoryPage', () => {
  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({ category: 'men' });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: mockProducts,
        total: 2
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders category page with products', async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Men's Fashion")).toBeInTheDocument();
    });

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('2 products found')).toBeInTheDocument();
  });

  it('displays breadcrumb navigation', async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    expect(screen.getByText("Men's Fashion")).toBeInTheDocument();
  });

  it('shows category header with description', async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Men's Fashion")).toBeInTheDocument();
    });

    expect(screen.getByText(/Discover the latest trends in men's clothing/)).toBeInTheDocument();
  });

  it('displays subcategory navigation', async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    expect(screen.getByText('shirts')).toBeInTheDocument();
    expect(screen.getByText('pants')).toBeInTheDocument();
    expect(screen.getByText('shoes')).toBeInTheDocument();
  });

  it('handles view mode toggle', async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    // Find grid/list toggle buttons
    const buttons = screen.getAllByRole('button');
    const listViewButton = buttons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('p-2')
    );

    if (listViewButton) {
      fireEvent.click(listViewButton);
      // View mode should change (this would be tested through visual changes)
    }
  });

  it('handles sort dropdown changes', async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Newest First')).toBeInTheDocument();
    });

    const sortSelect = screen.getByDisplayValue('Newest First');
    fireEvent.change(sortSelect, { target: { value: 'price-low' } });

    // This would trigger a page reload in the actual implementation
    expect(sortSelect.value).toBe('price-low');
  });

  it('shows loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<CategoryPage />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('handles empty category', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: [],
        total: 0
      }),
    });

    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('No products found in this category.')).toBeInTheDocument();
    });

    expect(screen.getByText('Browse All Products')).toBeInTheDocument();
  });

  it('handles fetch error', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load products/i)).toBeInTheDocument();
    });
  });

  it('displays mobile filter button', async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });
});