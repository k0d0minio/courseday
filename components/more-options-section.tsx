'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  children: React.ReactNode
  defaultOpen?: boolean
  label?: string
}

export function MoreOptionsSection({ children, defaultOpen = false, label }: Props) {
  const t = useTranslations('Tenant.allergens')
  const [open, setOpen] = useState(defaultOpen)
  const resolvedLabel = label ?? t('moreOptions')

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="inline"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground gap-1 hover:bg-transparent"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
        />
        <span>{resolvedLabel}</span>
      </Button>
      <div className={cn('space-y-4', open ? 'block' : 'hidden')}>{children}</div>
    </div>
  )
}
