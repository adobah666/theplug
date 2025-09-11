'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp, X, Filter, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/lib/utils/currency'

interface FilterFacet {
  value: string
  label: string
  count: number
}

interface DynamicFilterSection {
  key: string
  title: string
  type: 'checkbox' | 'range' | 'radio'
  facets?: FilterFacet[]
  min?: number
  max?: number
  loading?: boolean
}

interface AdvancedFiltersProps {
  className?: string
  onFilterChange?: (filters: Record<string, any>) => void
  isLoading?: boolean
  searchQuery?: string
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  className = "",
  onFilterChange,
  isLoading = false,
  searchQuery = ""
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['category', 'price', 'brand']))
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [dynamicSections, setDynamicSections] = useState<DynamicFilterSection[]>([])
  const [facetsLoading, setFacetsLoading] = useState(false)

  // Fetch dynamic filter facets based on current search/filters
  const fetchFilterFacets = async () => {
    try {
      setFacetsLoading(true)
      
      // Build current filter params for facet calculation
      const params = new URLSearchParams(searchParams.toString())
      // Exclude non-facet params to avoid over-filtering facets
      params.delete('q')
      params.delete('sort')
      params.delete('order')
      params.delete('page')
      params.delete('view')
      
      const response = await fetch(`/api/products/search/facets?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          const sections: DynamicFilterSection[] = [
            {
              key: 'category',
              title: 'Category',
              type: 'radio',
              facets: data.data.categories || []
            },
            {
              key: 'brand',
              title: 'Brand',
              type: 'checkbox',
              facets: data.data.brands || []
            },
            {
              key: 'price',
              title: 'Price Range',
              type: 'range',
              min: data.data.priceRange?.min || 0,
              max: data.data.priceRange?.max || 100000
            },
            {
              key: 'size',
              title: 'Size',
              type: 'checkbox',
              facets: data.data.sizes || []
            },
            {
              key: 'color',
              title: 'Color',
              type: 'checkbox',
              facets: data.data.colors || []
            },
            {
              key: 'rating',
              title: 'Customer Rating',
              type: 'radio',
              facets: [
                { value: '4', label: '4 Stars & Up', count: data.data.ratings?.['4+'] || 0 },
                { value: '3', label: '3 Stars & Up', count: data.data.ratings?.['3+'] || 0 },
                { value: '2', label: '2 Stars & Up', count: data.data.ratings?.['2+'] || 0 },
                { value: '1', label: '1 Star & Up', count: data.data.ratings?.['1+'] || 0 }
              ]
            }
          ]
          
          setDynamicSections(sections)
        }
      }
    } catch (error) {
      console.error('Failed to fetch filter facets:', error)
      
      // Fallback to static sections
      setDynamicSections([
        {
          key: 'category',
          title: 'Category',
          type: 'radio',
          facets: [
            { value: 'clothing', label: 'Clothing', count: 0 },
            { value: 'shoes', label: 'Shoes', count: 0 },
            { value: 'accessories', label: 'Accessories', count: 0 }
          ]
        },
        {
          key: 'brand',
          title: 'Brand',
          type: 'checkbox',
          facets: [
            { value: 'nike', label: 'Nike', count: 0 },
            { value: 'adidas', label: 'Adidas', count: 0 },
            { value: 'zara', label: 'Zara', count: 0 }
          ]
        },
        {
          key: 'price',
          title: 'Price Range',
          type: 'range',
          min: 0,
          max: 100000
        }
      ])
    } finally {
      setFacetsLoading(false)
    }
  }

  // Initialize filters from URL params
  useEffect(() => {
    const initialFilters: Record<string, any> = {}
    
    dynamicSections.forEach(section => {
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
  }, [searchParams, dynamicSections])

  // Fetch facets when search query or filters change
  useEffect(() => {
    fetchFilterFacets()
  }, [searchQuery, searchParams])

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

    const section = dynamicSections.find(s => s.key === sectionKey)
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

  // Handle price range change with debouncing
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

  // Update URL with filters (bookmarkable)
  const updateURL = (newFilters: Record<string, any>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Clear existing filter params
    dynamicSections.forEach(section => {
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

    // Use replace to make filters bookmarkable
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', newUrl)
    
    // Also update router for navigation
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({})
    setPriceRange({ min: '', max: '' })
    
    const params = new URLSearchParams(searchParams.toString())
    dynamicSections.forEach(section => {
      params.delete(section.key)
    })
    params.delete('minPrice')
    params.delete('maxPrice')
    params.delete('page')

    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', newUrl)
    router.push(`?${params.toString()}`, { scroll: false })
    
    if (onFilterChange) {
      onFilterChange({})
    }
  }

  // Reset specific filter
  const resetFilter = (sectionKey: string) => {
    let newFilters = { ...filters }
    delete newFilters[sectionKey]
    
    if (sectionKey === 'price') {
      delete newFilters.minPrice
      delete newFilters.maxPrice
      setPriceRange({ min: '', max: '' })
    }
    
    setFilters(newFilters)
    updateURL(newFilters)
    
    if (onFilterChange) {
      onFilterChange(newFilters)
    }
  }

  // Check if any filters are active
  const hasActiveFilters = Object.keys(filters).length > 0

  // Get active filter count for a section
  const getActiveFilterCount = (sectionKey: string) => {
    const value = filters[sectionKey]
    if (Array.isArray(value)) {
      return value.length
    }
    return value ? 1 : 0
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filters
          {facetsLoading && <LoadingSpinner size="sm" className="ml-2" />}
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-blue-600 hover:text-blue-700"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Filter sections */}
      <div className="space-y-4">
        {dynamicSections.map(section => {
          const activeCount = getActiveFilterCount(section.key)
          
          return (
            <div key={section.key} className="border-b border-gray-100 pb-4 last:border-b-0">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.key)}
                className="flex items-center justify-between w-full py-2 text-left"
                disabled={isLoading || facetsLoading}
              >
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">{section.title}</span>
                  {activeCount > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {activeCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {activeCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        resetFilter(section.key)
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                      title="Reset filter"
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  )}
                  {expandedSections.has(section.key) ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>
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
                          disabled={isLoading || facetsLoading}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={priceRange.max}
                          onChange={(e) => handlePriceChange('max', e.target.value)}
                          className="text-sm"
                          min={section.min}
                          max={section.max}
                          disabled={isLoading || facetsLoading}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(section.min ?? 0)} - {formatCurrency(section.max ?? 0)}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {section.facets?.filter(facet => facet.count > 0).map(facet => (
                        <label
                          key={facet.value}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        >
                          <input
                            type={section.type === 'checkbox' ? 'checkbox' : 'radio'}
                            name={section.key}
                            value={facet.value}
                            checked={
                              section.type === 'checkbox'
                                ? (filters[section.key] || []).includes(facet.value)
                                : filters[section.key] === facet.value
                            }
                            onChange={(e) => handleFilterChange(
                              section.key,
                              facet.value,
                              section.type === 'checkbox' ? e.target.checked : true
                            )}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={isLoading || facetsLoading}
                          />
                          <span className="text-sm text-gray-700 flex-1">{facet.label}</span>
                          <span className="text-xs text-gray-500">({facet.count})</span>
                        </label>
                      ))}
                      
                      {section.facets?.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No options available</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Active Filters:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (key === 'minPrice' || key === 'maxPrice') return null
              
              const section = dynamicSections.find(s => s.key === key)
              if (!section) return null

              if (Array.isArray(value)) {
                return value.map(v => (
                  <span
                    key={`${key}-${v}`}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    {section.facets?.find(opt => opt.value === v)?.label || v}
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
                    {section.facets?.find(opt => opt.value === value)?.label || value}
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
                {formatCurrency(Number(filters.minPrice) || 0)} - {filters.maxPrice ? formatCurrency(Number(filters.maxPrice)) : '∞'}
                <button
                  onClick={() => resetFilter('price')}
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