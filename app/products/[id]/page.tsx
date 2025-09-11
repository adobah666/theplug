'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Star, Heart, Share2, ShoppingCart, Truck, Shield, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { ProductVariantSelector } from '@/components/product/ProductVariantSelector';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useCart } from '@/lib/cart/hooks';
// Using generic types locally for product/variant to avoid tight coupling to types module
import { ReviewsList } from '@/components/product/ReviewsList';
import { ReviewForm } from '@/components/product/ReviewForm';
import { formatCurrency } from '@/lib/utils/currency';

interface ProductPageProps {}

export default function ProductPage({}: ProductPageProps) {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [product, setProduct] = useState<any | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null);
  const { addItem, refreshCart, state } = useCart();
  const cartLoading = state.isLoading;
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  // Reviews state
  const [reviews, setReviews] = useState<any[]>([])
  const [canReview, setCanReview] = useState(false)
  const [myReview, setMyReview] = useState<any | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Compute client-side reserved quantity and available quantity
  const reservedQty = (() => {
    if (!product) return 0;
    if (selectedVariant) {
      return state.items
        .filter((it) => it.productId === product._id && it.variantId === selectedVariant._id)
        .reduce((sum, it) => sum + (it.quantity || 0), 0);
    } else {
      // No variant: sum items for this product without a variantId
      return state.items
        .filter((it) => it.productId === product._id && !it.variantId)
        .reduce((sum, it) => sum + (it.quantity || 0), 0);
    }
  })();
  const baseInventory = selectedVariant ? (selectedVariant.inventory || 0) : (product?.inventory || 0);
  const availableQty = Math.max(0, baseInventory - reservedQty);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          throw new Error('Product not found');
        }
        const json = await response.json();
        const prod = json?.data?.product || json?.product || json;
        setProduct(prod);
        if (prod?.variants && prod.variants.length > 0) {
          setSelectedVariant(prod.variants[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  // Load initial wishlist status for this product
  useEffect(() => {
    if (!productId) return
    let ignore = false
    const loadWishlistStatus = async () => {
      try {
        const res = await fetch('/api/wishlist', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const items = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
              ? data.items
              : (Array.isArray(data?.data)
                  ? data.data
                  : (Array.isArray(data?.data?.items) ? data.data.items : [])))
        const found = items.find((it: any) => it?.productId === productId)
        if (!ignore) {
          setIsWishlisted(!!found)
          setWishlistItemId(found?.id || null)
        }
      } catch {}
    }
    loadWishlistStatus()
    return () => { ignore = true }
  }, [productId])

  // Load reviews and eligibility
  useEffect(() => {
    if (!productId) return
    let ignore = false
    const load = async () => {
      try {
        setReviewsLoading(true)
        const [r1, r2] = await Promise.all([
          fetch(`/api/products/${productId}/reviews`, { cache: 'no-store', credentials: 'include' }),
          fetch(`/api/products/${productId}/reviews/eligibility`, { cache: 'no-store', credentials: 'include' })
        ])
        if (!ignore) {
          if (r1.ok) {
            const d1 = await r1.json()
            setReviews(d1?.data?.reviews || [])
          }
          if (r2.ok) {
            const d2 = await r2.json()
            setCanReview(!!d2?.data?.canReview)
            setMyReview(d2?.data?.myReview || null)
          }
        }
      } catch {
      } finally {
        if (!ignore) setReviewsLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [productId])

  const refreshReviews = async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/products/${productId}/reviews`, { cache: 'no-store', credentials: 'include' }),
        fetch(`/api/products/${productId}/reviews/eligibility`, { cache: 'no-store', credentials: 'include' })
      ])
      if (r1.ok) {
        const d1 = await r1.json()
        setReviews(d1?.data?.reviews || [])
      }
      if (r2.ok) {
        const d2 = await r2.json()
        setCanReview(!!d2?.data?.canReview)
        setMyReview(d2?.data?.myReview || null)
      }
    } catch {}
  }

  // Track product view once per mount
  useEffect(() => {
    const track = async () => {
      try {
        if (!productId || viewTracked) return;
        await fetch(`/api/products/${productId}/analytics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'view' })
        })
        setViewTracked(true)
      } catch {}
    }
    track()
  }, [productId, viewTracked])

  const recordAddToCart = async () => {
    try {
      await fetch(`/api/products/${productId}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'add_to_cart' })
      })
    } catch {}
  }

  const recordPurchase = async () => {
    try {
      await fetch(`/api/products/${productId}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'purchase' })
      })
    } catch {}
  }

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      await addItem({
        productId: product._id,
        variantId: selectedVariant?._id,
        quantity,
        price: (selectedVariant?.price ?? product.price) || 0,
        name: product.name,
        image: (product.images && product.images[0]) || '/placeholder-product.jpg',
        size: selectedVariant?.size,
        color: selectedVariant?.color,
        maxInventory: selectedVariant?.inventory ?? (product.inventory || 0),
      });
      // fire-and-forget analytics
      recordAddToCart()
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const handleBuyNow = async () => {
    if (!product || availableQty === 0) return;
    try {
      setBuyNowLoading(true);
      await addItem({
        productId: product._id,
        variantId: selectedVariant?._id,
        quantity,
        price: (selectedVariant?.price ?? product.price) || 0,
        name: product.name,
        image: (product.images && product.images[0]) || '/placeholder-product.jpg',
        size: selectedVariant?.size,
        color: selectedVariant?.color,
        maxInventory: selectedVariant?.inventory ?? (product.inventory || 0),
      });
      // Ensure server-side cart (session-based) is hydrated before navigating
      await refreshCart();
      router.push('/checkout');
    } catch (err) {
      console.error('Failed to start checkout:', err);
    } finally {
      setBuyNowLoading(false);
    }
  };

  // Persist wishlist state via API
  const toggleWishlist = async () => {
    if (!product) return;
    const next = !isWishlisted;
    setIsWishlisted(next);
    try {
      if (next) {
        // Add to wishlist
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product._id })
        });
        if (!res.ok) throw new Error('Failed to add to wishlist');
        // Try to capture created id or re-fetch
        try {
          const json = await res.json().catch(() => ({} as any));
          const createdId = (json as any)?.id || (json as any)?.data?.id || null;
          if (createdId) {
            setWishlistItemId(createdId);
          } else {
            const r2 = await fetch('/api/wishlist', { cache: 'no-store' });
            if (r2.ok) {
              const d2 = await r2.json().catch(() => ({} as any));
              const items: any[] = Array.isArray(d2)
                ? d2
                : (Array.isArray((d2 as any)?.items)
                    ? (d2 as any).items
                    : (Array.isArray((d2 as any)?.data)
                        ? (d2 as any).data
                        : (Array.isArray((d2 as any)?.data?.items) ? (d2 as any).data.items : [])));
              const found = items.find((it: any) => it?.productId === product._id);
              setWishlistItemId(found?.id || null);
            }
          }
        } catch {}
      } else {
        // Remove from wishlist
        let idToDelete = wishlistItemId;
        if (!idToDelete) {
          const r0 = await fetch('/api/wishlist', { cache: 'no-store' });
          if (r0.ok) {
            const d0 = await r0.json().catch(() => ({} as any));
            const items0: any[] = Array.isArray(d0)
              ? d0
              : (Array.isArray((d0 as any)?.items)
                  ? (d0 as any).items
                  : (Array.isArray((d0 as any)?.data)
                      ? (d0 as any).data
                      : (Array.isArray((d0 as any)?.data?.items) ? (d0 as any).data.items : [])));
            const found0 = items0.find((it: any) => it?.productId === product._id);
            idToDelete = found0?.id || null;
          }
        }
        if (idToDelete) {
          const res = await fetch(`/api/wishlist/${idToDelete}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to remove from wishlist');
          setWishlistItemId(null);
        }
      }
    } catch {
      // revert optimistic UI on error
      setIsWishlisted((v) => !v);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= availableQty) {
      setQuantity(newQuantity);
    }
  };

  const currentPrice = selectedVariant?.price || product?.price || 0;
  const originalPrice = selectedVariant?.originalPrice || product?.originalPrice;
  const isOnSale = originalPrice && originalPrice > currentPrice;
  const discount = isOnSale ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error || 'Product not found'} />
      </div>
    );
  }

  // Derive safe category values for rendering/links
  const catAny = (product as any).category;
  const categoryName = typeof catAny === 'string' ? catAny : (catAny?.name || '');
  const categorySlug = typeof catAny === 'string' ? catAny : (catAny?.slug || '');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          (() => {
            const cat = (product as any).category;
            const catLabel = typeof cat === 'string' ? cat : (cat?.name || 'Category');
            const catSlug = typeof cat === 'string' ? cat : (cat?.slug || '');
            const safeLabel = String(catLabel || '').toString();
            return { label: safeLabel.charAt(0).toUpperCase() + safeLabel.slice(1), href: catSlug ? `/categories/${catSlug}` : undefined } as any;
          })(),
          { label: product.name }
        ]}
        className="mb-8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={(product.images && product.images[selectedImageIndex]) || '/placeholder-product.jpg'}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />

            {isOnSale && (
              <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">
                -{discount}%
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {product.images.map((image: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}

                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.rating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  ({product.reviewCount || 0} reviews)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 mb-6">
              <span className="text-3xl font-bold text-gray-900">{formatCurrency(currentPrice)}</span>
              {isOnSale && (
                <span className="text-xl text-gray-500 line-through">{formatCurrency(originalPrice as number)}</span>
              )}
            </div>
          </div>

          {/* Product Variants */}
          {product.variants && product.variants.length > 0 && (
            <ProductVariantSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onVariantChange={setSelectedVariant}
            />
          )}

          {/* Quantity and Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Quantity:</label>
              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  -
                </button>
                <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= availableQty}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-gray-600">
                {availableQty} in stock{reservedQty > 0 ? ` (reserved: ${reservedQty})` : ''}
              </span>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={handleAddToCart}
                disabled={availableQty === 0 || cartLoading}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{cartLoading ? 'Adding...' : 'Add to Cart'}</span>
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={availableQty === 0 || buyNowLoading}
                className="flex-1 flex items-center justify-center"
              >
                {buyNowLoading ? 'Processing...' : 'Buy Now'}
              </Button>
              
              <Button
                variant="outline"
                onClick={toggleWishlist}
                className="px-4"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current text-red-500' : ''}`} />
              </Button>
              
              <Button variant="outline" className="px-4">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Product Features */}
          <div className="border-t pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <Truck className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Free Shipping</p>
                  <p className="text-xs text-gray-600">On orders over ₦50,000</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <RotateCcw className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Easy Returns</p>
                  <p className="text-xs text-gray-600">30-day return policy</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Secure Payment</p>
                  <p className="text-xs text-gray-600">SSL encrypted checkout</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description and Reviews */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Product Description</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>
          </Card>

          {/* Reviews Section */}
          <Card className="p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Customer Reviews</h2>
              <div className="text-sm text-gray-600">
                Average: {(typeof product.rating === 'number' ? product.rating.toFixed(1) : (product.rating || 0))} · {product.reviewCount ?? 0} reviews
              </div>
            </div>
            {reviewsLoading ? (
              <div className="py-8 flex justify-center"><LoadingSpinner /></div>
            ) : (
              <ReviewsList reviews={reviews} />
            )}
            {canReview && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">Write a review</h3>
                <ReviewForm
                  productId={product._id}
                  existingRating={myReview?.rating}
                  existingTitle={myReview?.title}
                  existingComment={myReview?.comment}
                  onSubmitted={async () => {
                    await refreshReviews()
                    // Also refresh product to update rating/count
                    try {
                      const res = await fetch(`/api/products/${productId}`, { cache: 'no-store' })
                      if (res.ok) {
                        const json = await res.json()
                        setProduct(json?.data?.product || json?.product || json)
                      }
                    } catch {}
                  }}
                />
              </div>
            )}
            {!canReview && (
              <div className="mt-6 text-sm text-gray-600">
                Only customers who purchased this product can leave a review.
              </div>
            )}
          </Card>
        </div>

        {/* Right column product details */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Product Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Brand:</dt>
                <dd className="font-medium">{product.brand || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Category:</dt>
                <dd className="font-medium capitalize">{categoryName || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">SKU:</dt>
                <dd className="font-medium">{product.sku || 'N/A'}</dd>
              </div>
              {selectedVariant && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Size:</dt>
                    <dd className="font-medium">{selectedVariant.size}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Color:</dt>
                    <dd className="font-medium">{selectedVariant.color}</dd>
                  </div>
                </>
              )}
            </dl>
          </Card>
        </div>
      </div>

      {/* Related Products */}
      <RelatedProducts
        productId={product._id}
        category={categorySlug || categoryName}
        className="mt-16"
      />
    </div>
  );
}