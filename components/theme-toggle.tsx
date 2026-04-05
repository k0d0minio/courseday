'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

const THEMES = ['system', 'light', 'dark'] as const;
type ThemeValue = (typeof THEMES)[number];

const THEME_ICON: Record<ThemeValue, React.ReactNode> = {
  system: <Monitor className="h-4 w-4" />,
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('Tenant.nav');
  const current = (theme as ThemeValue | undefined) ?? 'system';

  const label: Record<ThemeValue, string> = {
    system: t('themeSystem'),
    light: t('themeLight'),
    dark: t('themeDark'),
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label={label[current]}
          title={label[current]}
        >
          {THEME_ICON[current]}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        {THEMES.map((value) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent ${current === value ? 'font-medium' : ''}`}
          >
            {THEME_ICON[value]}
            {label[value]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
