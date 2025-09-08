'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthUser } from '@/lib/auth/hooks';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface ProfileFormProps {
  onSuccess?: () => void;
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const { user, updateProfile } = useAuthUser();
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Keep form in sync when session user loads/changes
  useEffect(() => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    })
  }, [user?.firstName, user?.lastName, user?.email, user?.phone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProfile(formData);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          type="text"
          value={formData.firstName}
          onChange={handleChange('firstName')}
          required
        />
        <Input
          label="Last Name"
          type="text"
          value={formData.lastName}
          onChange={handleChange('lastName')}
          required
        />
      </div>
      
      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleChange('email')}
        required
      />
      
      <Input
        label="Phone"
        type="tel"
        value={formData.phone}
        onChange={handleChange('phone')}
      />

      {error && <ErrorMessage message={error} />}
      
      {success && (
        <div className="text-green-600 text-sm">
          Profile updated successfully!
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? <LoadingSpinner size="sm" /> : 'Update Profile'}
      </Button>
    </form>
  );
}