import { SignUpForm } from './sign-up-form';

export default async function PlatformSignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <SignUpForm next={next ?? '/tenants'} />;
}
