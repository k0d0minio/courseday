import { redirect } from 'next/navigation';
import { protocol, rootDomain } from '@/lib/utils';

type Props = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function TenantSignInPage({ params, searchParams }: Props) {
  const { tenant } = await params;
  const { redirectTo } = await searchParams;
  const url = new URL(`${protocol}://${rootDomain}/auth/sign-in`);
  url.searchParams.set('slug', tenant);
  if (redirectTo) {
    url.searchParams.set('redirectTo', redirectTo);
  }
  redirect(url.toString());
}
