import { Card } from '@/components/ui/Card'
import Image from 'next/image'

export const metadata = {
  title: 'About Us • ThePlug',
  description: 'ThePlug is a Ghana-based fashion shop serving customers nationwide with quality clothing, shoes, and accessories.'
}

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">About ThePlug</h1>
      <p className="text-gray-600 mb-8">
        ThePlug is a Ghana-based fashion shop on a mission to make great style accessible across the nation. 
        From everyday essentials to statement pieces, we curate quality clothing, shoes, and accessories for 
        men and women—with fast delivery to every region in Ghana.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-3">What We Stand For</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li><span className="font-medium">Quality you can trust:</span> We hand-pick items from reliable suppliers and brands.</li>
            <li><span className="font-medium">Nationwide reach:</span> We deliver across Ghana—urban and regional—so you can shop from anywhere.</li>
            <li><span className="font-medium">Fair pricing:</span> Transparent pricing without surprises, with frequent new arrivals.</li>
            <li><span className="font-medium">Customer-first service:</span> We’re responsive on WhatsApp and email to help with sizing, delivery, and returns.</li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-3">Fast Delivery</h2>
          <p className="text-gray-700">
            Orders typically arrive within 1–5 days based on your location. After purchase, we’ll send a message
            with the exact delivery date.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-3">New Arrivals Every Week</h2>
          <p className="text-gray-700">
            We constantly refresh our collection so you can discover something new each time. Check out
            our latest drops in <a href="/new-arrivals" className="text-blue-600 hover:text-blue-700">New Arrivals</a>.
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-3">Sizes for Real People</h2>
          <p className="text-gray-700">
            Unsure about fit? Visit our <a href="/size-guide" className="text-blue-600 hover:text-blue-700">Size Guide</a> for
            clear measurements and tips. If you’re in between sizes, we’re happy to help.
          </p>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h2 className="text-2xl font-semibold mb-3">Get in Touch</h2>
        <p className="text-gray-700">
          Have a question about stock, delivery, or returns? Reach us any time via{' '}
          <a href="/contact" className="text-blue-600 hover:text-blue-700">Contact</a>.
        </p>
      </Card>
    </div>
  )
}
