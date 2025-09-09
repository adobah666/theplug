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
import { Product, ProductVariant } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';

interface ProductPageProps {}

export default function ProductPage({}: ProductPageProps) {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem, refreshCart, state } = useCart();
  const cartLoading = state.isLoading;
  const [buyNowLoading, setBuyNowLoading] = useState(false);

  // Compute client-side reserved quantity for the selected variant from cart
  const reservedQty = (() => {
    if (!product || !selectedVariant) return 0;
    return state.items
      .filter((it) => it.productId === product._id && it.variantId === selectedVariant._id)
      .reduce((sum, it) => sum + (it.quantity || 0), 0);
  })();
  const variantInventory = selectedVariant?.inventory || 0;
  const availableQty = Math.max(0, variantInventory - reservedQty);

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

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return;

    try {
      await addItem({
        productId: product._id,
        variantId: selectedVariant._id,
        quantity,
        price: selectedVariant.price || product.price || 0,
        name: product.name,
        image: (product.images && product.images[0]) || '/placeholder-product.jpg',
        size: selectedVariant.size,
        color: selectedVariant.color,
        maxInventory: selectedVariant.inventory || 0,
      });
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const handleBuyNow = async () => {
    if (!product || !selectedVariant || availableQty === 0) return;
    try {
      setBuyNowLoading(true);
      await addItem({
        productId: product._id,
        variantId: selectedVariant._id,
        quantity,
        price: selectedVariant.price || product.price || 0,
        name: product.name,
        image: (product.images && product.images[0]) || '/placeholder-product.jpg',
        size: selectedVariant.size,
        color: selectedVariant.color,
        maxInventory: selectedVariant.inventory || 0,
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
              {product.images.map((image, index) => (
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
                disabled={!selectedVariant || availableQty === 0 || cartLoading}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{cartLoading ? 'Adding...' : 'Add to Cart'}</span>
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={!selectedVariant || availableQty === 0 || buyNowLoading}
                className="flex-1 flex items-center justify-center"
              >
                {buyNowLoading ? 'Processing...' : 'Buy Now'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setIsWishlisted(!isWishlisted)}
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

      {/* Product Description */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Product Description</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>
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