'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { useAuth } from '@/lib/auth/hooks';
import { useCart } from '@/lib/cart/hooks';

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
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const response = await fetch('/api/wishlist');
      if (!response.ok) throw new Error('Failed to fetch wishlist');
      const data = await response.json();
      setItems(data);
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

  const handleAddToCart = async (item: WishlistItem) => {
    try {
      await addToCart({
        productId: item.productId,
        quantity: 1,
      });
      
      // Optionally remove from wishlist after adding to cart
      // await handleRemoveFromWishlist(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    }
  };

  const handleMoveAllToCart = async () => {
    const inStockItems = items.filter(item => item.inStock);
    
    try {
      await Promise.all(
        inStockItems.map(item =>
          addToCart({
            productId: item.productId,
            quantity: 1,
          })
        )
      );
      
      // Optionally clear wishlist after moving all to cart
      // setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move items to cart');
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
            {items.some(item => item.inStock) && (
              <Button onClick={handleMoveAllToCart}>
                Move All to Cart
              </Button>
            )}
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
                        ₦{item.price.toLocaleString()}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-sm text-gray-500 line-through">
                          ₦{item.originalPrice.toLocaleString()}
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
                  
                  <div className="flex flex-col gap-2 sm:w-32">
                    <Button
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.inStock}
                      className="w-full"
                    >
                      {item.inStock ? 'Add to Cart' : 'Out of Stock'}
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