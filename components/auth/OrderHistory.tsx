'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { useAuthUser } from '@/lib/auth/hooks';
import { formatCurrency } from '@/lib/utils/currency';

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
  createdAt: string;
  estimatedDelivery?: string;
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
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function OrderHistory() {
  const { user, isLoading: authLoading } = useAuthUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      setError('Please sign in to view your orders.');
      return;
    }
    fetchOrders();
  }, [user, authLoading]);

  const fetchOrders = async () => {
    try {
      const uid = (user as any)?.id || (user as any)?._id;
      if (!uid) throw new Error('User ID not found');
      const response = await fetch(`/api/orders/user/${uid}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      const list = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [];
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/reorder`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to reorder');
      
      // Redirect to cart or show success message
      window.location.href = '/cart';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-6">
      {orders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
          <Link href="/products">
            <Button>Start Shopping</Button>
          </Link>
        </Card>
      ) : (
        orders.map((order) => (
          <Card key={order.id} className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">
                  Order #{order.orderNumber}
                </h3>
                <p className="text-gray-600 text-sm">
                  Placed on {new Date(order.createdAt).toLocaleDateString()}
                </p>
                {order.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <p className="text-blue-600 text-sm font-medium">
                    Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 lg:mt-0">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusColors[order.status]
                  }`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <span className="font-semibold">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid gap-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      {item.variant && (
                        <p className="text-sm text-gray-600">
                          {item.variant.size && `Size: ${item.variant.size}`}
                          {item.variant.size && item.variant.color && ', '}
                          {item.variant.color && `Color: ${item.variant.color}`}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Qty: {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 mt-4 flex flex-col sm:flex-row gap-3">
              <Link href={`/orders/${order.id}`}>
                <Button variant="outline" className="w-full sm:w-auto">
                  View Details
                </Button>
              </Link>
              
              {order.trackingNumber && (
                <Button variant="outline" className="w-full sm:w-auto">
                  Track Package
                </Button>
              )}
              
              {order.status === 'delivered' && (
                <Button
                  variant="outline"
                  onClick={() => handleReorder(order.id)}
                  className="w-full sm:w-auto"
                >
                  Reorder
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}