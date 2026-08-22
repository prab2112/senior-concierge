import { useEffect } from 'react'
import { X, MessageCircle, MessageSquare, CheckCheck } from 'lucide-react'

const CHANNEL_STYLE = {
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    bar: 'bg-[#25D366]',
    chip: 'bg-[#e7f9ee] text-[#128c4a]',
  },
  sms: {
    icon: MessageSquare,
    label: 'SMS',
    bar: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700',
  },
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 6000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const style = CHANNEL_STYLE[toast.channel]
  const Icon = style.icon

  return (
    <div className="pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
      <span className={`w-2 shrink-0 ${style.bar}`} />
      <div className="flex-1 p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${style.chip}`}>
            <Icon size={16} />
            {style.label} to {toast.toName}
          </span>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-base text-navy-800">{toast.message}</p>
        <p
          className={`mt-1.5 flex items-center gap-1 text-sm ${
            toast.status === 'failed' ? 'text-rose-500' : 'text-slate-400'
          }`}
        >
          <CheckCheck size={14} className={toast.status === 'failed' ? 'text-rose-400' : 'text-sky-500'} />
          {toast.toAddress} &middot; {toast.status ?? 'sent'}
        </p>
      </div>
    </div>
  )
}

export default function NotificationToastStack({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-3 px-3 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
