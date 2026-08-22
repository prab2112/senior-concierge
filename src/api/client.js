const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'senior_concierge_token'
const USER_KEY = 'senior_concierge_user'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function getStoredSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  const userRaw = localStorage.getItem(USER_KEY)
  if (!token || !userRaw) return null
  try {
    return { token, user: JSON.parse(userRaw) }
  } catch {
    return null
  }
}

export function storeSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  requestOtp: (phone) => request('/auth/otp/request', { method: 'POST', body: { phone } }),
  verifyOtp: (phone, code) => request('/auth/otp/verify', { method: 'POST', body: { phone, code } }),
  googleSignIn: (idToken) => request('/auth/google', { method: 'POST', body: { idToken } }),
  me: (token) => request('/auth/me', { token }),
  completeProfile: (token, body) => request('/auth/profile', { method: 'PATCH', body, token }),

  listConcierges: (token) => request('/users/concierges', { token }),

  listBookings: (token) => request('/bookings', { token }),
  createBooking: (token, body) => request('/bookings', { method: 'POST', body, token }),
  advanceBookingStatus: (token, id) => request(`/bookings/${id}/status`, { method: 'PATCH', token }),

  listMessages: (token, counterpartId) =>
    request(`/messages${counterpartId ? `?counterpartId=${counterpartId}` : ''}`, { token }),
  sendMessage: (token, body) => request('/messages', { method: 'POST', body, token }),

  listWellnessCheckins: (token) => request('/wellness-checkins', { token }),
  createWellnessCheckin: (token, status) =>
    request('/wellness-checkins', { method: 'POST', body: { status }, token }),

  listNotifications: (token) => request('/notifications', { token }),

  listServiceTypes: () => request('/service-types'),
  listTimeBlocks: () => request('/time-blocks'),
}
