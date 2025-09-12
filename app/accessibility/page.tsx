export const metadata = {
  title: 'Accessibility • ThePlug',
  description: 'Our commitment to accessibility and inclusive shopping experiences.'
}

export default function AccessibilityPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Accessibility</h1>
      <p className="text-gray-600 mb-8">
        ThePlug is committed to making our website accessible to all users, including people with disabilities.
        We strive to follow best practices and continuously improve the accessibility of our content and features.
      </p>

      <div className="space-y-8 text-gray-800">
        <section>
          <h2 className="text-2xl font-semibold mb-2">What We Do</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use semantic HTML and ARIA attributes where appropriate.</li>
            <li>Ensure sufficient color contrast for readability.</li>
            <li>Support keyboard navigation for interactive elements.</li>
            <li>Provide text alternatives for non-text content where feasible.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Supported Browsers and Devices</h2>
          <p>
            We test across modern browsers and devices. Some features may degrade gracefully on older browsers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Feedback</h2>
          <p>
            If you encounter any accessibility barriers on our site, please let us know so we can address them.
            Contact us via <a href="/contact" className="text-blue-600 hover:text-blue-700">/contact</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
