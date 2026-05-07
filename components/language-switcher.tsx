'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Check, Globe } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { MenuItem } from '@/components/ui/menu-item'
import { cn } from '@/lib/utils'

const LOCALES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
] as const

const COOKIE_NAME = 'NEXT_LOCALE'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function LanguageSwitcher({ className }: { className?: string }) {
  const router = useRouter()
  const current = useLocale()
  const [isPending, startTransition] = useTransition()

  const active = LOCALES.find((l) => l.code === current) ?? LOCALES[0]

  function change(code: string) {
    if (code === current) return
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${COOKIE_NAME}=${code}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Language: ${active.label}`}
          className={cn(className)}
        >
          <Globe className="size-4 opacity-80" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-wide">{active.short}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-44 p-1" aria-label="Choose language">
        <div role="menu" className="flex flex-col">
          {LOCALES.map((l) => {
            const isActive = l.code === current
            return (
              <MenuItem
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => change(l.code)}
                disabled={isPending}
                className={cn('justify-between', isActive && 'font-medium')}
              >
                <span>{l.label}</span>
                {isActive && (
                  <Check className="text-brand size-4" strokeWidth={2.5} aria-hidden="true" />
                )}
              </MenuItem>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
