import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <span className={cn('font-bold tracking-tight text-foreground', className)}>
      Courseday
    </span>
  );
}
