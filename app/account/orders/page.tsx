'use client';

import { Suspense } from 'react';

import { OrderHistory } from '@/components/auth/OrderHistory';

export const dynamic = 'force-dynamic';

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-[200px] flex items-center justify-center">Loading…</div>}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Order History</h1>
          <OrderHistory />
        </div>
      </div>
    </Suspense>
  );
}