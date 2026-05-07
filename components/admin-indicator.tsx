'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Settings, LogOut, ChevronUp, Sun, Moon, Monitor } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { signOut } from '@/app/actions/auth'
import { useAuth } from '@/lib/AuthProvider'
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

  // Close on outside click
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
      {/* Expanded panel */}
      {open && (
        <div className="bg-popover mb-2 w-56 overflow-hidden rounded-lg border shadow-lg">
          <div className="px-3 py-2.5">
            <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
          </div>

          <div className="bg-border h-px" />

          <Link
            href="/admin/settings"
            onClick={() => setOpen(false)}
            className="hover:bg-accent flex items-center gap-2 px-3 py-2.5 text-sm transition-colors"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>

          <div className="bg-border h-px" />

          <button
            onClick={cycleTheme}
            className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors"
          >
            {themeIcon[currentTheme]}
            {themeLabel[currentTheme]}
          </button>

          <div className="bg-border h-px" />

          <button
            onClick={() => startTransition(() => signOut())}
            disabled={isPending}
            className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'bg-background flex h-9 w-9 items-center justify-center rounded-full border shadow-md',
          'hover:bg-accent transition-colors',
          open && 'bg-accent'
        )}
        aria-label="Admin menu"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
      </button>
    </div>
  )
}
