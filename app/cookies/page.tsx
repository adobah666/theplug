export const metadata = {
  title: 'Cookie Policy • ThePlug',
  description: 'How ThePlug uses cookies and similar technologies.'
}

export default function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
      <p className="text-gray-600 mb-8">
        This Cookie Policy explains how ThePlug ("we", "us") uses cookies and similar technologies
        on our website. By using our site, you agree to the use of cookies as described here.
      </p>

      <div className="space-y-8 text-gray-800">
        <section>
          <h2 className="text-2xl font-semibold mb-2">What Are Cookies?</h2>
          <p>
            Cookies are small text files placed on your device by websites you visit. They are widely used
            to make websites work, improve user experience, and provide information to site owners.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Types of Cookies We Use</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-medium">Essential cookies:</span> Required for core functionality such as sign-in, cart, and checkout.</li>
            <li><span className="font-medium">Performance cookies:</span> Help us understand how the site is used so we can improve it.</li>
            <li><span className="font-medium">Preference cookies:</span> Remember your settings and choices.</li>
            <li><span className="font-medium">Analytics cookies:</span> Provide aggregated usage insights; we do not use them to identify you personally.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Managing Cookies</h2>
          <p>
            You can control cookies through your browser settings. Most browsers let you block or delete
            cookies. Note that disabling some cookies may impact features like staying signed in or saving
            your cart.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Third-Party Cookies</h2>
          <p>
            We may use trusted third-party services (e.g., payment providers, analytics) that set their
            own cookies to function properly. These providers have their own policies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Updates</h2>
          <p>
            We may update this Cookie Policy from time to time. Changes will be posted on this page.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Contact</h2>
          <p>
            Questions about cookies? Contact us at <a href="/contact" className="text-blue-600 hover:text-blue-700">/contact</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
