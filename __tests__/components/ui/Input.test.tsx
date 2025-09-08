import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md', 'border')
  })

  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders with error message', () => {
    render(<Input error="This field is required" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-500')
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('renders with helper text', () => {
    render(<Input helperText="Enter your email address" />)
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
  })

  it('prioritizes error over helper text', () => {
    render(
      <Input 
        error="This field is required" 
        helperText="Enter your email address" 
      />
    )
    expect(screen.getByText('This field is required')).toBeInTheDocument()
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument()
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Enter text" />)
    
    const input = screen.getByPlaceholderText('Enter text')
    await user.type(input, 'Hello World')
    
    expect(input).toHaveValue('Hello World')
  })

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" />)
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password')
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-class')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})