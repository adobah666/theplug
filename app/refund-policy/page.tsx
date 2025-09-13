export default function RefundPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">Refund Policy</h1>
        <p className="text-gray-700 mb-6">
          We want you to love your purchase. If something isn’t right, we’re here to help.
        </p>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">Timeframe</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>
              Refund requests can be made within <strong>6 hours</strong> of successful payment.
            </li>
            <li>
              After 6 hours, orders may already be in processing or shipment and may no longer be eligible for a refund.
            </li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">How to Request a Refund</h2>
          <ol className="list-decimal pl-6 text-gray-700 space-y-2">
            <li>Go to <strong>Account → Orders</strong> and open the order.</li>
            <li>If eligible, click <strong>Request Refund</strong> and (optionally) provide a reason.</li>
            <li>We’ll review your request. You’ll receive an email once it’s approved or rejected.</li>
          </ol>
          <p className="text-gray-600 text-sm">
            Note: If stock becomes unavailable right after payment, we automatically create a refund request on your behalf.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">Instant Refunds (Before Processing)</h2>
          <p className="text-gray-700">
            If your order is <strong>paid</strong> but has not yet started processing, our team may issue an <strong>instant refund</strong> and cancel the order.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">What Gets Refunded</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>We refund the full order amount that was charged.</li>
            <li>Refunds are returned to your original payment method via Paystack.</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-semibold">Processing Time</h2>
          <p className="text-gray-700">
            Once approved, refunds are processed by Paystack. Depending on your bank, it may take a few business days to reflect.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Need Help?</h2>
          <p className="text-gray-700">Contact our support team at <a className="text-blue-600 underline" href="/contact">Contact Us</a>.</p>
        </section>
      </div>
    </div>
  )
}
