import twilio from 'twilio'
import { config } from '../config.js'

let client = null
function getClient() {
  if (!client) {
    if (!config.twilio.accountSid || !config.twilio.authToken) {
      throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set')
    }
    client = twilio(config.twilio.accountSid, config.twilio.authToken)
  }
  return client
}

// Real send via Twilio. SMS uses a Twilio phone number; WhatsApp uses the
// `whatsapp:` prefix per Twilio's API (requires a WhatsApp-enabled sender,
// e.g. via the Twilio Sandbox for WhatsApp during development).
export async function send({ channel, to, message }) {
  const from = channel === 'whatsapp' ? config.twilio.fromWhatsapp : config.twilio.fromSms
  if (!from) {
    throw new Error(`No Twilio "from" number configured for channel "${channel}"`)
  }

  const result = await getClient().messages.create({
    to: channel === 'whatsapp' ? `whatsapp:${to}` : to,
    from: channel === 'whatsapp' ? `whatsapp:${from}` : from,
    body: message,
  })

  return {
    providerMessageId: result.sid,
    // Twilio's initial status is typically 'queued' or 'sent'; final
    // delivery confirmation arrives later via a status-callback webhook
    // (not implemented here — see IMPROVEMENTS.md).
    status: result.status === 'delivered' ? 'delivered' : 'sent',
  }
}
