"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Star, Heart, Share2, ShoppingCart, Truck, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ProductVariantSelector } from "@/components/product/ProductVariantSelector";
import { RelatedCarousel } from "@/components/product/RelatedCarousel";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useCart } from "@/lib/cart/hooks";
import { ReviewsList } from "@/components/product/ReviewsList";
import { ReviewForm } from "@/components/product/ReviewForm";
import { formatCurrency } from "@/lib/utils/currency";

export interface UIProduct {
  _id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  category?: { _id: string; name: string; slug: string } | string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  inventory?: number;
  variants?: any[];
  originalPrice?: number;
}

export interface UIItem {
  _id: string;
  name: string;
  price: number;
  images: string[];
  brand?: string;
  rating?: number;
  reviewCount?: number;
  inventory?: number;
}

interface ProductPageClientProps {
  product: UIProduct;
  relatedItems?: UIItem[];
  suggestedItems?: UIItem[];
}

export default function ProductPageClient({ product: initialProduct, relatedItems, suggestedItems }: ProductPageClientProps) {
  const [product, setProduct] = useState<UIProduct | null>(initialProduct);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(initialProduct?.variants?.[0] || null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addItem, refreshCart, state } = useCart();
  const cartLoading = state.isLoading;
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [myReview, setMyReview] = useState<any | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Keep a ref of the latest selectedVariant to avoid effect/listener churn
  const selectedVariantRef = useRef<any | null>(selectedVariant);
  useEffect(() => {
    selectedVariantRef.current = selectedVariant;
  }, [selectedVariant]);

  // Compute client-side reserved quantity and available quantity
  const reservedQty = (() => {
    if (!product) return 0;
    if (selectedVariant) {
      return state.items
        .filter((it) => it.productId === product._id && it.variantId === selectedVariant._id)
        .reduce((sum, it) => sum + (it.quantity || 0), 0);
    } else {
      return state.items
        .filter((it) => it.productId === product._id && !it.variantId)
        .reduce((sum, it) => sum + (it.quantity || 0), 0);
    }
  })();
  const baseInventory = selectedVariant ? (selectedVariant.inventory || 0) : (product?.inventory || 0);
  const availableQty = Math.max(0, baseInventory - reservedQty);

  // Record a view event on mount/when product changes
  useEffect(() => {
    if (!product?._id) return;
    (async () => {
      try {
        await fetch(`/api/products/${product._id}/analytics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'view' })
        })
      } catch {}
    })()
  }, [product?._id])

  // Live-refresh product inventory/client state
  useEffect(() => {
    if (!product?._id) return;
    let ignore = false;
    let intervalId: any = null;

    const normalize = (raw: any): UIProduct => {
      const imgs = Array.isArray(raw?.images) ? raw.images : (raw?.images ? [raw.images] : []);
      return {
        _id: String(raw?._id || raw?.id || ''),
        name: raw?.name || '',
        description: raw?.description || '',
        price: Number(raw?.price || 0),
        images: imgs.filter(Boolean),
        category: raw?.category,
        brand: raw?.brand,
        rating: raw?.rating ?? 0,
        reviewCount: raw?.reviewCount ?? 0,
        inventory: raw?.inventory ?? 0,
        variants: raw?.variants || [],
        originalPrice: raw?.originalPrice,
      };
    };

    const load = async () => {
      try {
        const res = await fetch(`/api/products/${product!._id}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({} as any));
        const raw = (json as any)?.data?.product || (json as any)?.product || json;
        const nextProd = normalize(raw);
        if (ignore) return;
        setProduct(nextProd);
        const currSel = selectedVariantRef.current;
        if (currSel && Array.isArray(nextProd.variants)) {
          const updatedVar = (nextProd.variants as any[]).find(v => String(v._id) === String(currSel._id));
          setSelectedVariant(updatedVar || null);
        }
      } catch {}
    };

    // initial load
    load();

    // refresh when tab becomes visible
    const onVisibility = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisibility);

    // periodic background refresh
    intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 20000);

    return () => {
      ignore = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (intervalId) clearInterval(intervalId);
    };
  }, [product?._id]);

  // Load initial wishlist status
  useEffect(() => {
    if (!product?._id) return;
    let ignore = false;
    (async () => {
      try {
        const res = await fetch('/api/wishlist', { cache: 'no-store', credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
              ? data.items
              : (Array.isArray(data?.data)
                  ? data.data
                  : (Array.isArray(data?.data?.items) ? data.data.items : [])));
        const found = items.find((it: any) => it?.productId === product._id);
        if (!ignore) {
          setIsWishlisted(!!found);
          setWishlistItemId(found?.id || null);
        }
      } catch {}
    })();
    return () => { ignore = true };
  }, [product?._id]);

  // Load reviews and eligibility
  useEffect(() => {
    if (!product?._id) return;
    let ignore = false;
    const load = async () => {
      try {
        setReviewsLoading(true);
        const [r1, r2] = await Promise.all([
          fetch(`/api/products/${product._id}/reviews`, { cache: 'no-store', credentials: 'include' }),
          fetch(`/api/products/${product._id}/reviews/eligibility`, { cache: 'no-store', credentials: 'include' })
        ]);
        if (!ignore) {
          if (r1.ok) {
            const d1 = await r1.json();
            setReviews(d1?.data?.reviews || []);
          }
          if (r2.ok) {
            const d2 = await r2.json();
            setCanReview(!!d2?.data?.canReview);
            setMyReview(d2?.data?.myReview || null);
          }
        }
      } catch {
      } finally {
        if (!ignore) setReviewsLoading(false);
      }
    };
    load();
    return () => { ignore = true };
  }, [product?._id]);

  const refreshReviews = async () => {
    if (!product?._id) return;
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/products/${product._id}/reviews`, { cache: 'no-store', credentials: 'include' }),
        fetch(`/api/products/${product._id}/reviews/eligibility`, { cache: 'no-store', credentials: 'include' })
      ]);
      if (r1.ok) {
        const d1 = await r1.json();
        setReviews(d1?.data?.reviews || []);
      }
      if (r2.ok) {
        const d2 = await r2.json();
        setCanReview(!!d2?.data?.canReview);
        setMyReview(d2?.data?.myReview || null);
      }
    } catch {}
  };

  const recordAddToCart = async () => {
    if (!product?._id) return;
    try {
      await fetch(`/api/products/${product._id}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'add_to_cart' })
      });
    } catch {}
  };

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
      recordAddToCart();
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
      await refreshCart();
      window.location.href = '/checkout';
    } catch (err) {
      console.error('Failed to start checkout:', err);
    } finally {
      setBuyNowLoading(false);
    }
  };

  const toggleWishlist = async () => {
    if (!product) return;
    const next = !isWishlisted;
    setIsWishlisted(next);
    try {
      if (next) {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product._id }),
          credentials: 'include'
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as any));
          throw new Error(j?.error || 'Failed to add to wishlist');
        }
      } else {
        if (wishlistItemId) {
          const res = await fetch(`/api/wishlist/${wishlistItemId}`, { method: 'DELETE', credentials: 'include' });
          if (!res.ok) {
            const j = await res.json().catch(() => ({} as any));
            throw new Error(j?.error || 'Failed to remove from wishlist');
          }
          setWishlistItemId(null);
        }
      }
    } catch {
      setIsWishlisted((v) => !v);
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: product?.name || 'Product',
        text: product?.name || 'Check this out',
        url: typeof window !== 'undefined' ? window.location.href : ''
      } as any;
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share(shareData);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard && shareData.url) {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copied to clipboard');
        return;
      }
      // Fallback
      alert('Sharing not supported on this device.');
    } catch {
      // ignore
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= availableQty) {
      setQuantity(newQuantity);
    }
  };

  const currentPrice = selectedVariant?.price || product?.price || 0;
  const originalPrice = (selectedVariant?.originalPrice as number | undefined) || (product?.originalPrice as number | undefined);
  const isOnSale = originalPrice && originalPrice > currentPrice;
  const discount = isOnSale ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

  // Derive safe category values for rendering/links
  const catAny = (product as any)?.category;
  const categoryName = typeof catAny === 'string' ? catAny : (catAny?.name || '');
  const categorySlug = typeof catAny === 'string' ? catAny : (catAny?.slug || '');

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message="Product not found" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
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
        className="mb-4 sm:mb-8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
        {/* Product Images */}
        <div className="space-y-3 sm:space-y-4">
          <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden shadow-sm">
            <Image
              src={(product.images && product.images[selectedImageIndex]) || '/placeholder-product.jpg'}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Image Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {product.images.map((image: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <Image src={image} alt={`${product.name} ${index + 1}`} width={64} height={64} className="object-cover w-full h-full sm:w-20 sm:h-20" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">{product.name}</h1>
            <div className="flex items-center space-x-4 mb-4 sm:mb-6">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 sm:w-5 sm:h-5 ${i < Math.floor(product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                ))}
                <span className="ml-2 text-sm text-gray-600">({product.reviewCount || 0} reviews)</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(currentPrice)}</span>
              {isOnSale && (
                <span className="text-lg sm:text-xl text-gray-500 line-through">{formatCurrency(originalPrice as number)}</span>
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

          {/* Delivery Notice */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 text-blue-800 p-4 flex items-center gap-3">
            <Truck className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">
              Delivery typically arrives between 1–5 days based on your location.
            </span>
          </div>

          {/* Quantity and Add to Cart */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <label className="text-sm font-medium text-gray-700">Quantity:</label>
              <div className="flex items-center justify-between sm:justify-start">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= 1} className="px-4 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 text-lg">-</button>
                  <span className="px-6 py-3 border-x border-gray-300 font-medium min-w-[60px] text-center">{quantity}</span>
                  <button onClick={() => handleQuantityChange(quantity + 1)} disabled={quantity >= availableQty} className="px-4 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 text-lg">+</button>
                </div>
                <span className="text-sm text-gray-600 ml-4">{availableQty} in stock</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <Button onClick={handleAddToCart} disabled={availableQty === 0 || cartLoading} className="flex-1 flex items-center justify-center space-x-2 h-12 text-base font-medium">
                <ShoppingCart className="w-5 h-5" />
                <span>{cartLoading ? 'Adding...' : 'Add to Cart'}</span>
              </Button>
              <Button onClick={handleBuyNow} disabled={availableQty === 0 || buyNowLoading} className="flex-1 flex items-center justify-center h-12 text-base font-medium">
                {buyNowLoading ? 'Processing...' : 'Buy Now'}
              </Button>
            </div>
            
            <div className="flex space-x-3">
              <Button variant="outline" onClick={toggleWishlist} className="flex-1 sm:flex-none px-6 h-12 flex items-center justify-center">
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current text-red-500' : ''}`} />
                <span className="ml-2 sm:hidden">Wishlist</span>
              </Button>
              <Button variant="outline" onClick={handleShare} className="flex-1 sm:flex-none px-6 h-12 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
                <span className="ml-2 sm:hidden">Share</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description and Reviews */}
      <div className="mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          {typeof product.description === 'string' && product.description.trim().length > 0 && (
            <Card className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Product Description</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            </Card>
          )}

          <Card className="p-4 sm:p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">Customer Reviews</h2>
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
                    await refreshReviews();
                    try {
                      const res = await fetch(`/api/products/${product._id}`, { cache: 'no-store' })
                      if (res.ok) {
                        const json = await res.json()
                        const prod = json?.data?.product || json?.product || json
                        const imgs = Array.isArray(prod?.images) ? prod.images : (prod?.images ? [prod.images] : [])
                        setProduct({ ...prod, images: imgs.filter(Boolean) })
                      }
                    } catch {}
                  }}
                />
              </div>
            )}
            {!canReview && (
              <div className="mt-6 text-sm text-gray-600">Only customers who purchased this product can leave a review.</div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">Product Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Brand:</dt>
                <dd className="font-medium">{product.brand || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Category:</dt>
                <dd className="font-medium capitalize">{categoryName || 'N/A'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Related & You May Like */}
      <div className="mt-16 space-y-12">
        <RelatedCarousel
          productId={product._id}
          category={categorySlug || categoryName}
          title="Related Products"
          subtitle="Customers who viewed this item also explored"
          serverItems={relatedItems}
        />

        <YouMayAlsoLike
          productId={product._id}
          category={categorySlug || categoryName}
          brand={product.brand}
          serverItems={suggestedItems}
        />
      </div>
    </div>
  );
}
