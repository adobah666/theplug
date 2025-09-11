'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react'
import { CartItemData } from '@/components/cart/CartItem'

// Cart state interface
export interface CartState {
  items: CartItemData[]
  subtotal: number
  itemCount: number
  isLoading: boolean
  error: string | null
  updatingItems: Set<string>
  removingItems: Set<string>
}

// Cart actions
export type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CART'; payload: CartItemData[] }
  | { type: 'ADD_ITEM'; payload: CartItemData }
  | { type: 'UPDATE_ITEM'; payload: { productId: string; variantId?: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { productId: string; variantId?: string } }
  | { type: 'SET_UPDATING_ITEM'; payload: { key: string; isUpdating: boolean } }
  | { type: 'SET_REMOVING_ITEM'; payload: { key: string; isRemoving: boolean } }
  | { type: 'CLEAR_CART' }

// Cart context interface
interface CartContextType {
  state: CartState
  dispatch: React.Dispatch<CartAction>
  addItem: (item: Omit<CartItemData, '_id'>) => Promise<void>
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => Promise<void>
  removeItem: (productId: string, variantId: string | undefined) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

// Helper function to generate item key
const getItemKey = (productId: string, variantId?: string) => {
  return variantId ? `${productId}-${variantId}` : productId
}

// Helper function to calculate totals
const calculateTotals = (items: CartItemData[]) => {
  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0)
  const itemCount = items.reduce((total, item) => total + item.quantity, 0)
  return { subtotal, itemCount }
}

// Cart reducer
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    
    case 'SET_CART': {
      const { subtotal, itemCount } = calculateTotals(action.payload)
      return {
        ...state,
        items: action.payload,
        subtotal,
        itemCount,
        isLoading: false,
        error: null
      }
    }
    
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(item => 
        item.productId === action.payload.productId && 
        item.variantId === action.payload.variantId
      )
      
      let newItems: CartItemData[]
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        newItems = state.items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        )
      } else {
        // Add new item
        newItems = [...state.items, action.payload]
      }
      
      const { subtotal, itemCount } = calculateTotals(newItems)
      return {
        ...state,
        items: newItems,
        subtotal,
        itemCount,
        error: null
      }
    }
    
    case 'UPDATE_ITEM': {
      const newItems = state.items.map(item => 
        item.productId === action.payload.productId && 
        item.variantId === action.payload.variantId
          ? { ...item, quantity: action.payload.quantity }
          : item
      )
      
      const { subtotal, itemCount } = calculateTotals(newItems)
      return {
        ...state,
        items: newItems,
        subtotal,
        itemCount,
        error: null
      }
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => 
        !(item.productId === action.payload.productId && 
          item.variantId === action.payload.variantId)
      )
      
      const { subtotal, itemCount } = calculateTotals(newItems)
      return {
        ...state,
        items: newItems,
        subtotal,
        itemCount,
        error: null
      }
    }
    
    case 'SET_UPDATING_ITEM': {
      const newUpdatingItems = new Set(state.updatingItems)
      if (action.payload.isUpdating) {
        newUpdatingItems.add(action.payload.key)
      } else {
        newUpdatingItems.delete(action.payload.key)
      }
      return {
        ...state,
        updatingItems: newUpdatingItems
      }
    }
    
    case 'SET_REMOVING_ITEM': {
      const newRemovingItems = new Set(state.removingItems)
      if (action.payload.isRemoving) {
        newRemovingItems.add(action.payload.key)
      } else {
        newRemovingItems.delete(action.payload.key)
      }
      return {
        ...state,
        removingItems: newRemovingItems
      }
    }
    
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        subtotal: 0,
        itemCount: 0,
        error: null
      }
    
    default:
      return state
  }
}

// Initial state
const initialState: CartState = {
  items: [],
  subtotal: 0,
  itemCount: 0,
  isLoading: true,
  error: null,
  updatingItems: new Set(),
  removingItems: new Set()
}

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined)

// Cart provider component
interface CartProviderProps {
  children: ReactNode
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  // Track the last time the client mutated cart (to avoid stale refresh overwrites)
  const lastClientMutationTsRef = useRef<number>(0)

