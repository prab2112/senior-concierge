// Default provider: no real SMS/WhatsApp is sent. Logs to stdout and
// reports back as if delivery succeeded immediately, so the rest of the
// app (notifications table, API responses) behaves identically to how
// it will once TWILIO_PROVIDER is wired up for real.
export async function send({ channel, to, message }) {
  console.log(`[notifications:console] ${channel.toUpperCase()} to ${to}: ${message}`)
  return {
    providerMessageId: `console-${Date.now()}`,
    status: 'delivered',
  }
}
