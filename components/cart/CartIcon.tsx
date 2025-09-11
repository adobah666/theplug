'use client'

import React from 'react'

interface CartIconProps {
  itemCount: number
  onClick?: () => void
  className?: string
}

const CartIcon: React.FC<CartIconProps> = ({ 
  itemCount, 
  onClick, 
  className = '' 
}) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors ${className}`}
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <div className="relative">
        <svg 
          className="h-5 w-5 md:h-6 md:w-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" 
          />
        </svg>
        {itemCount > 0 && (
          <span 
            className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white"
            aria-label={`${itemCount} items in cart`}
          >
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </div>
      <span className="hidden text-sm md:block">Cart</span>
    </button>
  )
}

export { CartIcon }