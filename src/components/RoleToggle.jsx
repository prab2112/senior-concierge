import { UserRound, HeartHandshake, LogOut } from 'lucide-react'
import NotificationBell from './notifications/NotificationBell'

export default function RoleToggle({ role, setRole, notificationLog, onSignOut }) {
  return (
    <div className="sticky top-0 z-40 bg-navy-800 shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-white">
          <HeartHandshake size={28} className="text-teal-300" />
          <span className="text-xl font-bold sm:text-2xl">Senior Concierge</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            role="tablist"
            aria-label="Switch view"
            className="flex rounded-2xl bg-navy-900 p-1.5 shadow-inner"
          >
            <button
              role="tab"
              aria-selected={role === 'senior'}
              onClick={() => setRole('senior')}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-base font-bold transition sm:px-6 sm:text-lg ${
                role === 'senior'
                  ? 'bg-teal-500 text-navy-900 shadow'
                  : 'text-teal-100 hover:bg-navy-700'
              }`}
            >
              <UserRound size={22} />
              <span className="hidden sm:inline">Senior / Client</span>
              <span className="sm:hidden">Senior</span>
            </button>
            <button
              role="tab"
              aria-selected={role === 'concierge'}
              onClick={() => setRole('concierge')}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-base font-bold transition sm:px-6 sm:text-lg ${
                role === 'concierge'
                  ? 'bg-teal-500 text-navy-900 shadow'
                  : 'text-teal-100 hover:bg-navy-700'
              }`}
            >
              <HeartHandshake size={22} />
              <span className="hidden sm:inline">Concierge / Provider</span>
              <span className="sm:hidden">Concierge</span>
            </button>
          </div>

          <NotificationBell log={notificationLog} />

          <button
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-12 w-12 items-center justify-center rounded-xl text-teal-100 hover:bg-navy-700"
          >
            <LogOut size={24} />
          </button>
        </div>
      </div>
    </div>
  )
}
