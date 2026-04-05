import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  logoUrl?: string | null;
  tenantName?: string | null;
}

export function Logo({ className, logoUrl, tenantName }: LogoProps) {
  const content = logoUrl ? (
    <Image
      src={logoUrl}
      alt={tenantName ?? 'Logo'}
      width={120}
      height={36}
      className={cn('object-contain max-h-9', className)}
      priority
    />
  ) : (
    <span className={cn('font-bold tracking-tight text-foreground', className)}>
      {tenantName ?? 'Courseday'}
    </span>
  );

  return (
    <Link href="/" aria-label={tenantName ?? 'Home'}>
      {content}
    </Link>
  );
}
