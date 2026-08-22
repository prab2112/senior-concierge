import { initialsFromName } from '../lib/format'

// Backend statuses are snake_case (matches the Postgres enum); the UI
// components were built against the Title Case strings in
// data/mockData.js's STATUS_FLOW. Mapping here keeps every existing
// component unchanged rather than touching status strings throughout
// the view layer.
const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function bookingFromApi(b) {
  return {
    id: b.id,
    seniorId: b.seniorId,
    conciergeId: b.conciergeId,
    serviceId: b.serviceId,
    serviceLabel: b.serviceLabel,
    date: b.date,
    timeBlockId: b.timeBlockId,
    timeLabel: b.timeLabel,
    notes: b.notes,
    photoName: null, // file uploads aren't implemented server-side yet
    status: STATUS_LABELS[b.status] ?? b.status,
    seniorName: b.seniorName,
    address: b.address,
    conciergeName: b.conciergeName,
    conciergeInitials: b.conciergeName ? initialsFromName(b.conciergeName) : null,
    eta: b.eta, // raw ISO string or null; components format with formatEta()
    createdAt: b.createdAt,
  }
}

// LiveChat.jsx (concierge-only UI, unchanged from the original prototype)
// aligns bubbles by a fixed 'senior' | 'concierge' sender role, not by
// "me vs. them" -- so the mapper needs to know which participant is the
// concierge, independent of who's currently viewing.
export function messageFromApi(m, conciergeId) {
  return {
    id: m.id,
    sender: m.senderId === conciergeId ? 'concierge' : 'senior',
    text: m.body,
    time: new Date(m.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }
}

export function notificationFromApi(n) {
  return {
    id: n.id,
    channel: n.channel,
    toName: n.toName,
    toAddress: n.toAddress,
    message: n.message,
    status: n.status,
    time: new Date(n.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }
}
