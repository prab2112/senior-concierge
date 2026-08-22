import { useState } from 'react'
import { HeartHandshake, Phone, ShieldCheck, ChevronLeft, Loader2 } from 'lucide-react'
import GoogleIcon from './GoogleIcon'
import { DEMO_SENIOR_PHONE } from '../../data/mockData'

export default function SignInScreen({
  pendingOtp,
  googleEnabled,
  onGoogleSignIn,
  onRequestOtp,
  onVerifyOtp,
  onCancelOtp,
}) {
  const [phone, setPhone] = useState(DEMO_SENIOR_PHONE)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!phone.trim() || busy) return
    setError('')
    setCode('')
    setBusy(true)
    try {
      await onRequestOtp(phone.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await onVerifyOtp(pendingOtp.phone, code.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleClick = async () => {
    if (busy || !googleEnabled) return
    setError('')
    setBusy(true)
    try {
      await onGoogleSignIn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleChangeNumber = () => {
    setError('')
    setCode('')
    onCancelOtp()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-800 text-teal-300">
            <HeartHandshake size={32} />
          </span>
          <h1 className="text-3xl font-extrabold text-navy-800">Senior Concierge</h1>
          <p className="mt-2 text-lg text-slate-500">Sign in to continue</p>
        </div>

        <button
          onClick={handleGoogleClick}
          disabled={busy || !googleEnabled}
          title={googleEnabled ? undefined : 'Set VITE_GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID to enable'}
          className="mb-2 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-6 py-5 text-xl font-bold text-navy-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GoogleIcon size={26} />
          Continue with Google
        </button>
        {!googleEnabled && (
          <p className="mb-4 text-center text-sm text-slate-400">
            Google sign-in isn't configured in this environment.
          </p>
        )}

        <div className="mb-6 mt-4 flex items-center gap-4">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-base font-semibold text-slate-400">or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {error && (
          <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-lg font-semibold text-rose-600">
            {error}
          </p>
        )}

        {!pendingOtp ? (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            <label htmlFor="phone" className="text-lg font-semibold text-slate-700">
              Sign in with your phone number
            </label>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 px-5 py-4 focus-within:border-teal-500">
              <Phone size={24} className="shrink-0 text-slate-400" />
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (415) 555-0100"
                className="w-full text-xl text-navy-800 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-6 py-5 text-xl font-bold text-white shadow transition hover:bg-teal-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busy && <Loader2 size={22} className="animate-spin" />}
              Send Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-teal-50 p-4">
              <ShieldCheck size={26} className="shrink-0 text-teal-600" />
              <p className="text-lg text-navy-800">
                We sent a 6-digit code to <span className="font-bold">{pendingOtp.phone}</span>.
                {pendingOtp.devCode
                  ? ' This server is running in demo mode (no real SMS provider configured), so the code is shown below instead of arriving by text.'
                  : ' Enter it below to continue.'}
              </p>
            </div>

            {pendingOtp.devCode && (
              <p className="rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/50 px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-teal-700">
                {pendingOtp.devCode}
              </p>
            )}

            <label htmlFor="otp" className="text-lg font-semibold text-slate-700">
              Enter verification code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="rounded-2xl border-2 border-slate-200 px-5 py-4 text-center text-3xl font-bold tracking-[0.3em] text-navy-800 outline-none focus:border-teal-500"
            />

            <button
              type="submit"
              disabled={code.length !== 6 || busy}
              className="flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-6 py-5 text-xl font-bold text-white shadow transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busy && <Loader2 size={22} className="animate-spin" />}
              Verify &amp; Sign In
            </button>

            <div className="flex items-center justify-between text-base font-semibold">
              <button
                type="button"
                onClick={handleChangeNumber}
                className="flex items-center gap-1 text-slate-500 hover:text-navy-700"
              >
                <ChevronLeft size={18} />
                Change number
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onRequestOtp(pendingOtp.phone).catch((err) => setError(err.message))}
                className="text-teal-600 hover:text-teal-700"
              >
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
