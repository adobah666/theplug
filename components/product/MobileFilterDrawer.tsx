'use client'

import React from 'react'
import { X } from 'lucide-react'
import { AdvancedFilters } from './AdvancedFilters'
import { Button } from '@/components/ui/Button'

interface MobileFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  onFilterChange?: (filters: Record<string, any>) => void
  isLoading?: boolean
  searchQuery?: string
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  onFilterChange,
  isLoading = false,
  searchQuery = ""
}) => {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close filters"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AdvancedFilters 
            onFilterChange={onFilterChange}
            isLoading={isLoading}
            searchQuery={searchQuery}
            className="border-0 p-0 bg-transparent"
          />
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <Button 
            onClick={onClose}
            className="w-full"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  )
}