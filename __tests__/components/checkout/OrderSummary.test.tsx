import { render, screen } from '@testing-library/react'
import { OrderSummary } from '@/components/checkout/OrderSummary'
import { CartItemData } from '@/components/cart/CartItem'
import { ShippingAddress, PaymentMethod } from '@/types/checkout'

const mockItems: CartItemData[] = [
  {
    productId: '1',
    variantId: 'variant1',
    quantity: 2,
    price: 25000,
    name: 'Test Product 1',
    image: '/test-image1.jpg',
    size: 'M',
    color: 'Blue'
  },
  {
    productId: '2',
    quantity: 1,
    price: 15000,
    name: 'Test Product 2',
    image: '/test-image2.jpg'
  }
]

const mockShippingAddress: ShippingAddress = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+2348012345678',
  street: '123 Main Street',
  city: 'Lagos',
  state: 'Lagos',
  zipCode: '100001',
  country: 'Nigeria'
}

const mockPaymentMethod: PaymentMethod = {
  type: 'card',
  cardNumber: '1234 5678 9012 3456',
  cardholderName: 'John Doe'
}

describe('OrderSummary', () => {
  const defaultProps = {
    items: mockItems,
    subtotal: 65000,
    shipping: 2500,
    tax: 4875,
    total: 72375
  }

  it('renders order items when showItems is true', () => {
    render(
      <OrderSummary
        {...defaultProps}
        showItems={true}
      />
    )

    expect(screen.getByText('Order Items')).toBeInTheDocument()
    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    expect(screen.getByText('Size: M')).toBeInTheDocument()
    expect(screen.getByText('Color: Blue')).toBeInTheDocument()
    expect(screen.getByText('Qty: 2')).toBeInTheDocument()
  })

  it('does not render order items when showItems is false', () => {
    render(
      <OrderSummary
        {...defaultProps}
        showItems={false}
      />
    )

    expect(screen.queryByText('Order Items')).not.toBeInTheDocument()
    expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument()
  })

  it('renders shipping address when showShipping is true', () => {
    render(
      <OrderSummary
        {...defaultProps}
        shippingAddress={mockShippingAddress}
        showShipping={true}
      />
    )

    expect(screen.getByText('Shipping Address')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('123 Main Street')).toBeInTheDocument()
    expect(screen.getByText('Lagos, Lagos 100001')).toBeInTheDocument()
    expect(screen.getByText('Nigeria')).toBeInTheDocument()
    expect(screen.getByText('+2348012345678')).toBeInTheDocument()
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
  })

  it('renders payment method when showPayment is true', () => {
    render(
      <OrderSummary
        {...defaultProps}
        paymentMethod={mockPaymentMethod}
        showPayment={true}
      />
    )

    expect(screen.getByText('Payment Method')).toBeInTheDocument()
    expect(screen.getByText('Credit/Debit Card')).toBeInTheDocument()
    expect(screen.getByText('**** **** **** 3456')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('renders bank transfer payment method correctly', () => {
    const bankTransferPayment: PaymentMethod = {
      type: 'bank_transfer'
    }

    render(
      <OrderSummary
        {...defaultProps}
        paymentMethod={bankTransferPayment}
        showPayment={true}
      />
    )

    expect(screen.getByText('Bank Transfer')).toBeInTheDocument()
    expect(screen.getByText(/payment details will be provided/i)).toBeInTheDocument()
  })

  it('formats prices correctly in Nigerian Naira', () => {
    render(
      <OrderSummary {...defaultProps} />
    )

    expect(screen.getByText('₦65,000.00')).toBeInTheDocument() // Subtotal
    expect(screen.getByText('₦2,500.00')).toBeInTheDocument() // Shipping
    expect(screen.getByText('₦4,875.00')).toBeInTheDocument() // Tax
    expect(screen.getByText('₦72,375.00')).toBeInTheDocument() // Total
  })

  it('shows free shipping when shipping cost is 0', () => {
    render(
      <OrderSummary
        {...defaultProps}
        shipping={0}
        total={69875}
      />
    )

    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('displays correct item count in subtotal', () => {
    render(
      <OrderSummary {...defaultProps} />
    )

    expect(screen.getByText('Subtotal (2 items)')).toBeInTheDocument()
  })

  it('calculates individual item totals correctly', () => {
    render(
      <OrderSummary
        {...defaultProps}
        showItems={true}
      />
    )

    // First item: 25000 * 2 = 50000
    expect(screen.getByText('₦50,000.00')).toBeInTheDocument()
    // Second item: 15000 * 1 = 15000
    expect(screen.getByText('₦15,000.00')).toBeInTheDocument()
  })

  it('handles items without variants', () => {
    const itemsWithoutVariants: CartItemData[] = [
      {
        productId: '1',
        quantity: 1,
        price: 10000,
        name: 'Simple Product',
        image: '/simple.jpg'
      }
    ]

    render(
      <OrderSummary
        items={itemsWithoutVariants}
        subtotal={10000}
        shipping={0}
        tax={750}
        total={10750}
        showItems={true}
      />
    )

    expect(screen.getByText('Simple Product')).toBeInTheDocument()
    expect(screen.queryByText('Size:')).not.toBeInTheDocument()
    expect(screen.queryByText('Color:')).not.toBeInTheDocument()
  })

  it('renders order summary section', () => {
    render(
      <OrderSummary {...defaultProps} />
    )

    expect(screen.getByText('Order Summary')).toBeInTheDocument()
    expect(screen.getByText('Subtotal (2 items)')).toBeInTheDocument()
    expect(screen.getByText('Shipping')).toBeInTheDocument()
    expect(screen.getByText('Tax')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('handles empty items array', () => {
    render(
      <OrderSummary
        items={[]}
        subtotal={0}
        shipping={0}
        tax={0}
        total={0}
        showItems={true}
      />
    )

    expect(screen.getByText('Order Items')).toBeInTheDocument()
    expect(screen.getByText('Subtotal (0 items)')).toBeInTheDocument()
  })
})