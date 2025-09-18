import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Verification (Meta calls with hub.mode, hub.verify_token, hub.challenge)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN

    if (mode === 'subscribe' && token && challenge && token === VERIFY_TOKEN) {
      // Verification success: return the challenge
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST: Event notifications (messages/status)
export async function POST(req: NextRequest) {
  // Meta sends X-Hub-Signature-256 for integrity check using your app secret
  const appSecret = process.env.META_APP_SECRET

  let rawBody = ''
  try {
    // Read raw body (text) to compute signature
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Validate signature if configured
  try {
    if (appSecret) {
      const signatureHeader = req.headers.get('x-hub-signature-256') || ''
      const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
      // Timing-safe compare
      const isValid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
      if (!isValid) {
        console.warn('Invalid WhatsApp webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
  } catch (e) {
    console.warn('Signature validation error', e)
    return NextResponse.json({ error: 'Signature check failed' }, { status: 401 })
  }

  // Parse JSON now that signature is validated
  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 })
  }

  // Basic logging and minimal handling
  try {
    // The structure typically: entry[0].changes[0].value.messages | statuses
    const entries = Array.isArray(body?.entry) ? body.entry : []
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : []
      for (const change of changes) {
        const value = change?.value
        const messages = Array.isArray(value?.messages) ? value.messages : []
        const statuses = Array.isArray(value?.statuses) ? value.statuses : []

        for (const msg of messages) {
          console.log('WA message received:', {
            from: msg?.from,
            type: msg?.type,
            id: msg?.id,
            text: msg?.text?.body,
          })
          // TODO: Implement auto-replies or ticketing if needed
        }

        for (const st of statuses) {
          console.log('WA message status:', {
            id: st?.id,
            status: st?.status,
            timestamp: st?.timestamp,
          })
        }
      }
    }

    // Respond 200 quickly to acknowledge
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('WhatsApp webhook processing error', err)
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }
}
