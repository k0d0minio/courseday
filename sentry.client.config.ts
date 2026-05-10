import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tracing is out of scope — disable entirely to avoid billing surprises.
  tracesSampleRate: 0,

  // Replays are out of scope — separate ticket.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Only report in environments where a DSN is configured (production + preview).
  // Local dev has no DSN set, so the SDK is effectively a no-op there.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  beforeSend(event) {
    // Drop Next.js internal navigation errors that aren't real failures.
    const digest = (event.extra as Record<string, unknown> | undefined)?.digest as
      | string
      | undefined
    if (digest === 'NEXT_NOT_FOUND' || digest?.startsWith('NEXT_REDIRECT')) return null

    // Strip request body to avoid leaking PII (e.g. day-note text).
    if (event.request) {
      delete event.request.data
    }

    return event
  },
})
