import { X, MapPin, ClipboardList, Paperclip, RefreshCw } from 'lucide-react'
import { STATUS_FLOW } from '../../data/mockData'

const STATUS_STYLES = {
  'Not Started': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-amber-100 text-amber-800',
  Completed: 'bg-teal-100 text-teal-800',
}

export default function TaskDetailModal({ task, onClose, onAdvanceStatus }) {
  const currentIndex = STATUS_FLOW.indexOf(task.status)
  const nextStatus = STATUS_FLOW[currentIndex + 1]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b-2 border-slate-100 p-6">
          <h2 className="text-2xl font-bold text-navy-800">{task.serviceLabel}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-700 text-xl font-bold text-white">
              {task.seniorName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </span>
            <div>
              <p className="text-xl font-bold text-navy-800">{task.seniorName}</p>
              <p className="flex items-center gap-1.5 text-lg text-slate-600">
                <MapPin size={18} />
                {task.address}
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-2xl bg-slate-50 p-5">
            <p className="mb-1 flex items-center gap-2 text-lg font-bold text-navy-800">
              <ClipboardList size={20} />
              Instructions
            </p>
            <p className="text-lg text-slate-700">{task.notes || 'No additional notes provided.'}</p>
          </div>

          {task.photoName && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-4 text-lg text-slate-600">
              <Paperclip size={22} />
              {task.photoName}
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <p className="text-lg font-bold text-navy-800">Scheduled: {task.timeLabel}</p>
            <span className={`rounded-full px-4 py-2 text-base font-bold ${STATUS_STYLES[task.status]}`}>
              {task.status}
            </span>
          </div>
        </div>

        <div className="border-t-2 border-slate-100 p-6">
          {nextStatus ? (
            <button
              onClick={() => onAdvanceStatus(task.id)}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-teal-500 px-8 py-5 text-xl font-bold text-white shadow transition hover:bg-teal-600 active:scale-[0.98]"
            >
              <RefreshCw size={24} />
              Mark as {nextStatus}
            </button>
          ) : (
            <div className="rounded-2xl bg-teal-50 p-5 text-center text-xl font-bold text-teal-700">
              Task Completed
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
