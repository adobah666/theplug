'use client';

import { OrderHistory } from '@/components/auth/OrderHistory';

export default function OrdersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Order History</h1>
        <OrderHistory />
      </div>
    </div>
  );
}