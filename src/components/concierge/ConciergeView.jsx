import { useState } from 'react'
import DashboardSummary from './DashboardSummary'
import ScheduleTimeline from './ScheduleTimeline'
import TaskDetailModal from './TaskDetailModal'
import LiveChat from './LiveChat'

export default function ConciergeView({ name, tasks, onAdvanceStatus, messages, onSendMessage }) {
  const [openTaskId, setOpenTaskId] = useState(null)

  const tasksToday = tasks.length
  const completed = tasks.filter((t) => t.status === 'Completed').length
  const hoursLogged = (completed * 1.5 + tasks.filter((t) => t.status === 'In Progress').length * 0.5).toFixed(1)

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 pb-16 sm:p-6">
      <div className="rounded-3xl bg-white p-6 shadow-md sm:p-8">
        <p className="text-lg text-slate-500">Welcome back,</p>
        <h1 className="text-3xl font-extrabold text-navy-800 sm:text-4xl">{name}</h1>
      </div>

      <DashboardSummary tasksToday={tasksToday} completed={completed} hoursLogged={hoursLogged} />

      <ScheduleTimeline tasks={tasks} onOpenTask={(task) => setOpenTaskId(task.id)} />

      <LiveChat
        seniorName={tasks[0]?.seniorName ?? 'your client'}
        messages={messages}
        onSend={onSendMessage}
      />

      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => setOpenTaskId(null)}
          onAdvanceStatus={(id) => {
            onAdvanceStatus(id)
          }}
        />
      )}
    </div>
  )
}
