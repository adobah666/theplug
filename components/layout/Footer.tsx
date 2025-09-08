import React from 'react'
import Link from 'next/link'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  const footerSections = [
    {
      title: 'Shop',
      links: [
        { name: 'Clothing', href: '/category/clothing' },
        { name: 'Shoes', href: '/category/shoes' },
        { name: 'Accessories', href: '/category/accessories' },
        { name: 'New Arrivals', href: '/new-arrivals' },
        { name: 'Sale', href: '/sale' },
      ],
    },
    {
      title: 'Customer Service',
      links: [
        { name: 'Contact Us', href: '/contact' },
        { name: 'Help Center', href: '/help' },
        { name: 'Track Your Order', href: '/track-order' },
        { name: 'Returns & Exchanges', href: '/returns' },
        { name: 'Size Guide', href: '/size-guide' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Careers', href: '/careers' },
        { name: 'Press', href: '/press' },
        { name: 'Sustainability', href: '/sustainability' },
        { name: 'Affiliate Program', href: '/affiliate' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Cookie Policy', href: '/cookies' },
        { name: 'Accessibility', href: '/accessibility' },
      ],
    },
  ]

  const socialLinks = [
    {
      name: 'Facebook',
      href: '#',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: 'Instagram',
      href: '#',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.418-3.323C6.001 8.198 7.152 7.708 8.449 7.708s2.448.49 3.323 1.416c.875.875 1.365 2.026 1.365 3.323s-.49 2.448-1.365 3.323c-.875.807-2.026 1.218-3.323 1.218zm7.718-1.297c-.875.875-2.026 1.297-3.323 1.297s-2.448-.422-3.323-1.297c-.875-.875-1.297-2.026-1.297-3.323s.422-2.448 1.297-3.323c.875-.875 2.026-1.297 3.323-1.297s2.448.422 3.323 1.297c.875.875 1.297 2.026 1.297 3.323s-.422 2.448-1.297 3.323z" />
        </svg>
      ),
    },
    {
      name: 'Twitter',
      href: '#',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      href: '#',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ]

  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter signup */}
      <div className="border-b border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold">Stay in the loop</h3>
            <p className="mt-2 text-gray-300">
              Subscribe to our newsletter for the latest fashion trends and exclusive offers.
            </p>
            <div className="mt-6 flex max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-l-md border-0 bg-gray-800 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="rounded-r-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-lg font-semibold">{section.title}</h4>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment methods and social links */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            {/* Payment methods */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">We accept:</span>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-12 rounded bg-white flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-900">VISA</span>
                </div>
                <div className="h-8 w-12 rounded bg-white flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-900">MC</span>
                </div>
                <div className="h-8 w-12 rounded bg-white flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-900">AMEX</span>
                </div>
              </div>
            </div>

            {/* Social links */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Follow us:</span>
              <div className="flex space-x-3">
                {socialLinks.map((social) => (
                  <Link
                    key={social.name}
                    href={social.href}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label={social.name}
                  >
                    {social.icon}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-400">
            © {currentYear} ThePlug. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export { Footer }