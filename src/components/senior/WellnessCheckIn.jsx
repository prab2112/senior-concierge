import { Smile, PhoneIncoming, CheckCircle2 } from 'lucide-react'

export default function WellnessCheckIn({ status, onCheckIn }) {
  if (status) {
    return (
      <div className="flex items-center gap-4 rounded-3xl bg-teal-50 p-6 shadow-md ring-2 ring-teal-200 sm:p-8">
        <CheckCircle2 size={36} className="shrink-0 text-teal-600" />
        <div>
          <p className="text-xl font-bold text-navy-800">Thanks for checking in today!</p>
          <p className="text-lg text-slate-600">
            {status === 'well'
              ? "You told us you're doing well. Glad to hear it!"
              : 'We let your concierge know you would like a phone call.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-md sm:p-8">
      <h2 className="mb-5 text-2xl font-bold text-navy-800">How are you feeling today?</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => onCheckIn('well')}
          className="flex items-center gap-4 rounded-2xl bg-teal-500 px-6 py-6 text-left text-white shadow transition hover:bg-teal-600 active:scale-[0.98]"
        >
          <Smile size={36} />
          <span className="text-xl font-bold">I'm doing well</span>
        </button>
        <button
          onClick={() => onCheckIn('call')}
          className="flex items-center gap-4 rounded-2xl bg-navy-700 px-6 py-6 text-left text-white shadow transition hover:bg-navy-800 active:scale-[0.98]"
        >
          <PhoneIncoming size={36} />
          <span className="text-xl font-bold">I need a phone call</span>
        </button>
      </div>
    </div>
  )
}
