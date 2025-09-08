import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { useAuth } from '@/lib/auth/hooks';

// Mock the auth hook
jest.mock('@/lib/auth/hooks');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch
global.fetch = jest.fn();

describe('ProfileForm', () => {
  const mockUser = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  };

  const mockUpdateProfile = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      updateProfile: mockUpdateProfile,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  it('renders form with user data', () => {
    render(<ProfileForm />);

    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
  });

  it('updates form fields when user types', () => {
    render(<ProfileForm />);

    const firstNameInput = screen.getByDisplayValue('John');
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });

    expect(firstNameInput).toHaveValue('Jane');
  });

  it('submits form with updated data', async () => {
    mockUpdateProfile.mockResolvedValue(undefined);
    render(<ProfileForm />);

    const firstNameInput = screen.getByDisplayValue('John');
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });

    const submitButton = screen.getByRole('button', { name: /update profile/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });
    });
  });

  it('shows success message after successful update', async () => {
    mockUpdateProfile.mockResolvedValue(undefined);
    render(<ProfileForm />);

    const submitButton = screen.getByRole('button', { name: /update profile/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    });
  });

  it('shows error message on update failure', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('Update failed'));
    render(<ProfileForm />);

    const submitButton = screen.getByRole('button', { name: /update profile/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    mockUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<ProfileForm />);

    const submitButton = screen.getByRole('button', { name: /update profile/i });
    fireEvent.click(submitButton);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onSuccess callback after successful update', async () => {
    const onSuccess = jest.fn();
    mockUpdateProfile.mockResolvedValue(undefined);
    render(<ProfileForm onSuccess={onSuccess} />);

    const submitButton = screen.getByRole('button', { name: /update profile/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});