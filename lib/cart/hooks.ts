import { useCart } from './context'

// Re-export the main hook
export { useCart } from './context'

// Additional convenience hooks
export const useCartItems = () => {
  const { state } = useCart()
  return state.items
}

export const useCartTotal = () => {
  const { state } = useCart()
  return {
    subtotal: state.subtotal,
    itemCount: state.itemCount
  }
}

export const useCartLoading = () => {
  const { state } = useCart()
  return {
    isLoading: state.isLoading,
    updatingItems: state.updatingItems,
    removingItems: state.removingItems
  }
}

export const useCartError = () => {
  const { state } = useCart()
  return state.error
}