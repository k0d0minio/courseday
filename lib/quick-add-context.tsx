'use client'

import { createContext, useContext, useState } from 'react'

interface QuickAddContextValue {
  quickAddOpen: boolean
  setQuickAddOpen: (open: boolean) => void
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null)

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  return (
    <QuickAddContext.Provider value={{ quickAddOpen, setQuickAddOpen }}>
      {children}
    </QuickAddContext.Provider>
  )
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext)
  if (!ctx) throw new Error('useQuickAdd must be used inside QuickAddProvider')
  return ctx
}
