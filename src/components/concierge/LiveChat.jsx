import { useState } from 'react'
import { Send, MessageCircle } from 'lucide-react'

export default function LiveChat({ seniorName, messages, onSend }) {
  const [draft, setDraft] = useState('')

  const handleSend = () => {
    if (!draft.trim()) return
    onSend(draft.trim())
    setDraft('')
  }

  return (
    <div className="flex flex-col rounded-3xl bg-white p-6 shadow-md sm:p-8">
      <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold text-navy-800">
        <MessageCircle size={26} />
        Chat with {seniorName}
      </h2>

      <div className="mb-4 flex max-h-72 flex-col gap-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'concierge' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 text-lg ${
                msg.sender === 'concierge'
                  ? 'bg-navy-700 text-white'
                  : 'bg-white text-navy-800 shadow'
              }`}
            >
              {msg.text}
            </div>
            <span className="mt-1 text-sm text-slate-400">{msg.time}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-2xl border-2 border-slate-200 px-5 py-4 text-lg text-navy-800 outline-none focus:border-teal-500"
        />
        <button
          onClick={handleSend}
          aria-label="Send message"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow hover:bg-teal-600"
        >
          <Send size={24} />
        </button>
      </div>
    </div>
  )
}
