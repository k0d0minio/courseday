import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/logo';

export async function LandingFooter() {
  const t = await getTranslations('Platform.landing.footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-[var(--surface-soft)]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 py-14 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">{t('tagline')}</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('product')}
          </div>
          <Link className="text-sm hover:text-[var(--brand)]" href="/#faq">
            {t('navFaq')}
          </Link>
          <Link className="text-sm hover:text-[var(--brand)]" href="/book-a-demo">
            {t('navDemo')}
          </Link>
          <Link className="text-sm hover:text-[var(--brand)]" href="/auth/sign-in">
            {t('navSignIn')}
          </Link>
          <Link className="text-sm hover:text-[var(--brand)]" href="/new">
            {t('navNewVenue')}
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('legal')}
          </div>
          <Link className="text-sm text-muted-foreground hover:text-[var(--brand)]" href="/book-a-demo">
            {t('navContact')}
          </Link>
          <span className="text-sm text-muted-foreground/60">{t('navPrivacy')}</span>
          <span className="text-sm text-muted-foreground/60">{t('navTerms')}</span>
        </div>
      </div>
      <div className="border-t border-black/5 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-muted-foreground">
          {t('copyright', { year })}
        </div>
      </div>
    </footer>
  );
}
