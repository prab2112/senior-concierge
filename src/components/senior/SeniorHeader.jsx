import { PhoneCall } from 'lucide-react'

export default function SeniorHeader({ name, onCallSupport }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-md sm:p-8">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-lg text-slate-500">Good afternoon,</p>
          <h1 className="text-3xl font-extrabold text-navy-800 sm:text-4xl">
            Hello, {name}
          </h1>
        </div>
        <button
          onClick={onCallSupport}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-amber-500 px-8 py-5 text-xl font-bold text-white shadow-lg transition hover:bg-amber-600 active:scale-[0.98] sm:w-auto"
        >
          <PhoneCall size={28} />
          Call Support
        </button>
      </div>
    </div>
  )
}
