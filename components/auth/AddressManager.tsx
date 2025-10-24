'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressFormData {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export function AddressManager() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<AddressFormData>({
    firstName: '',
    lastName: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Ghana',
    isDefault: false,
  });

  const ghanaRegions = [
    'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra',
    'North East', 'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta',
    'Western', 'Western North'
  ];

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/auth/addresses');
      if (!response.ok) throw new Error('Failed to fetch addresses');
      const data = await response.json();
      setAddresses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate region is Greater Accra
    if (formData.state !== 'Greater Accra') {
      setError('We currently only deliver to Greater Accra. Please contact us on WhatsApp for deliveries to other regions.');
      return;
    }

    try {
      const url = editingAddress 
        ? `/api/auth/addresses/${editingAddress.id}`
        : '/api/auth/addresses';
      
      const response = await fetch(url, {
        method: editingAddress ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save address');

      await fetchAddresses();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const response = await fetch(`/api/auth/addresses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete address');
      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete address');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/auth/addresses/${id}/default`, {
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Failed to set default address');
      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default address');
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      firstName: address.firstName,
      lastName: address.lastName,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
    setFormData({
      firstName: '',
      lastName: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Ghana',
      isDefault: false,
    });
    setError(null);
  };

  const handleChange = (field: keyof AddressFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Shipping Addresses</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          Add New Address
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="grid gap-4">
        {addresses.map((address) => (
          <Card key={address.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">
                    {address.firstName} {address.lastName}
                  </h3>
                  {address.isDefault && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm">
                  {address.street}<br />
                  {address.city}, {address.state} {address.postalCode}<br />
                  {address.country}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(address)}
                >
                  Edit
                </Button>
                {!address.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(address.id)}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(address.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {addresses.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No addresses saved yet.</p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="mt-4"
            >
              Add Your First Address
            </Button>
          </Card>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Delivery Region Notice */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  We currently deliver only to <strong>Greater Accra</strong>. For other regions, contact us on WhatsApp.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            label="Street Address"
            type="text"
            value={formData.street}
            onChange={handleChange('street')}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              type="text"
              value={formData.city}
              onChange={handleChange('city')}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.state}
                onChange={handleChange('state')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Region</option>
                {ghanaRegions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              {formData.state && formData.state !== 'Greater Accra' && (
                <p className="mt-1 text-sm text-amber-600">
                  ⚠️ We only deliver to Greater Accra. Contact us on WhatsApp for other regions.
                </p>
              )}
            </div>
          </div>

          <Input
            label="GhanaPost GPS Address (optional)"
            type="text"
            value={formData.postalCode}
            onChange={handleChange('postalCode')}
            placeholder="GA-123-4567"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <select
              value={formData.country}
              onChange={handleChange('country')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled
            >
              <option value="Ghana">Ghana</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={handleChange('isDefault')}
              className="mr-2"
            />
            <label htmlFor="isDefault" className="text-sm">
              Set as default address
            </label>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingAddress ? 'Update Address' : 'Add Address'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}