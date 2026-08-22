import { ListChecks, CheckCircle2, Clock3 } from 'lucide-react'

export default function DashboardSummary({ tasksToday, completed, hoursLogged }) {
  const cards = [
    { label: 'Tasks Today', value: tasksToday, icon: ListChecks, color: 'text-navy-700 bg-navy-50' },
    { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-teal-700 bg-teal-50' },
    { label: 'Hours Logged', value: hoursLogged, icon: Clock3, color: 'text-amber-700 bg-amber-50' },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-4 rounded-3xl bg-white p-6 shadow-md">
          <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${color}`}>
            <Icon size={30} />
          </span>
          <div>
            <p className="text-3xl font-extrabold text-navy-800">{value}</p>
            <p className="text-lg text-slate-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
