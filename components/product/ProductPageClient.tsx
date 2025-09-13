"use client";

import { useState, useEffect } from "react";
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

  // Load initial wishlist status
  useEffect(() => {
    if (!product?._id) return;
    let ignore = false;
    (async () => {
      try {
        const res = await fetch('/api/wishlist', { cache: 'no-store' });
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
          body: JSON.stringify({ productId: product._id })
        });
        if (!res.ok) throw new Error('Failed to add to wishlist');
      } else {
        if (wishlistItemId) {
          const res = await fetch(`/api/wishlist/${wishlistItemId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to remove from wishlist');
          setWishlistItemId(null);
        }
      }
    } catch {
      setIsWishlisted((v) => !v);
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
                  <Image src={image} alt={`${product.name} ${index + 1}`} width={80} height={80} className="object-cover w-full h-full" />
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
                  <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                ))}
                <span className="ml-2 text-sm text-gray-600">({product.reviewCount || 0} reviews)</span>
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

          {/* Delivery Notice */}
          <div className="rounded-md bg-blue-50 border border-blue-100 text-blue-800 p-3 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span className="text-sm">
              Delivery typically arrives between 1–5 days based on your location.
            </span>
          </div>

          {/* Quantity and Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Quantity:</label>
              <div className="flex items-center border border-gray-300 rounded-md">
                <button onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= 1} className="px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50">-</button>
                <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
                <button onClick={() => handleQuantityChange(quantity + 1)} disabled={quantity >= availableQty} className="px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50">+</button>
              </div>
              <span className="text-sm text-gray-600">{availableQty} in stock</span>
            </div>

            <div className="flex space-x-4">
              <Button onClick={handleAddToCart} disabled={availableQty === 0 || cartLoading} className="flex-1 flex items-center justify-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>{cartLoading ? 'Adding...' : 'Add to Cart'}</span>
              </Button>
              <Button onClick={handleBuyNow} disabled={availableQty === 0 || buyNowLoading} className="flex-1 flex items-center justify-center">
                {buyNowLoading ? 'Processing...' : 'Buy Now'}
              </Button>
              <Button variant="outline" onClick={toggleWishlist} className="px-4">
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current text-red-500' : ''}`} />
              </Button>
              <Button variant="outline" className="px-4"><Share2 className="w-5 h-5" /></Button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description and Reviews */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {typeof product.description === 'string' && product.description.trim().length > 0 && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Product Description</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            </Card>
          )}

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
