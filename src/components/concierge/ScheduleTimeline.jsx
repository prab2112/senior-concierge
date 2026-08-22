import { ChevronRight } from 'lucide-react'
import { SERVICES } from '../../data/mockData'
import { formatEta } from '../../lib/format'

const STATUS_STYLES = {
  'Not Started': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-amber-100 text-amber-800',
  Completed: 'bg-teal-100 text-teal-800',
}

export default function ScheduleTimeline({ tasks, onOpenTask }) {
  const sorted = [...tasks].sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''))

  return (
    <div className="rounded-3xl bg-white p-6 shadow-md sm:p-8">
      <h2 className="mb-5 text-2xl font-bold text-navy-800">Schedule & Route</h2>

      {sorted.length === 0 && (
        <p className="text-lg text-slate-500">No tasks assigned yet today.</p>
      )}

      <ol className="flex flex-col gap-4">
        {sorted.map((task) => {
          const service = SERVICES.find((s) => s.id === task.serviceId)
          const Icon = service?.icon
          return (
            <li key={task.id}>
              <button
                onClick={() => onOpenTask(task)}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-slate-100 p-5 text-left transition hover:border-teal-400 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex w-20 shrink-0 flex-col items-center">
                  <span className="text-lg font-bold text-navy-800">{formatEta(task.eta)}</span>
                </div>
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${service?.color ?? 'bg-navy-700'}`}>
                  {Icon && <Icon size={26} />}
                </span>
                <div className="flex-1">
                  <p className="text-xl font-bold text-navy-800">{task.serviceLabel}</p>
                  <p className="text-base text-slate-500">{task.seniorName} &middot; {task.address}</p>
                </div>
                <span className={`hidden rounded-full px-4 py-2 text-base font-bold sm:inline-block ${STATUS_STYLES[task.status]}`}>
                  {task.status}
                </span>
                <ChevronRight size={26} className="shrink-0 text-slate-400" />
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
