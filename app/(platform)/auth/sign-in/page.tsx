import { SignInForm } from './sign-in-form';

export default async function PlatformSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = next ?? '/tenants';

  return <SignInForm redirectTo={redirectTo} />;
}
