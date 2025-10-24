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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'confirmed' | string;
  paymentStatus: 'pending' | 'paid' | 'failed' | string;
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
    phone?: string; // legacy
    recipientPhone?: string; // accurate per Order model
  };
  userId: {
    email: string;
    name?: string;
    phone?: string;
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
  const [etaModalOpen, setEtaModalOpen] = useState(false);
  const [etaTargetOrderId, setEtaTargetOrderId] = useState<string | null>(null);
  const [etaMode, setEtaMode] = useState<'days' | 'date'>('days');
  const [etaDays, setEtaDays] = useState<number>(3);
  const [etaDate, setEtaDate] = useState<string>('');
  // Refund requests state
  const [refunds, setRefunds] = useState<Array<any>>([])
  const [refundsLoading, setRefundsLoading] = useState<boolean>(false)
  const [refundActionId, setRefundActionId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders();
    fetchRefunds();
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

  // Refund requests helpers
  const fetchRefunds = async () => {
    try {
      setRefundsLoading(true)
      const res = await fetch('/api/admin/refunds')
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Failed to fetch refunds')
      setRefunds(Array.isArray(json?.data) ? json.data : [])
    } catch (err) {
      console.error('Failed to load refunds', err)
    } finally {
      setRefundsLoading(false)
    }
  }

  const markAsRefunded = async (id: string) => {
    try {
      setRefundActionId(id)
      const res = await fetch(`/api/admin/refunds/${id}/mark-refunded`, { method: 'POST' })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Failed to mark as refunded')
      await Promise.all([fetchRefunds(), fetchOrders()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as refunded')
    } finally {
      setRefundActionId(null)
    }
  }

  const rejectRefund = async (id: string) => {
    try {
      setRefundActionId(id)
      const res = await fetch(`/api/admin/refunds/${id}/reject`, { method: 'POST' })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Failed to reject refund')
      await fetchRefunds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject refund')
    } finally {
      setRefundActionId(null)
    }
  }



  const updateOrderStatus = async (
    orderId: string,
    status: string,
    trackingNumber?: string,
    estimatedDelivery?: string
  ) => {
    try {
      setUpdatingOrder(orderId);
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status,
          ...(trackingNumber && { trackingNumber }),
          ...(estimatedDelivery && { estimatedDelivery })
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
          <div className="flex gap-3">
            <Button onClick={fetchRefunds} variant="outline">Refresh Refunds</Button>
            <Button onClick={fetchOrders} variant="outline">
            Refresh Orders
            </Button>
          </div>
        </div>

        {/* Refund Requests Panel */}
        <div className="space-y-4 mb-10">
          <h2 className="text-2xl font-semibold">Refund Requests</h2>
          <Card className="p-6">
            {refundsLoading ? (
              <div className="flex items-center justify-center py-6"><LoadingSpinner /></div>
            ) : refunds.length === 0 ? (
              <p className="text-sm text-gray-600">No pending refund requests.</p>
            ) : (
              <div className="space-y-4">
                {refunds.map((r) => (
                  <div key={r._id} className="flex flex-col md:flex-row md:items-center md:justify-between border-b last:border-b-0 pb-4">
                    <div className="space-y-1 text-sm text-gray-700">
                      <div className="font-medium">Order #{r?.order?.orderNumber || (r?.orderId || '').slice(-8)}</div>
                      <div>Customer: {(r?.order?.userId?.email) || '—'}</div>
                      <div>Total: {formatCurrency(Number(r?.order?.total) || 0)}</div>
                      <div>Reason: {r?.reason || '—'}</div>
                      <div className="text-gray-500">Requested: {new Date(r.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2 mt-3 md:mt-0">
                      <Button size="sm" variant="outline" onClick={() => rejectRefund(r._id)} disabled={refundActionId === r._id}>Reject</Button>
                      <Button size="sm" onClick={() => markAsRefunded(r._id)} disabled={refundActionId === r._id}>Mark as Refunded</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {orders.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No orders found.</p>
            </Card>
          ) : (
            orders.map((order) => {
              const statusLc = String(order.status || '').toLowerCase();
              const payLc = String(order.paymentStatus || '').toLowerCase();
              return (
              <Card key={order._id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-lg">
                        Order #{order.orderNumber || order._id.slice(-8)}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          statusColors[statusLc as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {statusLc.charAt(0).toUpperCase() + statusLc.slice(1)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          paymentStatusColors[payLc as keyof typeof paymentStatusColors] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        Payment: {payLc || 'n/a'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p><strong>Customer:</strong> {order.userId.email}</p>
                        <p><strong>Phone:</strong> {order.userId.phone || order.shippingAddress.recipientPhone || order.shippingAddress.phone || '—'}</p>
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

                    {statusLc !== 'delivered' && statusLc !== 'cancelled' && (
                      <p className="text-blue-600 text-sm font-medium mt-2">
                        Est. delivery: {order.estimatedDelivery
                          ? new Date(order.estimatedDelivery).toLocaleDateString()
                          : calculateEstimatedDelivery(order.createdAt, statusLc)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-4 lg:mt-0 lg:ml-6">
                    {/* Start Processing button */}
                    {payLc === 'paid' && (statusLc === 'pending' || statusLc === 'confirmed') && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEtaTargetOrderId(order._id);
                          setEtaMode('days');
                          setEtaDays(3);
                          setEtaDate('');
                          setEtaModalOpen(true);
                        }}
                        disabled={updatingOrder === order._id}
                      >
                        Start Processing
                      </Button>
                    )}

                    {/* Revert to Confirmed if needed */
                    }
                    {statusLc === 'processing' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateOrderStatus(order._id, 'confirmed')}
                        disabled={updatingOrder === order._id}
                      >
                        Revert to Confirmed
                      </Button>
                    )}

                    {/* Revert shipped back to processing (if needed) */}
                    {statusLc === 'shipped' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateOrderStatus(order._id, 'processing')}
                        disabled={updatingOrder === order._id}
                      >
                        Revert to Processing
                      </Button>
                    )}

                    {/* Mark Delivered */}
                    {(statusLc === 'processing' || statusLc === 'shipped') && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order._id, 'delivered')}
                        disabled={updatingOrder === order._id}
                      >
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Order Items</h4>
                  <div className="grid gap-3">
                    {order.items.map((item, index) => {
                      const displayName = (item as any).name || (item as any).productName || 'Item'
                      const displayImage = (item as any).image || (item as any).productImage || '/placeholder-image.jpg'
                      const unitPrice = (item as any).unitPrice ?? (item as any).price ?? 0
                      return (
                        <div key={item.id || index} className="flex items-center gap-4">
                          <img
                            src={displayImage}
                            alt={displayName}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{displayName}</h5>
                            {item.variant && (
                              <p className="text-xs text-gray-600">
                                {item.variant.size && `Size: ${item.variant.size}`}
                                {item.variant.size && item.variant.color && ', '}
                                {item.variant.color && `Color: ${item.variant.color}`}
                              </p>
                            )}
                            <p className="text-xs text-gray-600">
                              Qty: {item.quantity} × {formatCurrency(unitPrice)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>
            )})
          )}
        </div>
      </div>
    {/* ETA Modal */}
    {etaModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="border-b px-6 py-4">
            <h3 className="text-lg font-semibold">Set Estimated Delivery</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="eta-mode"
                  checked={etaMode === 'days'}
                  onChange={() => setEtaMode('days')}
                />
                Days from today
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="eta-mode"
                  checked={etaMode === 'date'}
                  onChange={() => setEtaMode('date')}
                />
                Specific date
              </label>
            </div>

            {etaMode === 'days' ? (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={etaDays}
                  onChange={(e) => setEtaDays(Number(e.target.value))}
                  className="w-28 rounded border px-3 py-2 text-sm"
                />
                <span className="text-sm text-gray-600">day(s) from today</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={etaDate}
                  onChange={(e) => setEtaDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="rounded border px-3 py-2 text-sm"
                />
              </div>
            )}

            <p className="text-xs text-gray-500">Tip: use the date picker for exact dates. We’ll validate the date before saving.</p>
          </div>
          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setEtaModalOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!etaTargetOrderId) return;
                let iso: string | undefined = undefined;
                if (etaMode === 'days') {
                  const d = Number(etaDays);
                  if (!Number.isFinite(d) || d < 1 || d > 60) {
                    alert('Please enter a valid number of days between 1 and 60.');
                    return;
                  }
                  const base = new Date();
                  base.setDate(base.getDate() + d);
                  iso = base.toISOString();
                } else {
                  if (!etaDate || isNaN(Date.parse(etaDate))) {
                    alert('Please select a valid date.');
                    return;
                  }
                  const chosen = new Date(etaDate + 'T00:00:00');
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  if (chosen < today) {
                    alert('Estimated delivery date cannot be in the past.');
                    return;
                  }
                  iso = chosen.toISOString();
                }
                await updateOrderStatus(etaTargetOrderId, 'processing', undefined, iso);
                setEtaModalOpen(false);
                setEtaTargetOrderId(null);
              }}
            >
              Save ETA
            </Button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
