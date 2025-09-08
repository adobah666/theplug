import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default styles', () => {
      render(<Card data-testid="card">Card content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('rounded-lg', 'border', 'border-gray-200', 'bg-white', 'shadow-sm')
    })

    it('applies custom className', () => {
      render(<Card className="custom-class" data-testid="card">Card content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('CardHeader', () => {
    it('renders with default styles', () => {
      render(<CardHeader>Header content</CardHeader>)
      const header = screen.getByText('Header content')
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 with correct styles', () => {
      render(<CardTitle>Card Title</CardTitle>)
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toHaveTextContent('Card Title')
      expect(title).toHaveClass('text-lg', 'font-semibold', 'leading-none', 'tracking-tight')
    })
  })

  describe('CardDescription', () => {
    it('renders with correct styles', () => {
      render(<CardDescription>Card description</CardDescription>)
      const description = screen.getByText('Card description')
      expect(description).toHaveClass('text-sm', 'text-gray-500')
    })
  })

  describe('CardContent', () => {
    it('renders with default styles', () => {
      render(<CardContent>Content</CardContent>)
      const content = screen.getByText('Content')
      expect(content).toHaveClass('p-6', 'pt-0')
    })
  })

  describe('CardFooter', () => {
    it('renders with default styles', () => {
      render(<CardFooter>Footer</CardFooter>)
      const footer = screen.getByText('Footer')
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
    })
  })

  describe('Complete Card', () => {
    it('renders all components together', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test Card')
      expect(screen.getByText('This is a test card')).toBeInTheDocument()
      expect(screen.getByText('Card content goes here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })
  })
})