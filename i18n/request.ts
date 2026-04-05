import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

const SUPPORTED = ['en', 'fr', 'es', 'de'] as const;
type Locale = (typeof SUPPORTED)[number];

function isSupportedLocale(v: string | null | undefined): v is Locale {
  return SUPPORTED.includes(v as Locale);
}

/**
 * Detect locale for each request.
 *
 * - Tenant routes: middleware injects `x-tenant-language` from Redis data.
 * - Platform routes: parse `Accept-Language` header, fall back to 'en'.
 */
export default getRequestConfig(async () => {
  const headerStore = await headers();

  // Tenant routes set this header via middleware.
  const tenantLang = headerStore.get('x-tenant-language');
  if (isSupportedLocale(tenantLang)) {
    return {
      locale: tenantLang,
      messages: (await import(`../messages/${tenantLang}.json`)).default,
    };
  }

  // Platform: use browser preference.
  const acceptLang = headerStore.get('accept-language') ?? '';
  const primary = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase();
  const locale = isSupportedLocale(primary) ? primary : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
