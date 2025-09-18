interface WAResult {
  success: boolean
  messageId?: string
  message?: string
}

export class WhatsAppService {
  static isEnabled(): boolean {
    return (
      process.env.WHATSAPP_ENABLED === 'true' &&
      !!process.env.WHATSAPP_TOKEN &&
      !!process.env.WHATSAPP_PHONE_NUMBER_ID
    )
  }

  static normalizeGhanaNumber(phone: string): string | null {
    if (!phone) return null
    let p = phone.trim()
    // Remove non-digits
    p = p.replace(/\D+/g, '')
    // If starts with 0 and length 10, convert to 233
    if (p.length === 10 && p.startsWith('0')) {
      p = '233' + p.slice(1)
    }
    // If starts with 233 and length 12, keep
    if (p.startsWith('233') && p.length >= 12 && p.length <= 13) return p
    // If starts with +233
    if (phone.startsWith('+233')) return '233' + p.slice(-9)
    // If already looks like international without plus
    if (/^\d{11,15}$/.test(p)) return p
    return null
  }

  static async sendText(rawTo: string, content: string): Promise<WAResult> {
    try {
      if (!this.isEnabled()) {
        return { success: false, message: 'WhatsApp disabled or not configured' }
      }

      const to = this.normalizeGhanaNumber(rawTo)
      if (!to) {
        return { success: false, message: 'Invalid recipient number for WhatsApp' }
      }

      const token = process.env.WHATSAPP_TOKEN as string
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID as string

      const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: content }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        return { success: false, message: json?.error?.message || 'WhatsApp API error' }
      }

      const id = Array.isArray(json?.messages) && json.messages[0]?.id ? json.messages[0].id : undefined
      return { success: true, messageId: id }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Unknown error' }
    }
  }
}

export default WhatsAppService
