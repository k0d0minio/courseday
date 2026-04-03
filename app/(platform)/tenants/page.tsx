import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/app/actions/auth';
import { getUserTenants } from '@/lib/membership';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { protocol, rootDomain } from '@/lib/utils';

export default async function TenantsPage() {
  const user = await getUser();
  if (!user) redirect('/auth/sign-in');

  const tenants = await getUserTenants();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My courses</h1>
        <Link href="/new">
          <Button>Add course</Button>
        </Link>
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">You have no courses yet.</p>
            <Link href="/new">
              <Button>Create your first course</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {tenants.map(({ tenant, role }) => (
            <li key={tenant.id}>
              <a
                href={`${protocol}://${tenant.slug}.${rootDomain}/`}
                className="block"
              >
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.slug}.{rootDomain}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize border rounded-full px-2 py-0.5">
                      {role}
                    </span>
                  </CardContent>
                </Card>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
