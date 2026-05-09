import { redirect } from 'next/navigation'
import { format, startOfISOWeek } from 'date-fns'

export const dynamic = 'force-dynamic'

export default function SchedulePage() {
  const monday = format(startOfISOWeek(new Date()), 'yyyy-MM-dd')
  redirect(`/schedule/${monday}`)
}
