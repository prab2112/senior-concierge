import { Pill, Stethoscope, ShoppingCart, Laptop } from 'lucide-react'

// Service/time-block catalog. These are also seeded server-side in
// db/schema.postgres.sql -- codes here (`id`) must match the `code`
// column there. Kept as a local constant rather than fetched from
// GET /service-types / GET /time-blocks because they're static UI
// content (icon, color) that the backend doesn't need to know about.
export const SERVICES = [
  {
    id: 'medicines',
    label: 'Get Medicines',
    icon: Pill,
    color: 'bg-teal-600',
    description: 'Prescription pickup & delivery',
  },
  {
    id: 'doctor-ride',
    label: 'Doctor Appointment Ride',
    icon: Stethoscope,
    color: 'bg-navy-700',
    description: 'Transport to & from appointments',
  },
  {
    id: 'groceries',
    label: 'Groceries',
    icon: ShoppingCart,
    color: 'bg-amber-600',
    description: 'Weekly shopping & essentials',
  },
  {
    id: 'tech-help',
    label: 'Tech & Computer Help',
    icon: Laptop,
    color: 'bg-slate-600',
    description: 'Phone, computer & TV assistance',
  },
]

export const TIME_BLOCKS = [
  { id: 'morning', label: 'Morning', range: '9 AM - 12 PM' },
  { id: 'afternoon', label: 'Afternoon', range: '2 PM - 5 PM' },
  { id: 'evening', label: 'Evening', range: '6 PM - 8 PM' },
]

export const STATUS_FLOW = ['Not Started', 'In Progress', 'Completed']

// Prefills the sign-in form's phone field with the demo senior account
// created by `server/scripts/seed-demo.js`, so a fresh checkout has
// something to sign in as without looking up a phone number first.
export const DEMO_SENIOR_PHONE = '+14155550100'
