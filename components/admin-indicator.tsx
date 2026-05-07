'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Settings, LogOut, ChevronUp, Sun, Moon, Monitor } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { signOut } from '@/app/actions/auth'
import { useAuth } from '@/lib/AuthProvider'
import { Button } from '@/components/ui/button'
import { MenuItem } from '@/components/ui/menu-item'
import { cn } from '@/lib/utils'

const THEMES = ['system', 'light', 'dark'] as const
type ThemeValue = (typeof THEMES)[number]

const themeIcon: Record<ThemeValue, React.ReactNode> = {
  system: <Monitor className="h-4 w-4 shrink-0" />,
  light: <Sun className="h-4 w-4 shrink-0" />,
  dark: <Moon className="h-4 w-4 shrink-0" />,
}

const themeLabel: Record<ThemeValue, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

export function AdminIndicator() {
  const { user, isEditor, isLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  const currentTheme = (theme as ThemeValue | undefined) ?? 'system'
  function cycleTheme() {
    const idx = THEMES.indexOf(currentTheme)
    setTheme(THEMES[(idx + 1) % THEMES.length])
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (isLoading || !isEditor) return null

  return (
    <div ref={ref} className="fixed right-4 bottom-4 z-50">
      {open && (
        <div className="bg-popover mb-2 w-56 overflow-hidden rounded-lg border p-1 shadow-lg">
          <div className="px-3 py-2.5">
            <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
          </div>

          <div className="bg-border my-1 h-px" />

          <MenuItem asChild>
            <Link href="/admin/settings" onClick={() => setOpen(false)}>
              <Settings className="h-4 w-4 shrink-0" />
              Settings
            </Link>
          </MenuItem>

          <MenuItem onClick={cycleTheme}>
            {themeIcon[currentTheme]}
            {themeLabel[currentTheme]}
          </MenuItem>

          <div className="bg-border my-1 h-px" />

          <MenuItem
            variant="destructive"
            onClick={() => startTransition(() => signOut())}
            disabled={isPending}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isPending ? 'Signing out…' : 'Sign out'}
          </MenuItem>
        </div>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className={cn('rounded-full shadow-md', open && 'bg-accent')}
        aria-label="Admin menu"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
      </Button>
    </div>
  )
}
