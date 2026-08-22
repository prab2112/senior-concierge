import { SERVICES } from '../../data/mockData'

export default function QuickRequestGrid({ onSelect }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-md sm:p-8">
      <h2 className="mb-5 text-2xl font-bold text-navy-800">Quick Request</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SERVICES.map((service) => {
          const Icon = service.icon
          return (
            <button
              key={service.id}
              onClick={() => onSelect(service)}
              className="flex items-center gap-5 rounded-2xl border-2 border-slate-100 bg-warm-50 px-6 py-6 text-left shadow-sm transition hover:border-teal-400 hover:shadow-md active:scale-[0.98]"
            >
              <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white ${service.color}`}>
                <Icon size={32} />
              </span>
              <span>
                <span className="block text-xl font-bold text-navy-800">{service.label}</span>
                <span className="block text-base text-slate-500">{service.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
