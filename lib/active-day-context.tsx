'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { QuickAddParseData } from '@/lib/quick-add-types'

export type PendingQuickAddResult =
  | { type: 'success'; data: QuickAddParseData; raw: string }
  | { type: 'failed'; raw: string; error: string }

type ActiveDayContextValue = {
  /** Tenant calendar "today" from server (navigation lower bound). */
  tenantTodayYmd: string
  activeDayYmd: string
  setActiveDayYmd: (ymd: string) => void
  pendingQuickAddResult: PendingQuickAddResult | null
  setPendingQuickAddResult: (r: PendingQuickAddResult | null) => void
}

const ActiveDayContext = createContext<ActiveDayContextValue | null>(null)

export function ActiveDayProvider({
  tenantTodayYmd,
  children,
}: {
  tenantTodayYmd: string
  children: ReactNode
}) {
  const [activeDayYmd, setState] = useState(tenantTodayYmd)
  const [pendingQuickAddResult, setPendingQuickAddResult] = useState<PendingQuickAddResult | null>(
    null
  )

  const setActiveDayYmd = useCallback((ymd: string) => {
    setState(ymd)
  }, [])

  const value = useMemo(
    () => ({
      tenantTodayYmd,
      activeDayYmd,
      setActiveDayYmd,
      pendingQuickAddResult,
      setPendingQuickAddResult,
    }),
    [tenantTodayYmd, activeDayYmd, setActiveDayYmd, pendingQuickAddResult]
  )

  return <ActiveDayContext.Provider value={value}>{children}</ActiveDayContext.Provider>
}

export function useActiveDay(): ActiveDayContextValue {
  const ctx = useContext(ActiveDayContext)
  if (!ctx) {
    throw new Error('useActiveDay must be used within ActiveDayProvider')
  }
  return ctx
}
