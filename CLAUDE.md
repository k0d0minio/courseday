# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server with Turbopack on localhost:3000
pnpm build      # Production build
pnpm start      # Start production server
```

No test runner is configured.

## Environment Variables

Create `.env.local` with:

```
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_redis_token
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000   # or your production domain
```

## Architecture

This is a **multi-tenant golf course operations platform** built on the Vercel Platforms Starter Kit. Each tenant gets their own subdomain.

### Subdomain Routing

`middleware.ts` intercepts all requests and determines whether the host is the root domain or a tenant subdomain. Subdomain requests to `/` are internally rewritten to `/s/[subdomain]` — that route never appears in the browser URL. The middleware handles three environments:

- **Local**: `tenant.localhost:3000`
- **Production**: `tenant.yourdomain.com`
- **Vercel preview**: `tenant---branch.vercel.app`

Admin routes (`/admin`) are blocked from subdomain access and redirected to `/`.

### Data Layer

**Upstash Redis** (`lib/redis.ts`) stores tenant records under the key pattern `subdomain:{name}`. Each value is `{ emoji: string, createdAt: number }`. The `lib/subdomains.ts` helpers sanitize subdomain input (lowercase alphanumeric + hyphens) before all Redis reads/writes.

### Route Structure

| Route | Purpose |
|-------|---------|
| `/` | Landing page with subdomain creation form |
| `/admin` | Admin dashboard — lists and deletes all tenants (no auth yet) |
| `/s/[subdomain]` | Internal rewrite target for tenant subdomain pages |
| `/not-found.tsx` | Custom 404 |

### Server Actions

`app/actions.ts` contains two Server Actions:
- `createSubdomainAction` — validates, sanitizes, stores in Redis, then redirects to the new subdomain
- `deleteSubdomainAction` — deletes from Redis, revalidates `/admin`

### UI Components

`components/ui/` contains shadcn/ui primitives (Button, Card, Dialog, Input, Label, Popover) plus a custom `emoji-picker.tsx` built on `frimousse`. `lib/utils.ts` exports the standard `cn()` helper plus `rootDomain` and `protocol` constants derived from env vars.

### Planned Work (TICKETS.md)

The `TICKETS.md` file contains the full backlog of AI-executable tickets. Follow its **How Claude Code should use this file** section — including **Supabase migrations**: implement SQL in `supabase/migrations/`, update seeds when needed, and verify with the Supabase CLI locally; do not defer migration work to the user when the toolchain is available.
