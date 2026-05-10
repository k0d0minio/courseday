import * as Sentry from '@sentry/nextjs'
import type { Event } from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Tracing is out of scope.
  tracesSampleRate: 0,

  enabled: !!process.env.SENTRY_DSN,

  beforeSend(event: Event, hint) {
    const err = hint?.originalException

    // Drop Next.js internal navigation signals — they're controlled flow, not bugs.
    if (err instanceof Error) {
      const digest = (err as Error & { digest?: string }).digest
      if (digest === 'NEXT_NOT_FOUND' || digest?.startsWith('NEXT_REDIRECT')) return null

      // AbortError fires when a client navigates away mid-request — not a bug.
      if (err.name === 'AbortError') return null
    }

    // Strip request body to avoid capturing PII (e.g. day-note content, guest names).
    if (event.request) {
      delete event.request.data
    }

    return event
  },
})
