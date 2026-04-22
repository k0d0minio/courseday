import { cn } from '@/lib/utils';

export function SectionShell({
  className,
  children,
  id,
  tone = 'default',
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
  tone?: 'default' | 'soft' | 'brand';
}) {
  return (
    <section
      id={id}
      className={cn(
        'w-full px-6 py-20 sm:py-28',
        tone === 'soft' && 'bg-[var(--surface-soft)]',
        tone === 'brand' && 'bg-[var(--brand)] text-[var(--brand-foreground)]',
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]',
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        'font-display text-3xl sm:text-4xl font-medium tracking-tight leading-[1.1] max-w-3xl text-balance',
        className,
      )}
    >
      {children}
    </h2>
  );
}
