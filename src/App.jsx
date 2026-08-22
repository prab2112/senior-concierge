import { useEffect, useRef, useState } from 'react'
import RoleToggle from './components/RoleToggle'
import SeniorView from './components/senior/SeniorView'
import ConciergeView from './components/concierge/ConciergeView'
import NotificationToastStack from './components/notifications/NotificationToast'
import SignInScreen from './components/auth/SignInScreen'
import OnboardingScreen from './components/auth/OnboardingScreen'
import { api, getStoredSession, storeSession, clearStoredSession } from './api/client'
import { bookingFromApi, messageFromApi, notificationFromApi } from './api/mappers'
import { getGoogleIdToken } from './lib/googleAuth'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || null
const POLL_INTERVAL_MS = 5000

export default function App() {
  const [auth, setAuth] = useState(null) // { token, user } | null
  const [authReady, setAuthReady] = useState(false)
  const [pendingOtp, setPendingOtp] = useState(null)
  const [roleNotice, setRoleNotice] = useState('')

  const [bookings, setBookings] = useState([])
  const [messages, setMessages] = useState([])
  const [wellnessStatus, setWellnessStatus] = useState(null)
  const [notificationLog, setNotificationLog] = useState([])
  const [toasts, setToasts] = useState([])
  const [actionError, setActionError] = useState('')

  const knownNotificationIds = useRef(new Set())
  const notificationsBaselined = useRef(false)

  // Rehydrate a stored session on load, verifying it's still valid.
  useEffect(() => {
    const stored = getStoredSession()
    if (!stored) {
      setAuthReady(true)
      return
    }
    api
      .me(stored.token)
      .then(() => setAuth(stored))
      .catch(() => clearStoredSession())
      .finally(() => setAuthReady(true))
  }, [])

  const role = auth?.user?.role ?? 'senior'

  const applySession = (session) => {
    storeSession(session)
    setAuth(session)
    setPendingOtp(null)
  }

  const handleRequestOtp = async (phone) => {
    const res = await api.requestOtp(phone)
    setPendingOtp({ phone, devCode: res.devCode })
  }

  const handleVerifyOtp = async (phone, code) => {
    const res = await api.verifyOtp(phone, code)
    applySession(res)
  }

  const handleGoogleSignIn = async () => {
    const idToken = await getGoogleIdToken(GOOGLE_CLIENT_ID)
    const res = await api.googleSignIn(idToken)
    applySession(res)
  }

  const handleCancelOtp = () => setPendingOtp(null)

  const handleCompleteProfile = async (data) => {
    const res = await api.completeProfile(auth.token, data)
    applySession(res)
  }

  const handleFetchConcierges = () => api.listConcierges(auth.token)

  const handleSignOut = () => {
    clearStoredSession()
    setAuth(null)
    setBookings([])
    setMessages([])
    setWellnessStatus(null)
    setNotificationLog([])
    setToasts([])
    knownNotificationIds.current = new Set()
    notificationsBaselined.current = false
  }

  const handleSetRole = (nextRole) => {
    if (nextRole === role) return
    setRoleNotice(`You're signed in as a ${role}. Sign out to switch accounts.`)
    setTimeout(() => setRoleNotice(''), 4000)
  }

  // The concierge's chat counterpart -- this prototype only ever seeds one
  // senior per concierge, so the first booking's senior is a reasonable
  // stand-in for "who am I chatting with." A real multi-senior concierge
  // would need a conversation picker (see IMPROVEMENTS.md).
  const counterpartId = role === 'concierge' ? bookings[0]?.seniorId : undefined

  const refreshBookings = async () => {
    const res = await api.listBookings(auth.token)
    setBookings(res.map(bookingFromApi))
  }

  const refreshMessages = async (resolvedCounterpartId) => {
    if (role === 'concierge' && !resolvedCounterpartId) {
      setMessages([])
      return
    }
    const res = await api.listMessages(auth.token, resolvedCounterpartId)
    const conciergeId = role === 'concierge' ? auth.user.id : resolvedCounterpartId
    setMessages(res.map((m) => messageFromApi(m, conciergeId)))
  }

  const refreshNotifications = async () => {
    const res = await api.listNotifications(auth.token)
    const mapped = res.map(notificationFromApi)
    setNotificationLog(mapped)

    // The very first fetch after sign-in establishes the baseline (a
    // freshly authenticated session shouldn't toast-storm someone's
    // entire history); only diffs on later polls become toasts.
    if (!notificationsBaselined.current) {
      mapped.forEach((n) => knownNotificationIds.current.add(n.id))
      notificationsBaselined.current = true
      return
    }

    const fresh = mapped.filter((n) => !knownNotificationIds.current.has(n.id))
    mapped.forEach((n) => knownNotificationIds.current.add(n.id))
    // Cap concurrently visible toasts so a burst of real actions (e.g. two
    // status advances back to back) can't stack indefinitely down the screen.
    if (fresh.length > 0) setToasts((prev) => [...prev, ...fresh].slice(-4))
  }

  // Initial load + polling while signed in. There's no realtime channel
  // (websockets) yet -- see IMPROVEMENTS.md -- so a second session (e.g.
  // the concierge's own browser tab) only sees this session's changes
  // after the next poll tick, not instantly.
  useEffect(() => {
    if (!auth || auth.user.needsOnboarding) return
    let cancelled = false

    const tick = async () => {
      try {
        await refreshBookings()
        await refreshNotifications()
      } catch (err) {
        if (!cancelled) setActionError(err.message)
      }
    }

    tick()
    const interval = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token, auth?.user?.needsOnboarding])

  useEffect(() => {
    if (!auth || auth.user.needsOnboarding) return
    refreshMessages(counterpartId).catch((err) => setActionError(err.message))
    const interval = setInterval(() => {
      refreshMessages(counterpartId).catch(() => {})
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token, auth?.user?.needsOnboarding, counterpartId])

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const handleNewBooking = async (service, details) => {
    try {
      await api.createBooking(auth.token, {
        serviceCode: service.id,
        requestedDate: new Date().toISOString().slice(0, 10),
        timeBlockCode: details.timeBlockId,
        notes: details.notes || undefined,
      })
      await refreshBookings()
      await refreshNotifications()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleAdvanceStatus = async (taskId) => {
    try {
      await api.advanceBookingStatus(auth.token, taskId)
      await refreshBookings()
      await refreshNotifications()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleWellnessCheckIn = async (status) => {
    try {
      await api.createWellnessCheckin(auth.token, status === 'call' ? 'call_requested' : 'well')
      setWellnessStatus(status)
      if (status === 'call') {
        await refreshMessages(counterpartId)
        await refreshNotifications()
      }
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleSendMessage = async (text) => {
    try {
      await api.sendMessage(auth.token, { body: text, counterpartId })
      await refreshMessages(counterpartId)
      await refreshNotifications()
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (!authReady) {
    return <div className="min-h-screen bg-warm-50" />
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <NotificationToastStack toasts={toasts} onDismiss={dismissToast} />
      {!auth ? (
        <SignInScreen
          pendingOtp={pendingOtp}
          googleEnabled={Boolean(GOOGLE_CLIENT_ID)}
          onGoogleSignIn={handleGoogleSignIn}
          onRequestOtp={handleRequestOtp}
          onVerifyOtp={handleVerifyOtp}
          onCancelOtp={handleCancelOtp}
        />
      ) : auth.user.needsOnboarding ? (
        <OnboardingScreen onComplete={handleCompleteProfile} onFetchConcierges={handleFetchConcierges} />
      ) : (
        <>
          <RoleToggle
            role={role}
            setRole={handleSetRole}
            notificationLog={notificationLog}
            onSignOut={handleSignOut}
          />

          {roleNotice && (
            <div className="mx-auto mt-4 max-w-5xl px-4 sm:px-6">
              <p className="rounded-2xl bg-amber-50 px-5 py-4 text-lg font-semibold text-amber-800">
                {roleNotice}
              </p>
            </div>
          )}

          {actionError && (
            <div className="mx-auto mt-4 max-w-5xl px-4 sm:px-6">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-rose-50 px-5 py-4 text-lg font-semibold text-rose-700">
                <span>{actionError}</span>
                <button onClick={() => setActionError('')} className="text-rose-500 hover:text-rose-700">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {role === 'senior' ? (
            <SeniorView
              name={auth.user.fullName}
              bookings={bookings}
              onNewBooking={handleNewBooking}
              wellnessStatus={wellnessStatus}
              onWellnessCheckIn={handleWellnessCheckIn}
            />
          ) : (
            <ConciergeView
              name={auth.user.fullName}
              tasks={bookings}
              onAdvanceStatus={handleAdvanceStatus}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          )}
        </>
      )}
    </div>
  )
}
