import Link from 'next/link';
import { Logo } from '@/components/logo';
import { getUser } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user-menu';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 h-14 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/tenants">
                <Button variant="ghost" size="sm">My courses</Button>
              </Link>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link href="/auth/sign-in">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
