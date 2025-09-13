import { paystackConfig } from './config'

export interface PaystackRefundResponse {
  status: boolean
  message: string
  data?: any
}

/**
 * Issue a refund for a transaction reference via Paystack REST API.
 * If amountKobo is omitted, Paystack will refund the full amount.
 */
export async function refundPayment(reference: string, amountKobo?: number): Promise<PaystackRefundResponse> {
  const url = `${paystackConfig.baseUrl}/refund`
  // Paystack expects 'transaction' (can be reference or transaction ID)
  const body: any = { transaction: reference }
  if (typeof amountKobo === 'number' && Number.isFinite(amountKobo) && amountKobo > 0) {
    body.amount = Math.floor(amountKobo)
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${paystackConfig.secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const json = await res.json().catch(() => ({}))
  return {
    status: !!json?.status,
    message: (json?.message as string) || (res.ok ? 'Refund processed' : 'Refund failed'),
    data: json?.data,
  }
}
