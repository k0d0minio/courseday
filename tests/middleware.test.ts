import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  authGetUser: vi.fn(),
  fromMock: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  rootDomain: 'example.com',
  protocol: 'http',
  sharedCookieDomain: '.example.com',
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.authGetUser },
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mocks.fromMock,
  }),
}))

import { middleware } from '@/middleware'

const ACTIVE_TENANT = {
  id: 'tenant-1',
  name: 'Pierpont',
  slug: 'pierpont',
  language: 'en',
  status: 'active',
}

function setupServiceClient(
  opts: {
    tenantRow?: Record<string, unknown> | null
    superadminRow?: Record<string, unknown> | null
  } = {}
) {
  mocks.fromMock.mockImplementation((table: string) => {
    let data: unknown = null
    if (table === 'tenants') data = opts.tenantRow ?? null
    if (table === 'superadmins') data = opts.superadminRow ?? null
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data, error: null }),
        }),
      }),
    }
  })
}

function makeReq(url: string) {
  const u = new URL(url)
  const req = new NextRequest(url)
  // `host` is a forbidden header in undici's Headers, so init.headers.host is
  // silently dropped. Shadow `get` on the headers instance so middleware's
  // `request.headers.get('host')` returns the URL host. Iteration / cloning
  // (`new Headers(request.headers)`) still uses the real instance — host is
  // not propagated to the rewrite, which is fine since middleware only reads
  // it for subdomain detection.
  const origGet = req.headers.get.bind(req.headers)
  ;(req.headers as { get: (name: string) => string | null }).get = (name: string) =>
    name.toLowerCase() === 'host' ? u.host : origGet(name)
  return req
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.redisGet.mockResolvedValue(null)
  mocks.redisSet.mockResolvedValue('OK')
  mocks.authGetUser.mockResolvedValue({ data: { user: null } })
  setupServiceClient()
})

describe('middleware — subdomain detection', () => {
  it('passes through requests on the root domain', async () => {
    const res = await middleware(makeReq('http://example.com/'))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('redirects www to the root domain', async () => {
    const res = await middleware(makeReq('http://www.example.com/'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('example.com')
  })

  it('redirects /admin on a tenant subdomain to the platform root', async () => {
    const res = await middleware(makeReq('http://pierpont.example.com/admin'))
    expect(res.status).toBe(307)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.host).toBe('example.com')
    expect(loc.pathname).toBe('/')
  })
})

describe('middleware — tenant resolution', () => {
  it('reads the tenant from the redis cache and rewrites to /[tenant]', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(ACTIVE_TENANT))
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const res = await middleware(makeReq('http://pierpont.example.com/dashboard'))

    expect(mocks.redisGet).toHaveBeenCalledWith('subdomain:pierpont')
    expect(mocks.fromMock).not.toHaveBeenCalled()
    expect(res.headers.get('x-middleware-rewrite')).toContain('/pierpont/dashboard')
  })

  it('falls back to Supabase on cache miss and back-fills the cache', async () => {
    mocks.redisGet.mockResolvedValue(null)
    setupServiceClient({
      tenantRow: { id: 't-2', name: 'Oak', slug: 'oak', language: 'en', status: 'active' },
    })
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const res = await middleware(makeReq('http://oak.example.com/dashboard'))

    expect(mocks.fromMock).toHaveBeenCalledWith('tenants')
    expect(mocks.redisSet).toHaveBeenCalledWith(
      'subdomain:oak',
      expect.stringContaining('"slug":"oak"'),
      'EX',
      86400
    )
    expect(res.headers.get('x-middleware-rewrite')).toContain('/oak/dashboard')
  })

  it('falls back to Supabase when redis returns malformed JSON', async () => {
    mocks.redisGet.mockResolvedValue('not-json{{')
    setupServiceClient({
      tenantRow: { id: 't-3', name: 'Vine', slug: 'vine', language: 'en', status: 'active' },
    })
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const res = await middleware(makeReq('http://vine.example.com/dashboard'))

    expect(mocks.fromMock).toHaveBeenCalledWith('tenants')
    expect(res.headers.get('x-middleware-rewrite')).toContain('/vine/dashboard')
  })

  it('falls back to Supabase when redis throws', async () => {
    mocks.redisGet.mockRejectedValue(new Error('redis down'))
    setupServiceClient({
      tenantRow: { id: 't-4', name: 'Birch', slug: 'birch', language: 'en', status: 'active' },
    })
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const res = await middleware(makeReq('http://birch.example.com/dashboard'))

    expect(mocks.fromMock).toHaveBeenCalledWith('tenants')
    expect(res.headers.get('x-middleware-rewrite')).toContain('/birch/dashboard')
  })

  it('returns 404 when no tenant matches the subdomain', async () => {
    mocks.redisGet.mockResolvedValue(null)
    setupServiceClient({ tenantRow: null })

    const res = await middleware(makeReq('http://ghost.example.com/'))

    expect(res.status).toBe(404)
  })
})

describe('middleware — suspended / archived gate', () => {
  it('returns a 403 HTML page for suspended tenants', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify({ ...ACTIVE_TENANT, status: 'suspended' }))

    const res = await middleware(makeReq('http://pierpont.example.com/dashboard'))

    expect(res.status).toBe(403)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('temporarily suspended')
  })

  it('returns a 403 HTML page for archived tenants', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify({ ...ACTIVE_TENANT, status: 'archived' }))

    const res = await middleware(makeReq('http://pierpont.example.com/dashboard'))

    expect(res.status).toBe(403)
    expect(await res.text()).toContain('no longer active')
  })
})

