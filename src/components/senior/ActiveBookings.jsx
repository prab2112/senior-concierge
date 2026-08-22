import { Clock } from 'lucide-react'
import { SERVICES } from '../../data/mockData'
import { formatEta } from '../../lib/format'

const STATUS_STYLES = {
  'Not Started': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-amber-100 text-amber-800',
  Completed: 'bg-teal-100 text-teal-800',
}

export default function ActiveBookings({ bookings }) {
  const active = bookings.filter((b) => b.status !== 'Completed')
  const completedToday = bookings.filter((b) => b.status === 'Completed')

  return (
    <div className="rounded-3xl bg-white p-6 shadow-md sm:p-8">
      <h2 className="mb-5 text-2xl font-bold text-navy-800">Your Scheduled Visits</h2>

      {bookings.length === 0 && (
        <p className="text-lg text-slate-500">
          No visits scheduled yet. Use Quick Request above to book one.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {[...active, ...completedToday].map((booking) => {
          const service = SERVICES.find((s) => s.id === booking.serviceId)
          const Icon = service?.icon
          return (
            <div
              key={booking.id}
              className="flex flex-col gap-4 rounded-2xl border-2 border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-700 text-lg font-bold text-white">
                  {booking.conciergeInitials ?? '?'}
                </span>
                <div>
                  <p className="text-xl font-bold text-navy-800">{booking.serviceLabel}</p>
                  <p className="flex items-center gap-1.5 text-base text-slate-600">
                    {Icon && <Icon size={18} />}
                    {booking.conciergeName ? `with ${booking.conciergeName}` : 'Not yet assigned'}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-base text-slate-500">
                    <Clock size={18} />
                    {booking.timeLabel} &middot; Arriving {formatEta(booking.eta)}
                  </p>
                </div>
              </div>
              <span
                className={`w-fit rounded-full px-4 py-2 text-base font-bold ${STATUS_STYLES[booking.status]}`}
              >
                {booking.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
