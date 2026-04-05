import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  logoUrl?: string | null;
  tenantName?: string | null;
}

export function Logo({ className, logoUrl, tenantName }: LogoProps) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={tenantName ?? 'Logo'}
        width={120}
        height={36}
        className={cn('object-contain max-h-9', className)}
        priority
      />
    );
  }

  return (
    <span className={cn('font-bold tracking-tight text-foreground', className)}>
      {tenantName ?? 'Courseday'}
    </span>
  );
}
