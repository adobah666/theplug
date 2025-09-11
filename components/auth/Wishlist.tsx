'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { useAuth } from '@/lib/auth/hooks';
import { useCart } from '@/lib/cart/hooks';
import { formatCurrency } from '@/lib/utils/currency';

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  brand: string;
  inStock: boolean;
  addedAt: string;
}

export function Wishlist() {
  const { session, status } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [addingItems, setAddingItems] = useState<Set<string>>(new Set());
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWishlist();
    } else if (status === 'unauthenticated') {
      // Not logged in; stop spinner and show message
      setIsLoading(false);
    }
  }, [status]);

  const fetchWishlist = async () => {
    try {
      const response = await fetch('/api/wishlist', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch wishlist');
      const data = await response.json();
      setItems(data);
      // initialize quantities to 1 for each item
      const q: Record<string, number> = {}
      for (const it of data as WishlistItem[]) {
        q[it.id] = q[it.id] ?? 1
      }
      setQuantities(q)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (itemId: string) => {
    setRemovingItems(prev => new Set(prev).add(itemId));
    
    try {
      const response = await fetch(`/api/wishlist/${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to remove from wishlist');
      
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleBuyNow = async (item: WishlistItem) => {
    try {
      // mark adding
      setAddingItems(prev => new Set(prev).add(item.id))
      await addItem({
        productId: item.productId,
        variantId: undefined,
        quantity: Math.max(1, quantities[item.id] ?? 1),
        price: item.price,
        name: item.name,
        image: item.image,
        size: undefined,
        color: undefined,
        maxInventory: undefined,
      });
      // Navigate to checkout and carry wishlist item id to remove after purchase
      router.push(`/checkout?wishlistItemId=${encodeURIComponent(item.id)}`)

      // Optionally remove from wishlist after adding to cart
      // await handleRemoveFromWishlist(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setAddingItems(prev => {
        const n = new Set(prev)
        n.delete(item.id)
        return n
      })
    }
  };

  // Removed bulk move action to keep flow focused on Buy Now per item

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (status === 'unauthenticated') {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600 mb-4">Please sign in to view your wishlist.</p>
        <a href="/login">
          <Button>Sign In</Button>
        </a>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Your wishlist is empty.</p>
          <Link href="/products">
            <Button>Browse Products</Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* Wishlist Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                My Wishlist ({items.length} items)
              </h2>
              <p className="text-gray-600 text-sm">
                {items.filter(item => item.inStock).length} items in stock
              </p>
            </div>
            {/* Bulk action removed intentionally */}
          </div>

          {/* Wishlist Items */}
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href={`/products/${item.productId}`}>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full sm:w-32 h-32 object-cover rounded cursor-pointer"
                    />
                  </Link>
                  
                  <div className="flex-1 space-y-2">
                    <div>
                      <Link href={`/products/${item.productId}`}>
                        <h3 className="font-medium hover:text-blue-600 cursor-pointer">
                          {item.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600">{item.brand}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {formatCurrency(item.price)}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-sm text-gray-500 line-through">
                          {formatCurrency(item.originalPrice)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.inStock ? (
                        <span className="text-green-600 text-sm">In Stock</span>
                      ) : (
                        <span className="text-red-600 text-sm">Out of Stock</span>
                      )}
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600 text-sm">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex flex-col gap-2 sm:w-40 ${addedItems.has(item.id) ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* Quantity selector */}
                    <div className="flex items-center justify-between border rounded-md overflow-hidden">
                      <button
                        className="px-3 py-2 text-gray-600 hover:text-gray-800"
                        onClick={() => setQuantities(q => ({ ...q, [item.id]: Math.max(1, (q[item.id] ?? 1) - 1) }))}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-4 select-none">{quantities[item.id] ?? 1}</span>
                      <button
                        className="px-3 py-2 text-gray-600 hover:text-gray-800"
                        onClick={() => setQuantities(q => ({ ...q, [item.id]: Math.max(1, (q[item.id] ?? 1) + 1) }))}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <Button
                      onClick={() => handleBuyNow(item)}
                      disabled={!item.inStock || addingItems.has(item.id)}
                      className="w-full"
                    >
                      {!item.inStock ? 'Out of Stock' : (addingItems.has(item.id) ? 'Going to Checkout…' : 'Buy Now')}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleRemoveFromWishlist(item.id)}
                      disabled={removingItems.has(item.id)}
                      className="w-full"
                    >
                      {removingItems.has(item.id) ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        'Remove'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}