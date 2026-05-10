'use client'

import { useEffect, useState } from 'react'
import { Plus, CalendarClock, UtensilsCrossed, Coffee, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { MenuItem } from '@/components/ui/menu-item'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

type Props = {
  ref?: React.Ref<HTMLButtonElement>
  onAddActivity: () => void
  onAddReservation?: (() => void) | undefined
  onAddBreakfast?: (() => void) | undefined
  onAddShift?: (() => void) | undefined
}

export function DayAddMenu({
  ref,
  onAddActivity,
  onAddReservation,
  onAddBreakfast,
  onAddShift,
}: Props) {
  const tDay = useTranslations('Tenant.day')
  const tStaff = useTranslations('Tenant.staff.section')
  const tPoc = useTranslations('Tenant.poc')
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  function handleSelect(fn: () => void) {
    setOpen(false)
    fn()
  }

  const menuItems = (
    <div className="flex flex-col gap-0.5">
      <MenuItem data-testid="add-activity" onClick={() => handleSelect(onAddActivity)}>
        <CalendarClock />
        {tDay('addActivity')}
      </MenuItem>
      {onAddReservation && (
        <MenuItem data-testid="add-reservation" onClick={() => handleSelect(onAddReservation)}>
          <UtensilsCrossed />
          {tDay('addReservation')}
        </MenuItem>
      )}
      {onAddBreakfast && (
        <MenuItem data-testid="add-breakfast" onClick={() => handleSelect(onAddBreakfast)}>
          <Coffee />
          {tDay('addBreakfast')}
        </MenuItem>
      )}
      {onAddShift && (
        <MenuItem data-testid="add-shift" onClick={() => handleSelect(onAddShift)}>
          <Users />
          {tStaff('addShift')}
        </MenuItem>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button ref={ref} size="sm" data-testid="day-add-menu">
            <Plus className="mr-1 h-4 w-4" />
            {tPoc('add')}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{tPoc('add')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8">{menuItems}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button ref={ref} size="sm" data-testid="day-add-menu">
          <Plus className="mr-1 h-4 w-4" />
          {tPoc('add')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        {menuItems}
      </PopoverContent>
    </Popover>
  )
}
