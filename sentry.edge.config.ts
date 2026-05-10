import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 0,

  enabled: !!process.env.SENTRY_DSN,

  beforeSend(event) {
    // Strip request body to avoid capturing PII.
    if (event.request) {
      delete event.request.data
    }
    return event
  },
})
