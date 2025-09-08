import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddressManager } from '@/components/auth/AddressManager';

// Mock fetch
global.fetch = jest.fn();

// Mock window.confirm
global.confirm = jest.fn();

describe('AddressManager', () => {
  const mockAddresses = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      street: '123 Test St',
      city: 'Lagos',
      state: 'Lagos',
      postalCode: '100001',
      country: 'Nigeria',
      isDefault: true,
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      street: '456 Another St',
      city: 'Abuja',
      state: 'FCT',
      postalCode: '900001',
      country: 'Nigeria',
      isDefault: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<AddressManager />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders addresses list', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAddresses),
    });

    render(<AddressManager />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  it('renders empty state when no addresses', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AddressManager />);

    await waitFor(() => {
      expect(screen.getByText('No addresses saved yet.')).toBeInTheDocument();
      expect(screen.getByText('Add Your First Address')).toBeInTheDocument();
    });
  });

  it('opens add address modal', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AddressManager />);

    await waitFor(() => {
      const addButton = screen.getByText('Add New Address');
      fireEvent.click(addButton);
    });

    expect(screen.getByText('Add New Address')).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it('submits new address form', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '3', firstName: 'New', lastName: 'User' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

    render(<AddressManager />);

    await waitFor(() => {
      const addButton = screen.getByText('Add New Address');
      fireEvent.click(addButton);
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'New' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'User' },
    });
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '789 New St' },
    });
    fireEvent.change(screen.getByLabelText(/city/i), {
      target: { value: 'Lagos' },
    });
    fireEvent.change(screen.getByLabelText(/state/i), {
      target: { value: 'Lagos' },
    });
    fireEvent.change(screen.getByLabelText(/postal code/i), {
      target: { value: '100001' },
    });

    const submitButton = screen.getByText('Add Address');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'New',
          lastName: 'User',
          street: '789 New St',
          city: 'Lagos',
          state: 'Lagos',
          postalCode: '100001',
          country: 'Nigeria',
          isDefault: false,
        }),
      });
    });
  });

  it('handles edit address', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAddresses),
    });

    render(<AddressManager />);

    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
    });

    expect(screen.getByText('Edit Address')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
  });

  it('handles delete address with confirmation', async () => {
    (global.confirm as jest.Mock).mockReturnValue(true);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAddresses),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Address deleted' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockAddresses[1]]),
      });

    render(<AddressManager />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]); // Delete second address (not default)
    });

    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this address?');
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/addresses/2', {
        method: 'DELETE',
      });
    });
  });

  it('handles set default address', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAddresses),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Default address updated' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAddresses),
      });

    render(<AddressManager />);

    await waitFor(() => {
      const setDefaultButton = screen.getByText('Set Default');
      fireEvent.click(setDefaultButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/addresses/2/default', {
        method: 'PUT',
      });
    });
  });

  it('validates required fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AddressManager />);

    await waitFor(() => {
      const addButton = screen.getByText('Add New Address');
      fireEvent.click(addButton);
    });

    const submitButton = screen.getByText('Add Address');
    fireEvent.click(submitButton);

    // Form should not submit without required fields
    expect(global.fetch).not.toHaveBeenCalledWith('/api/auth/addresses', expect.any(Object));
  });

  it('handles API errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<AddressManager />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});