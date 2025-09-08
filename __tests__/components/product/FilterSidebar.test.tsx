import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterSidebar } from '@/components/product/FilterSidebar'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

const mockPush = jest.fn()
const mockSearchParams = {
  get: jest.fn(),
  toString: jest.fn(() => ''),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
  })
  ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
})

describe('FilterSidebar', () => {
  it('renders filter sections', () => {
    render(<FilterSidebar />)
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Brand')).toBeInTheDocument()
    expect(screen.getByText('Price Range')).toBeInTheDocument()
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByText('Customer Rating')).toBeInTheDocument()
  })

  it('expands and collapses filter sections', async () => {
    const user = userEvent.setup()
    render(<FilterSidebar />)
    
    // Category section should be expanded by default
    expect(screen.getByText('Clothing')).toBeInTheDocument()
    
    // Click to collapse
    await user.click(screen.getByText('Category'))
    expect(screen.queryByText('Clothing')).not.toBeInTheDocument()
    
    // Click to expand again
    await user.click(screen.getByText('Category'))
    expect(screen.getByText('Clothing')).toBeInTheDocument()
  })

  it('handles checkbox filter selection', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    render(<FilterSidebar onFilterChange={onFilterChange} />)
    
    const nikeCheckbox = screen.getByLabelText('Nike')
    await user.click(nikeCheckbox)
    
    expect(nikeCheckbox).toBeChecked()
    expect(onFilterChange).toHaveBeenCalledWith({ brand: ['nike'] })
    expect(mockPush).toHaveBeenCalledWith('?brand=nike')
  })

  it('handles multiple checkbox selections', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    render(<FilterSidebar onFilterChange={onFilterChange} />)
    
    const nikeCheckbox = screen.getByLabelText('Nike')
    const adidasCheckbox = screen.getByLabelText('Adidas')
    
    await user.click(nikeCheckbox)
    await user.click(adidasCheckbox)
    
    expect(nikeCheckbox).toBeChecked()
    expect(adidasCheckbox).toBeChecked()
    expect(onFilterChange).toHaveBeenLastCalledWith({ brand: ['nike', 'adidas'] })
  })

  it('handles radio button selection', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    render(<FilterSidebar onFilterChange={onFilterChange} />)
    
    const clothingRadio = screen.getByLabelText('Clothing')
    await user.click(clothingRadio)
    
    expect(clothingRadio).toBeChecked()
    expect(onFilterChange).toHaveBeenCalledWith({ category: 'clothing' })
    expect(mockPush).toHaveBeenCalledWith('?category=clothing')
  })

  it('handles price range input', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    render(<FilterSidebar onFilterChange={onFilterChange} />)
    
    const minPriceInput = screen.getByPlaceholderText('Min')
    const maxPriceInput = screen.getByPlaceholderText('Max')
    
    await user.type(minPriceInput, '100')
    await user.type(maxPriceInput, '500')
    
    // Wait for debounced update
    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({ 
        minPrice: '100',
        maxPrice: '500'
      })
    }, { timeout: 1000 })
  })

  it('initializes filters from URL parameters', () => {
    mockSearchParams.get.mockImplementation((key) => {
      switch (key) {
        case 'category': return 'clothing'
        case 'brand': return 'nike,adidas'
        case 'minPrice': return '100'
        case 'maxPrice': return '500'
        default: return null
      }
    })
    
    render(<FilterSidebar />)
    
    expect(screen.getByLabelText('Clothing')).toBeChecked()
    expect(screen.getByLabelText('Nike')).toBeChecked()
    expect(screen.getByLabelText('Adidas')).toBeChecked()
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    expect(screen.getByDisplayValue('500')).toBeInTheDocument()
  })

  it('shows clear all button when filters are active', () => {
    mockSearchParams.get.mockImplementation((key) => {
      return key === 'category' ? 'clothing' : null
    })
    
    render(<FilterSidebar />)
    
    expect(screen.getByText('Clear All')).toBeInTheDocument()
  })

  it('clears all filters when clear all is clicked', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    
    mockSearchParams.get.mockImplementation((key) => {
      return key === 'category' ? 'clothing' : null
    })
    
    render(<FilterSidebar onFilterChange={onFilterChange} />)
    
    const clearAllButton = screen.getByText('Clear All')
    await user.click(clearAllButton)
    
    expect(onFilterChange).toHaveBeenCalledWith({})
    expect(mockPush).toHaveBeenCalledWith('?')
  })

  it('shows active filters summary', () => {
    mockSearchParams.get.mockImplementation((key) => {
      switch (key) {
        case 'category': return 'clothing'
        case 'brand': return 'nike'
        case 'minPrice': return '100'
        case 'maxPrice': return '500'
        default: return null
      }
    })
    
    render(<FilterSidebar />)
    
    expect(screen.getByText('Active Filters:')).toBeInTheDocument()
    expect(screen.getByText('Clothing')).toBeInTheDocument()
    expect(screen.getByText('Nike')).toBeInTheDocument()
    expect(screen.getByText('₦100 - ₦500')).toBeInTheDocument()
  })

  it('removes individual active filters', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    
    mockSearchParams.get.mockImplementation((key) => {
      return key === 'category' ? 'clothing' : null
    })
    
    render(<FilterSidebar onFilterChange={onFilterChange} />)
    
    // Find the X button next to the Clothing filter
    const activeFilter = screen.getByText('Clothing').closest('span')
    const removeButton = activeFilter?.querySelector('button')
    
    if (removeButton) {
      await user.click(removeButton)
    }
    
    expect(onFilterChange).toHaveBeenCalledWith({})
  })

  it('disables inputs when loading', () => {
    render(<FilterSidebar isLoading={true} />)
    
    const nikeCheckbox = screen.getByLabelText('Nike')
    const minPriceInput = screen.getByPlaceholderText('Min')
    
    expect(nikeCheckbox).toBeDisabled()
    expect(minPriceInput).toBeDisabled()
  })

  it('handles unchecking checkbox filters', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    
    mockSearchParams.get.mockImplementation((key) => {
      return key === 'brand' ? 'nike' : null
    })
    
    render(<FilterSidebar onFilterChange={onFilterChange} />)
    
    const nikeCheckbox = screen.getByLabelText('Nike')
    expect(nikeCheckbox).toBeChecked()
    
    await user.click(nikeCheckbox)
    
    expect(nikeCheckbox).not.toBeChecked()
    expect(onFilterChange).toHaveBeenCalledWith({})
  })

  it('updates URL without page parameter when filters change', async () => {
    const user = userEvent.setup()
    
    mockSearchParams.toString.mockReturnValue('q=test&page=2')
    
    render(<FilterSidebar />)
    
    const nikeCheckbox = screen.getByLabelText('Nike')
    await user.click(nikeCheckbox)
    
    expect(mockPush).toHaveBeenCalledWith('?q=test&brand=nike')
  })

  it('shows filter option counts', () => {
    render(<FilterSidebar />)
    
    expect(screen.getByText('(150)')).toBeInTheDocument() // Clothing count
    expect(screen.getByText('(45)')).toBeInTheDocument() // Nike count
  })

  it('handles empty filter arrays correctly', async () => {
    const onFilterChange = jest.fn()
    const user = userEvent.setup()
    
    mockSearchParams.get.mockImplementation((key) => {
      return key === 'brand' ? 'nike,adidas' : null
    })
    
    render(<FilterSidebar onFilterChange={onFilterChange} />)
    
    // Uncheck both brands
    await user.click(screen.getByLabelText('Nike'))
    await user.click(screen.getByLabelText('Adidas'))
    
    // Should remove the brand filter entirely when empty
    expect(onFilterChange).toHaveBeenLastCalledWith({})
  })
})