import { useEffect, useState } from 'react'
import { HeartHandshake, UserRound, Loader2 } from 'lucide-react'

export default function OnboardingScreen({ onComplete, onFetchConcierges }) {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState(null)
  const [address, setAddress] = useState('')
  const [conciergeId, setConciergeId] = useState('')
  const [concierges, setConcierges] = useState([])
  const [loadingConcierges, setLoadingConcierges] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (role !== 'senior' || concierges.length > 0) return
    setLoadingConcierges(true)
    onFetchConcierges()
      .then(setConcierges)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingConcierges(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const canSubmit = fullName.trim().length > 0 && role && !busy

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setBusy(true)
    try {
      await onComplete({
        fullName: fullName.trim(),
        role,
        address: role === 'senior' ? address.trim() || undefined : undefined,
        conciergeId: role === 'senior' ? conciergeId || undefined : undefined,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-800 text-teal-300">
            <HeartHandshake size={32} />
          </span>
          <h1 className="text-3xl font-extrabold text-navy-800">Welcome!</h1>
          <p className="mt-2 text-lg text-slate-500">Let's finish setting up your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="fullName" className="mb-2 block text-lg font-semibold text-slate-700">
              Your full name
            </label>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 px-5 py-4 focus-within:border-teal-500">
              <UserRound size={24} className="shrink-0 text-slate-400" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Rao"
                className="w-full text-xl text-navy-800 outline-none"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-lg font-semibold text-slate-700">I am a...</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole('senior')}
                className={`rounded-2xl border-2 px-5 py-5 text-left transition ${
                  role === 'senior' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <span className="block text-lg font-bold text-navy-800">Senior</span>
                <span className="block text-base text-slate-500">Looking for help &amp; care</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('concierge')}
                className={`rounded-2xl border-2 px-5 py-5 text-left transition ${
                  role === 'concierge' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <span className="block text-lg font-bold text-navy-800">Concierge</span>
                <span className="block text-base text-slate-500">Providing care &amp; support</span>
              </button>
            </div>
          </div>

          {role === 'senior' && (
            <>
              <div>
                <label htmlFor="address" className="mb-2 block text-lg font-semibold text-slate-700">
                  Your address <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 42 Willow Creek Lane, Fremont, CA"
                  className="w-full rounded-2xl border-2 border-slate-200 px-5 py-4 text-xl text-navy-800 outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label htmlFor="concierge" className="mb-2 block text-lg font-semibold text-slate-700">
                  Your concierge <span className="font-normal text-slate-400">(optional)</span>
                </label>
                {loadingConcierges ? (
                  <p className="flex items-center gap-2 text-lg text-slate-500">
                    <Loader2 size={20} className="animate-spin" />
                    Loading available concierges...
                  </p>
                ) : concierges.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-5 py-4 text-lg text-slate-500">
                    No concierges available yet. You can be assigned one later.
                  </p>
                ) : (
                  <select
                    id="concierge"
                    value={conciergeId}
                    onChange={(e) => setConciergeId(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 px-5 py-4 text-xl text-navy-800 outline-none focus:border-teal-500"
                  >
                    <option value="">Not sure yet</option>
                    {concierges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}

          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-lg font-semibold text-rose-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-6 py-5 text-xl font-bold text-white shadow transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy && <Loader2 size={22} className="animate-spin" />}
            Finish Setup
          </button>
        </form>
      </div>
    </div>
  )
}
