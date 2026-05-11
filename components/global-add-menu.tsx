'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useFeatureFlag } from '@/lib/feature-flags-context'
import { DayAddMenu } from '@/components/day-add-menu'
import { getAllPOCs } from '@/app/actions/poc'
import { getAllVenueTypes } from '@/app/actions/venue-type'
import type { PointOfContact, VenueType } from '@/types/index'

const ActivityForm = dynamic(() => import('@/components/activity-form').then((m) => m.ActivityForm))
const ReservationForm = dynamic(() =>
  import('@/components/reservation-form').then((m) => m.ReservationForm)
)
const BreakfastForm = dynamic(() =>
  import('@/components/breakfast-form').then((m) => m.BreakfastForm)
)

export function GlobalAddMenu() {
  const showReservations = useFeatureFlag('reservations')
  const showBreakfast = useFeatureFlag('breakfast_config')

  const [activityOpen, setActivityOpen] = useState(false)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [breakfastOpen, setBreakfastOpen] = useState(false)

  const [pocs, setPocs] = useState<PointOfContact[]>([])
  const [venueTypes, setVenueTypes] = useState<VenueType[]>([])

  async function openActivity() {
    const [pocsResult, vtResult] = await Promise.all([getAllPOCs(), getAllVenueTypes()])
    if (pocsResult.success) setPocs(pocsResult.data)
    if (vtResult.success) setVenueTypes(vtResult.data)
    setActivityOpen(true)
  }

  return (
    <>
      <DayAddMenu
        data-testid="global-add"
        onAddActivity={openActivity}
        onAddReservation={showReservations ? () => setReservationOpen(true) : undefined}
        onAddBreakfast={showBreakfast ? () => setBreakfastOpen(true) : undefined}
      />
      {activityOpen && (
        <ActivityForm
          isOpen={activityOpen}
          onClose={() => setActivityOpen(false)}
          pocs={pocs}
          venueTypes={venueTypes}
          onSuccess={() => {}}
        />
      )}
      {reservationOpen && (
        <ReservationForm
          isOpen={reservationOpen}
          onClose={() => setReservationOpen(false)}
          onSuccess={() => {}}
        />
      )}
      {breakfastOpen && (
        <BreakfastForm
          isOpen={breakfastOpen}
          onClose={() => setBreakfastOpen(false)}
          onSuccess={() => {}}
        />
      )}
    </>
  )
}
