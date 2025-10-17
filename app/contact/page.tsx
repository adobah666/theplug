import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Mail, Phone, MessageCircle } from 'lucide-react'

export const metadata = {
  title: 'Contact Us • ThePlug',
  description: 'Get in touch with ThePlug via WhatsApp or email.',
}

const WHATSAPP_NUMBER = '233530493698' // E.164 without plus
const EMAIL = 'calebadobah1234@gmail.com'

export default function ContactPage() {
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi ThePlug! I would like to make an inquiry.')}`
  const mailHref = `mailto:${EMAIL}?subject=${encodeURIComponent('Inquiry from ThePlug')}`

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
      <p className="text-gray-600 mb-8">Have a question or need help? Reach us quickly via WhatsApp or email.</p>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-green-50 text-green-700 flex-shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">WhatsApp</h2>
              <p className="text-gray-600 mt-1">Chat with us on WhatsApp for a faster response.</p>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="inline-flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Message on WhatsApp
                  </Button>
                </a>
                <span className="text-sm text-gray-500 break-all">+{WHATSAPP_NUMBER}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-blue-50 text-blue-700 flex-shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">Email</h2>
              <p className="text-gray-600 mt-1">Prefer email? Send us a message and we will reply shortly.</p>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <a href={mailHref}>
                  <Button variant="secondary" className="inline-flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Us
                  </Button>
                </a>
                <span className="text-sm text-gray-500 break-all">{EMAIL}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-sm text-gray-600">
          Or return to the{' '}
          <Link href="/" className="text-blue-600 hover:text-blue-700">homepage</Link>.
        </div>
      </div>
    </div>
  )
}
