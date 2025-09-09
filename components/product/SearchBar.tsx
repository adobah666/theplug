'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface SearchSuggestion {
  id: string
  name: string
  category: string
}

interface SearchBarProps {
  placeholder?: string
  className?: string
  showSuggestions?: boolean
  onSearch?: (query: string) => void
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search for products...",
  className = "",
  showSuggestions = true,
  onSearch
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestionsList, setShowSuggestionsList] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Debounce suggestions fetch
  useEffect(() => {
    if (!showSuggestions || query.length < 2) {
      setSuggestions([])
      setShowSuggestionsList(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/products/meilisearch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, limit: 5 }),
        })

        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.data.suggestions.map((name: string, index: number) => ({
            id: `suggestion-${index}`,
            name,
            category: 'Product'
          })))
          setShowSuggestionsList(true)
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, showSuggestions])

  // Handle search submission
  const handleSearch = (searchQuery: string = query) => {
    if (!searchQuery.trim()) return

    setShowSuggestionsList(false)
    
    if (onSearch) {
      onSearch(searchQuery)
    } else {
      // Navigate to search results page
      const params = new URLSearchParams(searchParams.toString())
      params.set('q', searchQuery.trim())
      params.delete('page') // Reset to first page
      router.push(`/search?${params.toString()}`)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionsList || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSearch(suggestions[selectedIndex].name)
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setShowSuggestionsList(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.name)
    handleSearch(suggestion.name)
  }

  // Handle input focus
  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestionsList(true)
    }
  }

  // Handle input blur
  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(e.relatedTarget as Node)) {
        setShowSuggestionsList(false)
        setSelectedIndex(-1)
      }
    }, 150)
  }

  // Clear search
  const clearSearch = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestionsList(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pr-20 pl-10 py-3 sm:py-2 text-base sm:text-sm"
          style={{ fontSize: '16px' }} // Prevents zoom on iOS
          aria-label="Search products"
          aria-expanded={showSuggestionsList}
          aria-haspopup="listbox"
          role="combobox"
        />
        
        {/* Search icon */}
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" 
          aria-hidden="true"
        />
        
        {/* Loading spinner or clear button */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
          {isLoading && <LoadingSpinner size="sm" />}
          {query && !isLoading && (
            <button
              onClick={clearSearch}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={() => handleSearch()}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors min-h-[44px] flex items-center"
            aria-label="Search"
          >
            Search
          </button>
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestionsList && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 sm:py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none min-h-[44px] flex items-center ${
                index === selectedIndex ? 'bg-gray-50' : ''
              }`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{suggestion.name}</span>
                <span className="text-xs text-gray-500 ml-auto">{suggestion.category}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}