'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils/currency';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  shippingAddress: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
}

interface OrderDetailsProps {
  orderId: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export function OrderDetails({ orderId }: OrderDetailsProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const data = await response.json();
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!order) {
    return <ErrorMessage message="Order not found" />;
  }

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-gray-600">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
            {order.updatedAt !== order.createdAt && (
              <p className="text-gray-600 text-sm">
                Last updated: {new Date(order.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-4 lg:mt-0">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium text-center ${
                statusColors[order.status]
              }`}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium text-center ${
                paymentStatusColors[order.paymentStatus]
              }`}
            >
              Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
            </span>
          </div>
        </div>
      </Card>

      {/* Tracking Information */}
      {order.trackingNumber && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Tracking Information</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <p className="text-sm text-gray-600">Tracking Number</p>
              <p className="font-mono font-medium">{order.trackingNumber}</p>
            </div>
            {order.trackingUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(order.trackingUrl, '_blank')}
              >
                Track Package
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Order Items */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 pb-4 border-b last:border-b-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                {item.variant && (
                  <p className="text-sm text-gray-600">
                    {item.variant.size && `Size: ${item.variant.size}`}
                    {item.variant.size && item.variant.color && ', '}
                    {item.variant.color && `Color: ${item.variant.color}`}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  Quantity: {item.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(item.price)}</p>
                <p className="text-sm text-gray-600">each</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Order Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatCurrency(order.shipping)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            Payment Method: {order.paymentMethod}
          </p>
        </div>
      </Card>

      {/* Shipping Address */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
        <div className="text-gray-700">
          <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
          <p>{order.shippingAddress.street}</p>
          <p>
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
          </p>
          <p>{order.shippingAddress.country}</p>
        </div>
      </Card>
    </div>
  );
}