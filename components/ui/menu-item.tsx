import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const menuItemVariants = cva(
  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors outline-none focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'text-destructive hover:bg-destructive/10',
        muted: 'text-muted-foreground hover:bg-muted hover:text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function MenuItem({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof menuItemVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="menu-item"
      className={cn(menuItemVariants({ variant, className }))}
      {...props}
    />
  )
}

export { MenuItem, menuItemVariants }
