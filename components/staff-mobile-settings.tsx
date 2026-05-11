'use client'

import { LogOut, Monitor, Moon, Settings, Sun, User } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { MenuItem } from '@/components/ui/menu-item'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'

const THEMES = ['system', 'light', 'dark'] as const
type ThemeValue = (typeof THEMES)[number]

const THEME_ICON: Record<ThemeValue, React.ReactNode> = {
  system: <Monitor className="h-4 w-4" />,
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
}

export function StaffMobileSettings() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('Tenant.nav')

  const themeLabel: Record<ThemeValue, string> = {
    system: t('themeSystem'),
    light: t('themeLight'),
    dark: t('themeDark'),
  }

  return (
    <span className="sm:hidden">
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="iconSm" aria-label={t('settings')}>
            <Settings />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('settings')}</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-1 px-4 pb-8">
            {THEMES.map((value) => (
              <MenuItem
                key={value}
                onClick={() => setTheme(value)}
                className={theme === value ? 'font-medium' : undefined}
              >
                {THEME_ICON[value]}
                {themeLabel[value]}
              </MenuItem>
            ))}
            <div className="my-1 border-t" />
            <DrawerClose asChild>
              <MenuItem asChild>
                <Link href="/profile">
                  <User />
                  {t('profile')}
                </Link>
              </MenuItem>
            </DrawerClose>
            <form action={signOut}>
              <MenuItem type="submit" variant="destructive" className="w-full">
                <LogOut />
                {t('signOut')}
              </MenuItem>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </span>
  )
}
