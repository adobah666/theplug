import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PasswordChangeForm } from '@/components/auth/PasswordChangeForm';

// Mock fetch
global.fetch = jest.fn();

describe('PasswordChangeForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all password fields', () => {
    render(<PasswordChangeForm />);

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it('validates password match', async () => {
    render(<PasswordChangeForm />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'oldpassword' },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'differentpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    render(<PasswordChangeForm />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'oldpassword' },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText('New password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Password changed successfully' }),
    });

    render(<PasswordChangeForm />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'oldpassword' },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'newpassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
        }),
      });
    });
  });

  it('shows success message after successful change', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Password changed successfully' }),
    });

    render(<PasswordChangeForm />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'oldpassword' },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'newpassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
    });
  });

  it('shows error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Current password is incorrect' }),
    });

    render(<PasswordChangeForm />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'newpassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
    });
  });

  it('clears form after successful change', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Password changed successfully' }),
    });

    render(<PasswordChangeForm />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(currentPasswordInput).toHaveValue('');
      expect(newPasswordInput).toHaveValue('');
      expect(confirmPasswordInput).toHaveValue('');
    });
  });
});