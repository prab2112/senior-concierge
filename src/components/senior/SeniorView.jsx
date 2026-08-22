import { useState } from 'react'
import SeniorHeader from './SeniorHeader'
import WellnessCheckIn from './WellnessCheckIn'
import QuickRequestGrid from './QuickRequestGrid'
import ActiveBookings from './ActiveBookings'
import BookingModal from './BookingModal'
import CallSupportModal from './CallSupportModal'

export default function SeniorView({ name, bookings, onNewBooking, wellnessStatus, onWellnessCheckIn }) {
  const [activeService, setActiveService] = useState(null)
  const [showCallModal, setShowCallModal] = useState(false)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 pb-16 sm:p-6">
      <SeniorHeader name={name} onCallSupport={() => setShowCallModal(true)} />
      <WellnessCheckIn status={wellnessStatus} onCheckIn={onWellnessCheckIn} />
      <QuickRequestGrid onSelect={setActiveService} />
      <ActiveBookings bookings={bookings} />

      {activeService && (
        <BookingModal
          service={activeService}
          onClose={() => setActiveService(null)}
          onSubmit={(details) => onNewBooking(activeService, details)}
        />
      )}

      {showCallModal && <CallSupportModal onClose={() => setShowCallModal(false)} />}
    </div>
  )
}
