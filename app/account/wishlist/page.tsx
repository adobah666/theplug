'use client';

import { Wishlist } from '@/components/auth/Wishlist';

export default function WishlistPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">My Wishlist</h1>
        <Wishlist />
      </div>
    </div>
  );
}