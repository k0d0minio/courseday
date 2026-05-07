import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Canonical button surface conventions:
 *
 * | Surface                              | size        | variant            |
 * | ------------------------------------ | ----------- | ------------------ |
 * | Marketing landing CTA (root domain)  | `lg`        | `default`/`outline`|
 * | CTA on brand-coloured background     | `lg`        | `onBrand`/`onBrandOutline` |
 * | App form submit                      | `default`   | `default`          |
 * | Dialog/Drawer footer cancel          | `default`   | `outline`          |
 * | Card "add" / row action              | `sm`        | `default`/`outline`|
 * | Toolbar / popover trigger            | `sm`        | `outline`/`ghost`  |
 * | Icon-only button                     | `iconSm`/`icon` | `ghost`/`outline` |
 *
 * Never override `h-*`, `min-h-*`, `px-*`, `py-*`, `text-xs`, or `text-[…]`
 * via `className` — extend the variant config instead. ESLint enforces this.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-accent/70',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        onBrand:
          'bg-brand-foreground text-brand shadow-xs hover:bg-brand-foreground/90 focus-visible:ring-brand-foreground/40',
        onBrandOutline:
          'border border-brand-foreground/40 bg-transparent text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground focus-visible:ring-brand-foreground/40',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        // Compact card-row "add" button — denser than `sm`, smaller text.
        xs: 'h-7 rounded-md gap-1 px-2.5 text-xs has-[>svg]:px-2',
        icon: 'size-9',
        iconSm: 'size-8',
        iconXs: 'size-7',
        iconXxs: 'size-6',
        // Ultra-compact affordance (e.g. seat +/− buttons inside a table card).
        iconMicro: 'size-5',
        // Touch-friendly icon button on mobile, compact on desktop.
        iconResponsive: 'size-11 sm:size-9',
        // Form-control surface: matches `h-9` minimum but grows with multi-line content
        // (e.g. tag selectors, multi-select triggers).
        formField: 'min-h-9 px-3 py-1.5 has-[>svg]:px-2.5',
        // Inline link/disclosure: zero box, sits inline with surrounding text.
        // Pair with `variant="link"` or a custom inline button.
        inline: 'h-auto p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
