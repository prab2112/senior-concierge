import { useState } from 'react'
import { X, Sun, Sunset, Moon, Paperclip, CheckCircle2, ChevronLeft } from 'lucide-react'
import { TIME_BLOCKS } from '../../data/mockData'

const BLOCK_ICONS = { morning: Sun, afternoon: Sunset, evening: Moon }

export default function BookingModal({ service, onClose, onSubmit }) {
  const [step, setStep] = useState(1)
  const [timeBlockId, setTimeBlockId] = useState(null)
  const [notes, setNotes] = useState('')
  const [photoName, setPhotoName] = useState(null)

  const Icon = service.icon
  const timeBlock = TIME_BLOCKS.find((t) => t.id === timeBlockId)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (file) setPhotoName(file.name)
  }

  const handleConfirm = () => {
    onSubmit({
      timeBlockId,
      timeLabel: `${timeBlock.label}, ${timeBlock.range}`,
      notes,
      photoName,
    })
    setStep(3)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b-2 border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${service.color}`}>
              <Icon size={28} />
            </span>
            <h2 className="text-2xl font-bold text-navy-800">{service.label}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X size={28} />
          </button>
        </div>

        {step !== 3 && (
          <div className="flex items-center gap-2 px-6 pt-5">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`h-2 flex-1 rounded-full ${step >= n ? 'bg-teal-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div>
              <h3 className="mb-4 text-xl font-bold text-navy-800">Step 1: Select Date & Time</h3>
              <p className="mb-4 text-lg text-slate-600">Pick a block that works best for you today.</p>
              <div className="flex flex-col gap-4">
                {TIME_BLOCKS.map((block) => {
                  const BIcon = BLOCK_ICONS[block.id]
                  const selected = timeBlockId === block.id
                  return (
                    <button
                      key={block.id}
                      onClick={() => setTimeBlockId(block.id)}
                      className={`flex items-center gap-4 rounded-2xl border-2 px-6 py-5 text-left transition ${
                        selected
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      <BIcon size={30} className="text-navy-700" />
                      <span>
                        <span className="block text-xl font-bold text-navy-800">{block.label}</span>
                        <span className="block text-lg text-slate-600">{block.range}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="mb-4 text-xl font-bold text-navy-800">Step 2: Add Notes</h3>
              <label className="mb-2 block text-lg font-semibold text-slate-700" htmlFor="notes">
                Notes for your concierge (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="e.g. Please pick up my prescription from Walgreens on Main St."
                className="mb-5 w-full rounded-2xl border-2 border-slate-200 p-4 text-lg text-navy-800 outline-none focus:border-teal-500"
              />
              <label className="mb-2 block text-lg font-semibold text-slate-700">
                Upload a photo (e.g. prescription slip)
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 px-6 py-5 text-lg text-slate-600 hover:border-teal-400">
                <Paperclip size={26} />
                {photoName ? photoName : 'Tap to choose a photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 size={72} className="mb-5 text-teal-500" />
              <h3 className="mb-3 text-3xl font-extrabold text-navy-800">Request Confirmed!</h3>
              <p className="max-w-md text-lg text-slate-600">
                Your request for <span className="font-bold">{service.label}</span> during{' '}
                <span className="font-bold">{timeBlock?.label}</span> has been sent. Your concierge
                will be in touch shortly.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t-2 border-slate-100 p-6">
          {step === 1 && (
            <>
              <span />
              <button
                disabled={!timeBlockId}
                onClick={() => setStep(2)}
                className="rounded-2xl bg-teal-500 px-8 py-4 text-xl font-bold text-white shadow transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Next
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 rounded-2xl border-2 border-slate-200 px-6 py-4 text-xl font-bold text-navy-700 hover:bg-slate-50"
              >
                <ChevronLeft size={22} />
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-2xl bg-teal-500 px-8 py-4 text-xl font-bold text-white shadow transition hover:bg-teal-600"
              >
                Submit Request
              </button>
            </>
          )}
          {step === 3 && (
            <button
              onClick={onClose}
              className="ml-auto rounded-2xl bg-navy-700 px-8 py-4 text-xl font-bold text-white shadow transition hover:bg-navy-800"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
