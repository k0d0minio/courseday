import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const isDev = process.env.NODE_ENV !== 'production'

// 'unsafe-eval' is needed by Next.js dev tooling and Vercel Live preview comments.
// In production it's unnecessary attack surface — Vercel injects its own headers
// for preview deployments, so dropping it here doesn't break preview comments.
const scriptSrc = ["'self'", "'unsafe-inline'", isDev && "'unsafe-eval'", 'https://vercel.live']
  .filter(Boolean)
  .join(' ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io https://vercel.live wss://vercel.live",
      "frame-ancestors 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  experimental: {
    // Required to use ioredis (Node.js TCP sockets) inside middleware.
    // Without this, middleware runs on the Edge runtime which doesn't support
    // Node.js APIs. The type definition lags the runtime — suppress the error.
    // @ts-expect-error nodeMiddleware is not yet in ExperimentalConfig types
    nodeMiddleware: true,
    optimizePackageImports: ['date-fns', 'lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
