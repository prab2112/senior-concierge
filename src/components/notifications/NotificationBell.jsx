import { useEffect, useRef, useState } from 'react'
import { Bell, MessageCircle, MessageSquare } from 'lucide-react'

const CHANNEL_STYLE = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', chip: 'bg-[#e7f9ee] text-[#128c4a]' },
  sms: { icon: MessageSquare, label: 'SMS', chip: 'bg-sky-50 text-sky-700' },
}

export default function NotificationBell({ log }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Alert log"
        className="relative flex h-12 w-12 items-center justify-center rounded-xl text-teal-100 hover:bg-navy-700"
      >
        <Bell size={24} />
        {log.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
            {log.length > 9 ? '9+' : log.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
          <div className="border-b-2 border-slate-100 p-4">
            <h3 className="text-lg font-bold text-navy-800">Alert Log</h3>
            <p className="text-sm text-slate-500">SMS &amp; WhatsApp alerts</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {log.length === 0 && (
              <p className="p-5 text-base text-slate-500">No alerts sent yet.</p>
            )}
            {log.map((item) => {
              const style = CHANNEL_STYLE[item.channel]
              const Icon = style.icon
              return (
                <div key={item.id} className="flex items-start gap-3 border-b border-slate-50 p-4 last:border-0">
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.chip}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy-800">
                      {style.label} to {item.toName}
                    </p>
                    <p className="truncate text-sm text-slate-600">{item.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.time}
                      {item.status === 'failed' && <span className="ml-1 font-semibold text-rose-500">&middot; failed</span>}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
