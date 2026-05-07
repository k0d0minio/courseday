import { Suspense } from 'react'
import { ConfirmAuthClient } from './confirm-auth-client'

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-[50vh] items-center justify-center p-6 text-sm">
          Loading…
        </div>
      }
    >
      <ConfirmAuthClient />
    </Suspense>
  )
}
