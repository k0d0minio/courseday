'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { MenuItem } from '@/components/ui/menu-item'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

const THEMES = ['system', 'light', 'dark'] as const
type ThemeValue = (typeof THEMES)[number]

const THEME_ICON: Record<ThemeValue, React.ReactNode> = {
  system: <Monitor className="h-4 w-4" />,
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('Tenant.nav')
  const current = (theme as ThemeValue | undefined) ?? 'system'

  const label: Record<ThemeValue, string> = {
    system: t('themeSystem'),
    light: t('themeLight'),
    dark: t('themeDark'),
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="iconSm"
          className="text-muted-foreground hover:text-foreground"
          aria-label={label[current]}
          title={label[current]}
        >
          {THEME_ICON[current]}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        {THEMES.map((value) => (
          <MenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={current === value ? 'font-medium' : undefined}
          >
            {THEME_ICON[value]}
            {label[value]}
          </MenuItem>
        ))}
      </PopoverContent>
    </Popover>
  )
}
