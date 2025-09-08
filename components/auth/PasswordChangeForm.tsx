'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface PasswordChangeFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChangeFormProps {
  onSuccess?: () => void;
}

export function PasswordChangeForm({ onSuccess }: PasswordChangeFormProps) {
  const [formData, setFormData] = useState<PasswordChangeFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof PasswordChangeFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Current Password"
        type="password"
        value={formData.currentPassword}
        onChange={handleChange('currentPassword')}
        required
      />
      
      <Input
        label="New Password"
        type="password"
        value={formData.newPassword}
        onChange={handleChange('newPassword')}
        required
        minLength={8}
      />
      
      <Input
        label="Confirm New Password"
        type="password"
        value={formData.confirmPassword}
        onChange={handleChange('confirmPassword')}
        required
        minLength={8}
      />

      {error && <ErrorMessage message={error} />}
      
      {success && (
        <div className="text-green-600 text-sm">
          Password changed successfully!
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? <LoadingSpinner size="sm" /> : 'Change Password'}
      </Button>
    </form>
  );
}