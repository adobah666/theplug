export const metadata = {
  title: 'Terms of Service • ThePlug',
  description: 'Terms and conditions for using ThePlug website and purchasing products.'
}

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
      <p className="text-gray-600 mb-8">
        Welcome to ThePlug. By accessing or using our website and services, you agree to these Terms of
        Service. If you do not agree, please do not use the site. We are based in Ghana and deliver nationwide.
      </p>

      <div className="space-y-8 text-gray-800">
        <section>
          <h2 className="text-2xl font-semibold mb-2">1. Use of the Site</h2>
          <p>
            You must use this site in compliance with all applicable laws. You agree not to misuse the site,
            attempt unauthorized access, or interfere with our systems.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">2. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all
            activities under your account. Notify us immediately of any unauthorized use.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">3. Orders and Payment</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All orders are subject to acceptance and availability.</li>
            <li>Prices are shown in GHS and may change without notice.</li>
            <li>By placing an order, you authorize us or our payment partners to charge the provided method.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">4. Shipping and Delivery</h2>
          <p>
            We deliver across Ghana. Delivery typically arrives within 1–5 days depending on location. After
            purchase, we will message you with the exact delivery date. Delivery timelines are estimates and
            may vary due to factors beyond our control.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">5. Returns and Exchanges</h2>
          <p>
            If you are not satisfied with your purchase, please refer to our Returns & Exchanges policy for
            eligibility, timelines, and process details.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">6. Product Information</h2>
          <p>
            We make reasonable efforts to display accurate product details and images. Minor variations in
            color, fit, or materials may occur. Sizing guidance is approximate; consult our Size Guide for help.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">7. Prohibited Activities</h2>
          <p>
            You agree not to: engage in fraud, resell access, use bots or scrapers without permission, upload
            harmful content, or violate any applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, ThePlug shall not be liable for indirect, incidental, or
            consequential damages arising from the use of our site or products. Our total liability for any
            claim is limited to the amount you paid for the relevant order.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">9. Changes to the Terms</h2>
          <p>
            We may update these Terms from time to time. The latest version will always be available on this
            page with an updated date. Continued use of the site constitutes acceptance of the changes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">10. Contact</h2>
          <p>
            Questions about these Terms? Contact us via{' '}
            <a href="/contact" className="text-blue-600 hover:text-blue-700">/contact</a>{' '}or email{' '}
            <a href="mailto:calebadobah1234@gmail.com" className="text-blue-600 hover:text-blue-700">calebadobah1234@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
