'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterSection {
  key: string
  title: string
  type: 'checkbox' | 'range' | 'radio'
  options?: FilterOption[]
  min?: number
  max?: number
}

interface FilterSidebarProps {
  className?: string
  onFilterChange?: (filters: Record<string, any>) => void
  isLoading?: boolean
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  className = "",
  onFilterChange,
  isLoading = false
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['category', 'price', 'brand']))
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })

  // Filter sections configuration
  const filterSections: FilterSection[] = [
    {
      key: 'category',
      title: 'Category',
      type: 'radio',
      options: [
        { value: 'clothing', label: 'Clothing', count: 150 },
        { value: 'shoes', label: 'Shoes', count: 89 },
        { value: 'accessories', label: 'Accessories', count: 67 },
        { value: 'bags', label: 'Bags', count: 45 },
        { value: 'jewelry', label: 'Jewelry', count: 32 }
      ]
    },
    {
      key: 'brand',
      title: 'Brand',
      type: 'checkbox',
      options: [
        { value: 'nike', label: 'Nike', count: 45 },
        { value: 'adidas', label: 'Adidas', count: 38 },
        { value: 'zara', label: 'Zara', count: 52 },
        { value: 'h&m', label: 'H&M', count: 41 },
        { value: 'uniqlo', label: 'Uniqlo', count: 29 }
      ]
    },
    {
      key: 'price',
      title: 'Price Range',
      type: 'range',
      min: 0,
      max: 10000
    },
    {
      key: 'size',
      title: 'Size',
      type: 'checkbox',
      options: [
        { value: 'xs', label: 'XS', count: 23 },
        { value: 's', label: 'S', count: 45 },
        { value: 'm', label: 'M', count: 67 },
        { value: 'l', label: 'L', count: 54 },
        { value: 'xl', label: 'XL', count: 32 },
        { value: 'xxl', label: 'XXL', count: 18 }
      ]
    },
    {
      key: 'color',
      title: 'Color',
      type: 'checkbox',
      options: [
        { value: 'black', label: 'Black', count: 89 },
        { value: 'white', label: 'White', count: 76 },
        { value: 'blue', label: 'Blue', count: 54 },
        { value: 'red', label: 'Red', count: 43 },
        { value: 'green', label: 'Green', count: 32 },
        { value: 'gray', label: 'Gray', count: 28 }
      ]
    },
    {
      key: 'rating',
      title: 'Customer Rating',
      type: 'radio',
      options: [
        { value: '4', label: '4 Stars & Up', count: 156 },
        { value: '3', label: '3 Stars & Up', count: 234 },
        { value: '2', label: '2 Stars & Up', count: 298 },
        { value: '1', label: '1 Star & Up', count: 345 }
      ]
    }
  ]

  // Initialize filters from URL params
  useEffect(() => {
    const initialFilters: Record<string, any> = {}
    
    filterSections.forEach(section => {
      const paramValue = searchParams.get(section.key)
      if (paramValue) {
        if (section.type === 'checkbox') {
          initialFilters[section.key] = paramValue.split(',')
        } else {
          initialFilters[section.key] = paramValue
        }
      }
    })

    // Handle price range separately
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    if (minPrice || maxPrice) {
      setPriceRange({ min: minPrice || '', max: maxPrice || '' })
      initialFilters.minPrice = minPrice
      initialFilters.maxPrice = maxPrice
    }

    setFilters(initialFilters)
  }, [searchParams])

  // Toggle section expansion
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey)
      } else {
        newSet.add(sectionKey)
      }
      return newSet
    })
  }

  // Handle filter change
  const handleFilterChange = (sectionKey: string, value: string, checked?: boolean) => {
    let newFilters = { ...filters }

    const section = filterSections.find(s => s.key === sectionKey)
    if (!section) return

    if (section.type === 'checkbox') {
      const currentValues = newFilters[sectionKey] || []
      if (checked) {
        newFilters[sectionKey] = [...currentValues, value]
      } else {
        newFilters[sectionKey] = currentValues.filter((v: string) => v !== value)
      }
      if (newFilters[sectionKey].length === 0) {
        delete newFilters[sectionKey]
      }
    } else {
      if (value) {
        newFilters[sectionKey] = value
      } else {
        delete newFilters[sectionKey]
      }
    }

    setFilters(newFilters)
    updateURL(newFilters)
    
    if (onFilterChange) {
      onFilterChange(newFilters)
    }
  }

  // Handle price range change
  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const newPriceRange = { ...priceRange, [type]: value }
    setPriceRange(newPriceRange)

    let newFilters = { ...filters }
    if (newPriceRange.min) {
      newFilters.minPrice = newPriceRange.min
    } else {
      delete newFilters.minPrice
    }
    if (newPriceRange.max) {
      newFilters.maxPrice = newPriceRange.max
    } else {
      delete newFilters.maxPrice
    }

    setFilters(newFilters)
    
    // Debounce URL update for price range
    const timeoutId = setTimeout(() => {
      updateURL(newFilters)
      if (onFilterChange) {
        onFilterChange(newFilters)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  // Update URL with filters
  const updateURL = (newFilters: Record<string, any>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Clear existing filter params
    filterSections.forEach(section => {
      params.delete(section.key)
    })
    params.delete('minPrice')
    params.delete('maxPrice')
    params.delete('page') // Reset to first page when filters change

    // Add new filter params
    Object.entries(newFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','))
        }
      } else if (value) {
        params.set(key, value.toString())
      }
    })

    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({})
    setPriceRange({ min: '', max: '' })
    
    const params = new URLSearchParams(searchParams.toString())
    filterSections.forEach(section => {
      params.delete(section.key)
    })
    params.delete('minPrice')
    params.delete('maxPrice')
    params.delete('page')

    router.push(`?${params.toString()}`, { scroll: false })
    
    if (onFilterChange) {
      onFilterChange({})
    }
  }

  // Check if any filters are active
  const hasActiveFilters = Object.keys(filters).length > 0

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filters
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-blue-600 hover:text-blue-700"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filter sections */}
      <div className="space-y-4">
        {filterSections.map(section => (
          <div key={section.key} className="border-b border-gray-100 pb-4 last:border-b-0">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.key)}
              className="flex items-center justify-between w-full py-2 text-left"
              disabled={isLoading}
            >
              <span className="font-medium text-gray-900">{section.title}</span>
              {expandedSections.has(section.key) ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {/* Section content */}
            {expandedSections.has(section.key) && (
              <div className="mt-2 space-y-2">
                {section.type === 'range' ? (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => handlePriceChange('min', e.target.value)}
                        className="text-sm"
                        min={section.min}
                        max={section.max}
                        disabled={isLoading}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => handlePriceChange('max', e.target.value)}
                        className="text-sm"
                        min={section.min}
                        max={section.max}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      ₦{section.min?.toLocaleString()} - ₦{section.max?.toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {section.options?.map(option => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <input
                          type={section.type === 'checkbox' ? 'checkbox' : 'radio'}
                          name={section.key}
                          value={option.value}
                          checked={
                            section.type === 'checkbox'
                              ? (filters[section.key] || []).includes(option.value)
                              : filters[section.key] === option.value
                          }
                          onChange={(e) => handleFilterChange(
                            section.key,
                            option.value,
                            section.type === 'checkbox' ? e.target.checked : true
                          )}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={isLoading}
                        />
                        <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                        {option.count && (
                          <span className="text-xs text-gray-500">({option.count})</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Active Filters:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (key === 'minPrice' || key === 'maxPrice') return null
              
              const section = filterSections.find(s => s.key === key)
              if (!section) return null

              if (Array.isArray(value)) {
                return value.map(v => (
                  <span
                    key={`${key}-${v}`}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    {section.options?.find(opt => opt.value === v)?.label || v}
                    <button
                      onClick={() => handleFilterChange(key, v, false)}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              } else {
                return (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    {section.options?.find(opt => opt.value === value)?.label || value}
                    <button
                      onClick={() => handleFilterChange(key, '', false)}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )
              }
            })}
            
            {/* Price range filter */}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                ₦{filters.minPrice || '0'} - ₦{filters.maxPrice || '∞'}
                <button
                  onClick={() => {
                    setPriceRange({ min: '', max: '' })
                    const newFilters = { ...filters }
                    delete newFilters.minPrice
                    delete newFilters.maxPrice
                    setFilters(newFilters)
                    updateURL(newFilters)
                    if (onFilterChange) onFilterChange(newFilters)
                  }}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}