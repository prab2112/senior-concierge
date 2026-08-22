import { PhoneCall, X } from 'lucide-react'

export default function CallSupportModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-teal-100">
          <PhoneCall size={40} className="text-teal-600" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-navy-800">Connecting you now...</h2>
        <p className="mb-6 text-lg text-slate-600">
          A support team member will be with you in just a moment. Please stay on the line.
        </p>
        <button
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-700 px-6 py-4 text-xl font-bold text-white hover:bg-navy-800"
        >
          <X size={22} />
          End Call
        </button>
      </div>
    </div>
  )
}