  // Load cart from localStorage on mount, then refresh from server
  useEffect(() => {
    const loadCartFromStorage = async () => {
      try {
        const savedCart = localStorage.getItem('cart')
        if (savedCart) {
          const cartData = JSON.parse(savedCart)
          dispatch({ type: 'SET_CART', payload: cartData })
        } else {
          // No saved cart; mark loading complete to avoid empty-cart flash
          dispatch({ type: 'SET_LOADING', payload: false })
        }
        
        // Always refresh from server to sync with server state
        // This catches cases where server cart was cleared (e.g., after payment)
        try {
          await refreshCart()
        } catch (error) {
          // If server refresh fails, keep localStorage data
          console.warn('Failed to refresh cart from server:', error)
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error)
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    loadCartFromStorage()
  }, [])

  // Save cart to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(state.items))
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error)
    }
  }, [state.items])

  // Listen for cart changes from other tabs/contexts (e.g., logout clears localStorage)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cart') {
        try {
          const value = e.newValue
          if (!value) {
            // cart key removed
            dispatch({ type: 'CLEAR_CART' })
            return
          }
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed) && parsed.length === 0) {
            dispatch({ type: 'CLEAR_CART' })
          }
        } catch {}
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    }
    return
  }, [])

  // API call helper with error handling
  const apiCall = async (url: string, options: RequestInit) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      ...options
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }))
      // Our API typically returns { success: false, error: string }
      const msg = (errorData && (errorData.error || errorData.message)) || `HTTP ${response.status}`
      throw new Error(msg)
    }

    return response.json()
  }

  // Add item to cart
  const addItem = async (item: Omit<CartItemData, '_id'>) => {
    try {
      // Record client mutation timestamp to guard against stale refresh responses
      lastClientMutationTsRef.current = Date.now()
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // Optimistic update
      dispatch({ type: 'ADD_ITEM', payload: item as CartItemData })
      
      // API call
      const res = await apiCall('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          image: item.image,
          size: item.size,
          color: item.color
        })
      })
      // Use server response to set cart (avoids race where cookie isn't yet read by GET)
      const serverItems = res?.data?.cart?.items
      if (Array.isArray(serverItems)) {
        dispatch({ type: 'SET_CART', payload: serverItems })
      } else {
        // Fallback: refresh if server didn't return items
        await refreshCart()
      }
      dispatch({ type: 'SET_LOADING', payload: false })
    } catch (error) {
      // Revert optimistic update on error
      await refreshCart()
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to add item' })
    }
  }

  // Update item quantity
  const updateQuantity = async (productId: string, variantId: string | undefined, quantity: number) => {
    const itemKey = getItemKey(productId, variantId)
    
    try {
      dispatch({ type: 'SET_UPDATING_ITEM', payload: { key: itemKey, isUpdating: true } })
      
      // Optimistic update
      dispatch({ type: 'UPDATE_ITEM', payload: { productId, variantId, quantity } })
      
      // Resolve itemId required by the API
      let target = state.items.find(i => i.productId === productId && i.variantId === variantId)
      if (!target || !target._id) {
        // Ensure we have latest server state (with _id)
        await refreshCart()
        target = state.items.find(i => i.productId === productId && i.variantId === variantId)
      }
      const itemId = target?._id
      if (!itemId) {
        throw new Error('Unable to locate cart item to update')
      }
      
      // API call with itemId
      await apiCall('/api/cart/update', {
        method: 'PUT',
        body: JSON.stringify({ itemId, quantity })
      })
      
      dispatch({ type: 'SET_UPDATING_ITEM', payload: { key: itemKey, isUpdating: false } })
    } catch (error) {
      // Revert optimistic update on error
      await refreshCart()
      dispatch({ type: 'SET_UPDATING_ITEM', payload: { key: itemKey, isUpdating: false } })
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update item' })
    }
  }

  // Remove item from cart
  const removeItem = async (productId: string, variantId: string | undefined) => {
    const itemKey = getItemKey(productId, variantId)
    
    try {
      dispatch({ type: 'SET_REMOVING_ITEM', payload: { key: itemKey, isRemoving: true } })
      
      // Optimistic update
      dispatch({ type: 'REMOVE_ITEM', payload: { productId, variantId } })
      
      // Resolve itemId required by the API
      let target = state.items.find(i => i.productId === productId && i.variantId === variantId)
      if (!target || !target._id) {
        // Ensure we have latest server state (with _id)
        await refreshCart()
        target = state.items.find(i => i.productId === productId && i.variantId === variantId)
      }
      const itemId = target?._id
      if (!itemId) {
        throw new Error('Unable to locate cart item to remove')
      }
      
      // API call
      await apiCall('/api/cart/remove', {
        method: 'DELETE',
        body: JSON.stringify({ itemId })
      })
      
      // Ensure client reflects server after removal
      await refreshCart()
      dispatch({ type: 'SET_REMOVING_ITEM', payload: { key: itemKey, isRemoving: false } })
    } catch (error) {
      // Revert optimistic update on error
      await refreshCart()
      dispatch({ type: 'SET_REMOVING_ITEM', payload: { key: itemKey, isRemoving: false } })
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to remove item' })
    }
  }

  // Clear entire cart
  const clearCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // Optimistic update
      dispatch({ type: 'CLEAR_CART' })
      
      // API call (if you have a clear cart endpoint)
      // await apiCall('/api/cart/clear', { method: 'DELETE' })
      
      // Ensure localStorage is cleared to avoid stale rehydration on navigation
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart')
        }
      } catch {}

      dispatch({ type: 'SET_LOADING', payload: false })
    } catch (error) {
      await refreshCart()
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to clear cart' })
    }
  }

  // Refresh cart from server
  const refreshCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const requestStartedAt = Date.now()
      
      const response = await apiCall('/api/cart', { method: 'GET' })
      // API returns { success, data: { cart: { items, ... } } }
      const items = response?.data?.cart?.items || []
      // Avoid clobbering a non-empty client cart with an empty server cart due to timing/cookie races
      if (
        Array.isArray(items) && items.length === 0 && (
          // If client recently mutated after this refresh started, ignore this empty response
          lastClientMutationTsRef.current > requestStartedAt ||
          // Or if client already has items, keep them
          state.items.length > 0
        )
      ) {
        // Keep client state; just stop loading
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }

      dispatch({ type: 'SET_CART', payload: items })

      // If server cart is empty, also clear localStorage to prevent rehydration on future mounts
      if (Array.isArray(items) && items.length === 0) {
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cart')
          }
        } catch {}
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load cart' })
    }
  }

  const contextValue: CartContextType = {
    state,
    dispatch,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart
  }

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}