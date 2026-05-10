import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  logoUrl?: string | null
  tenantName?: string | null
}

function CoursedayMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('size-7 shrink-0', className)}
    >
      <rect width="64" height="64" rx="14" fill="var(--brand, #1f5d3a)" />
      <path d="M16 39 a16 16 0 0 1 32 0 Z" fill="var(--brand-foreground, #f3d9a7)" />
      <rect
        x="12"
        y="40"
        width="40"
        height="2.2"
        rx="1.1"
        fill="var(--brand-foreground, #f3d9a7)"
      />
      <rect
        x="21"
        y="45"
        width="22"
        height="1.6"
        rx="0.8"
        fill="var(--brand-foreground, #f3d9a7)"
        opacity="0.55"
      />
    </svg>
  )
}

export function Logo({ className, logoUrl, tenantName }: LogoProps) {
  let content: React.ReactNode

  if (logoUrl) {
    content = (
      <span className="inline-flex items-center rounded bg-white/90 px-1.5 py-0.5 dark:bg-white/95">
        <Image
          src={logoUrl}
          alt={tenantName ?? 'Logo'}
          width={160}
          height={36}
          className="h-8 w-auto max-w-[160px] object-contain sm:h-9"
          priority
        />
      </span>
    )
  } else if (tenantName) {
    content = (
      <span className={cn('text-foreground font-bold tracking-tight', className)}>
        {tenantName}
      </span>
    )
  } else {
    content = (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <CoursedayMark />
        <span className="text-foreground text-[1.05rem] font-semibold tracking-tight lowercase">
          courseday
        </span>
      </span>
    )
  }

  return (
    <Link
      href="/"
      prefetch={false}
      aria-label={tenantName ?? 'Courseday'}
      className="inline-flex items-center"
    >
      {content}
    </Link>
  )
}
