import { Logo } from '@/components/logo';
import { UserMenu } from '@/components/user-menu';
import { getUser } from '@/app/actions/auth';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 h-14 flex items-center justify-between">
        <Logo />
        {user && <UserMenu user={user} />}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