describe('middleware — auth gate', () => {
  it('redirects unauthenticated tenant requests to the platform sign-in with slug + redirectTo', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(ACTIVE_TENANT))
    mocks.authGetUser.mockResolvedValue({ data: { user: null } })

    const res = await middleware(makeReq('http://pierpont.example.com/dashboard'))

    expect(res.status).toBe(307)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.host).toBe('example.com')
    expect(loc.pathname).toBe('/auth/sign-in')
    expect(loc.searchParams.get('slug')).toBe('pierpont')
    expect(loc.searchParams.get('redirectTo')).toBe('/dashboard')
  })

  it('rewrites /pwa/* paths even when unauthenticated', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(ACTIVE_TENANT))
    mocks.authGetUser.mockResolvedValue({ data: { user: null } })

    const res = await middleware(makeReq('http://pierpont.example.com/pwa/manifest.json'))

    expect(res.headers.get('x-middleware-rewrite')).toContain('/pierpont/pwa/manifest.json')
  })

  it('redirects tenant /auth/sign-in to the platform sign-in', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(ACTIVE_TENANT))
    mocks.authGetUser.mockResolvedValue({ data: { user: null } })

    const res = await middleware(makeReq('http://pierpont.example.com/auth/sign-in'))

    expect(res.status).toBe(307)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.host).toBe('example.com')
    expect(loc.pathname).toBe('/auth/sign-in')
    expect(loc.searchParams.get('slug')).toBe('pierpont')
  })
})

describe('middleware — superadmin role cookie injection', () => {
  it('sets the role cookie when the user is a superadmin and ?superadmin_as=editor is provided', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(ACTIVE_TENANT))
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'sa-1' } } })
    setupServiceClient({ tenantRow: null, superadminRow: { id: 'sa-row-1' } })

    const res = await middleware(
      makeReq('http://pierpont.example.com/dashboard?superadmin_as=editor')
    )

    const cookie = res.cookies.get('courseday_superadmin_role')
    expect(cookie?.value).toBe('sa-1:tenant-1:editor')
  })

  it('does not set the cookie when the user is not a superadmin', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(ACTIVE_TENANT))
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    setupServiceClient({ superadminRow: null })

    const res = await middleware(
      makeReq('http://pierpont.example.com/dashboard?superadmin_as=editor')
    )

    expect(res.cookies.get('courseday_superadmin_role')).toBeUndefined()
  })

  it('ignores invalid role values in superadmin_as', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(ACTIVE_TENANT))
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'sa-1' } } })
    setupServiceClient({ superadminRow: { id: 'sa-row-1' } })

    const res = await middleware(
      makeReq('http://pierpont.example.com/dashboard?superadmin_as=owner')
    )

    expect(res.cookies.get('courseday_superadmin_role')).toBeUndefined()
  })
})

describe('middleware — api routes', () => {
  it('rewrites /api/mutations to inject tenant headers without a path rewrite', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(ACTIVE_TENANT))
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const res = await middleware(makeReq('http://pierpont.example.com/api/mutations/foo'))

    // For api routes the middleware uses NextResponse.next() (no rewrite).
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})
