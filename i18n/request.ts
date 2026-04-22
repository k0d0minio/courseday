import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';

const SUPPORTED = ['en', 'fr', 'es', 'de'] as const;
type Locale = (typeof SUPPORTED)[number];

export const LOCALE_COOKIE = 'NEXT_LOCALE';

function isSupportedLocale(v: string | null | undefined): v is Locale {
  return SUPPORTED.includes(v as Locale);
}

/**
 * Detect locale for each request.
 *
 * - Tenant routes: middleware injects `x-tenant-language` from Redis data.
 * - Platform routes: `NEXT_LOCALE` cookie (manual switcher) overrides
 *   `Accept-Language` browser preference. Falls back to 'en'.
 */
export default getRequestConfig(async () => {
  const headerStore = await headers();

  // Tenant routes set this header via middleware and always win over the cookie.
  const tenantLang = headerStore.get('x-tenant-language');
  if (isSupportedLocale(tenantLang)) {
    return {
      locale: tenantLang,
      messages: (await import(`../messages/${tenantLang}.json`)).default,
    };
  }

  // Platform: cookie override first, then browser preference.
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(cookieLang)) {
    return {
      locale: cookieLang,
      messages: (await import(`../messages/${cookieLang}.json`)).default,
    };
  }

  const acceptLang = headerStore.get('accept-language') ?? '';
  const primary = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase();
  const locale = isSupportedLocale(primary) ? primary : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
