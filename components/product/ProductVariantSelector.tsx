import React from 'react'
import { cn } from '@/lib/utils'

interface ProductVariant {
  _id?: string
  size?: string
  color?: string
  sku: string
  price?: number
  inventory: number
}

interface ProductVariantSelectorProps {
  variants: ProductVariant[]
  selectedVariant: ProductVariant | null
  onVariantChange: (variant: ProductVariant | null) => void
  // New: allow parent to manage partial selection state
  selectedSize?: string | null
  selectedColor?: string | null
  onSizeSelect?: (size: string) => void
  onColorSelect?: (color: string) => void
  onMessage?: (msg: string | null) => void
  className?: string
}

const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  variants,
  selectedVariant,
  onVariantChange,
  selectedSize,
  selectedColor,
  onSizeSelect,
  onColorSelect,
  onMessage,
  className
}) => {
  // Group variants by size and color (ensure arrays are string[])
  const sizes = [
    ...new Set(
      variants
        .map(v => v.size)
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
    )
  ]
  const colors = [
    ...new Set(
      variants
        .map(v => v.color)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
    )
  ]

  // Get available variants based on current selection
  const getAvailableVariants = (filterBy: 'size' | 'color', value: string) => {
    return variants.filter(variant => {
      if (filterBy === 'size') {
        const colorRef = selectedVariant?.color ?? selectedColor ?? null
        return variant.size === value && (!colorRef || variant.color === colorRef)
      } else {
        const sizeRef = selectedVariant?.size ?? selectedSize ?? null
        return variant.color === value && (!sizeRef || variant.size === sizeRef)
      }
    })
  }

  const handleSizeSelect = (size: string) => {
    // Bubble up to parent so it can manage partial selection and messaging
    onMessage && onMessage(null)
    if (onSizeSelect) onSizeSelect(size)
  }

  const handleColorSelect = (color: string) => {
    // Bubble up to parent so it can manage partial selection and messaging
    onMessage && onMessage(null)
    if (onColorSelect) onColorSelect(color)
  }

  const isSizeAvailable = (size: string) => {
    const availableVariants = getAvailableVariants('size', size)
    return availableVariants.some(v => v.inventory > 0)
  }

  const isColorAvailable = (color: string) => {
    const availableVariants = getAvailableVariants('color', color)
    return availableVariants.some(v => v.inventory > 0)
  }

  if (variants.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Size Selector */}
      {sizes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Size</h4>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isSelected = (selectedVariant?.size ?? selectedSize) === size
              const isAvailable = isSizeAvailable(size)
              
              return (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  disabled={!isAvailable}
                  className={cn(
                    'min-w-[3rem] px-3 py-2 text-sm font-medium border rounded-md transition-colors',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isAvailable
                      ? 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Color Selector */}
      {colors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Color</h4>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const isSelected = (selectedVariant?.color ?? selectedColor) === color
              const isAvailable = isColorAvailable(color)
              
              return (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  disabled={!isAvailable}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border rounded-md transition-colors capitalize',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isAvailable
                      ? 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {color}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Variant Info */}
      {selectedVariant && (
        <div className="text-sm text-gray-600">
          <p>
            SKU: <span className="font-mono">{selectedVariant.sku}</span>
          </p>
          {selectedVariant.inventory <= 5 && selectedVariant.inventory > 0 && (
            <p className="text-orange-600">
              Only {selectedVariant.inventory} left in stock
            </p>
          )}
          {selectedVariant.inventory === 0 && (
            <p className="text-red-600">Out of stock</p>
          )}
        </div>
      )}

      {/* Clear Selection */}
      {selectedVariant && (
        <button
          onClick={() => onVariantChange(null)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Clear selection
        </button>
      )}
    </div>
  )
}

export { ProductVariantSelector }