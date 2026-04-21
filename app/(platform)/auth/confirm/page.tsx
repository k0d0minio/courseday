import { Suspense } from 'react';
import { ConfirmAuthClient } from './confirm-auth-client';

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ConfirmAuthClient />
    </Suspense>
  );
}
