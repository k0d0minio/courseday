import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    // Required to use ioredis (Node.js TCP sockets) inside middleware.
    // Without this, middleware runs on the Edge runtime which doesn't support
    // Node.js APIs. The type definition lags the runtime — suppress the error.
    // @ts-expect-error nodeMiddleware is not yet in ExperimentalConfig types
    nodeMiddleware: true,
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
};

export default withNextIntl(nextConfig);
