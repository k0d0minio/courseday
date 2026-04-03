import { getTenantFromHeaders } from '@/lib/tenant';

export default async function TenantHomePage() {
  const { slug } = await getTenantFromHeaders();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <p className="text-muted-foreground">
        Welcome to <span className="font-medium text-foreground">{slug}</span>. Coming soon.
      </p>
    </div>
  );
}
