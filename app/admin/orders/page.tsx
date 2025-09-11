'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
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
  _id: string;
  orderNumber?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  total: number;
  createdAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  items: OrderItem[];
  shippingAddress: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  userId: {
    email: string;
    name?: string;
  };
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const paymentStatusColors = {
  pending: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, trackingNumber?: string) => {
    try {
      setUpdatingOrder(orderId);
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status,
          ...(trackingNumber && { trackingNumber })
        }),
      });

      if (!response.ok) throw new Error('Failed to update order');
      
      // Refresh orders list
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const calculateEstimatedDelivery = (createdAt: string, status: string) => {
    if (status === 'delivered' || status === 'cancelled') return null;
    
    const orderDate = new Date(createdAt);
    const deliveryDate = new Date(orderDate);
    
    // Add 3-7 business days based on status
    const daysToAdd = status === 'shipped' ? 3 : 7;
    deliveryDate.setDate(orderDate.getDate() + daysToAdd);
    
    return deliveryDate.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Order Management</h1>
          <Button onClick={fetchOrders} variant="outline">
            Refresh Orders
          </Button>
        </div>

        <div className="space-y-6">
          {orders.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No orders found.</p>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order._id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-lg">
                        Order #{order.orderNumber || order._id.slice(-8)}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          statusColors[order.status]
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          paymentStatusColors[order.paymentStatus]
                        }`}
                      >
                        Payment: {order.paymentStatus}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p><strong>Customer:</strong> {order.userId.email}</p>
                        <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                        <p><strong>Total:</strong> {formatCurrency(order.total)}</p>
                        {order.trackingNumber && (
                          <p><strong>Tracking:</strong> {order.trackingNumber}</p>
                        )}
                      </div>
                      <div>
                        <p><strong>Ship to:</strong> {order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                        <p>{order.shippingAddress.street}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                        <p>{order.shippingAddress.phone}</p>
                      </div>
                    </div>

                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <p className="text-blue-600 text-sm font-medium mt-2">
                        Est. delivery: {calculateEstimatedDelivery(order.createdAt, order.status)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-4 lg:mt-0 lg:ml-6">
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order._id, 'processing')}
                        disabled={updatingOrder === order._id}
                      >
                        Mark Processing
                      </Button>
                    )}
                    
                    {order.status === 'processing' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const trackingNumber = prompt('Enter tracking number (optional):');
                          updateOrderStatus(order._id, 'shipped', trackingNumber || undefined);
                        }}
                        disabled={updatingOrder === order._id}
                      >
                        Mark Shipped
                      </Button>
                    )}
                    
                    {order.status === 'shipped' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order._id, 'delivered')}
                        disabled={updatingOrder === order._id}
                      >
                        Mark Delivered
                      </Button>
                    )}

                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this order?')) {
                            updateOrderStatus(order._id, 'cancelled');
                          }
                        }}
                        disabled={updatingOrder === order._id}
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Order Items</h4>
                  <div className="grid gap-3">
                    {order.items.map((item, index) => (
                      <div key={item.id || index} className="flex items-center gap-4">
                        <img
                          src={item.image || '/placeholder-image.jpg'}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">{item.name}</h5>
                          {item.variant && (
                            <p className="text-xs text-gray-600">
                              {item.variant.size && `Size: ${item.variant.size}`}
                              {item.variant.size && item.variant.color && ', '}
                              {item.variant.color && `Color: ${item.variant.color}`}
                            </p>
                          )}
                          <p className="text-xs text-gray-600">
                            Qty: {item.quantity} × {formatCurrency(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
