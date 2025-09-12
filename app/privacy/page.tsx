export const metadata = {
  title: 'Privacy Policy • ThePlug',
  description: 'How ThePlug collects, uses, and protects your information.'
}

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
      <p className="text-gray-600 mb-8">
        This Privacy Policy explains how ThePlug ("we", "us") collects, uses, and protects your
        information when you use our website and services. We operate from Ghana and deliver
        nationwide. By using our site, you agree to this policy.
      </p>

      <div className="space-y-8 text-gray-800">
        <section>
          <h2 className="text-2xl font-semibold mb-2">Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account details (name, email, phone).</li>
            <li>Delivery details (address, location coordinates if you choose to share).</li>
            <li>Order and payment metadata (we do not store full card numbers on our servers).</li>
            <li>Usage data (pages viewed, device/browser information, IP address).</li>
            <li>Communications you send us (WhatsApp, email, forms, reviews).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To process orders, deliveries, returns, and customer service requests.</li>
            <li>To improve our products, website performance, and user experience.</li>
            <li>To prevent fraud and ensure platform security.</li>
            <li>To send operational messages (order updates, delivery dates). Marketing messages are optional.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Sharing of Information</h2>
          <p>
            We only share information with trusted partners as needed to provide our services, such as
            payment processors and delivery partners. We do not sell your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Cookies and Analytics</h2>
          <p>
            We use cookies to keep you signed in, remember your cart, and measure site usage. You can
            control cookies in your browser settings. Disabling some cookies may affect site features.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Data Security</h2>
          <p>
            We apply reasonable technical and organizational safeguards to protect your data. However,
            no method of transmission or storage is 100% secure, so we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access, update, or delete your account information.</li>
            <li>Opt out of non-essential communications at any time.</li>
            <li>Request a copy of your personal data we hold.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Children</h2>
          <p>
            Our services are not directed to children under the age of 13. If you believe a child has
            provided us personal data, please contact us so we can delete it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will post the updated version here with an
            updated date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Contact Us</h2>
          <p>
            Questions about privacy? Contact us at{' '}
            <a href="/contact" className="text-blue-600 hover:text-blue-700">/contact</a>{' '}or email{' '}
            <a href="mailto:calebadobah1234@gmail.com" className="text-blue-600 hover:text-blue-700">calebadobah1234@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
