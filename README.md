# Courseday

**Run your golf club's day in one view.**

Courseday is the daily operations platform for golf clubs. Reception, restaurant, pro shop, and floor staff all work from one shared page — the day's programme, reservations, breakfasts, and covers, visible to every role.

## What it does

- **Daily programme** — tee times, group events, and activities with times, covers, and points of contact.
- **Restaurant reservations** — party sizes, time slots, and table layouts.
- **Breakfast service** — hotel breakfast groups and service windows.
- **Live covers** — totals update as reception edits.
- **Per-club workspace** — each club gets its own subdomain, team, and branding.
- **Bilingual** — English and French built in.

## Tech stack

- [Next.js 15](https://nextjs.org/) App Router + [React 19](https://react.dev/)
- [Supabase](https://supabase.com/) (Postgres, Auth, RLS) — source of truth for tenants, memberships, days, activities, reservations, breakfasts.
- [Upstash Redis](https://upstash.com/) — tenant routing cache (`subdomain:{slug}` → tenant data).
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) for the design system.
- [next-intl](https://next-intl-docs.vercel.app/) for localization.

## Getting started

### Prerequisites

- Node.js 20+
- pnpm
- Supabase project
- Upstash Redis

### Install

```bash
pnpm install
```

### Environment

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
REDIS_URL=your_redis_connection_url
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
OPENWEATHER_API_KEY=your_openweather_api_key
```

`REDIS_URL` is a single connection string consumed by `ioredis` (e.g. `rediss://default:<token>@<host>:<port>` for Upstash, or `redis://localhost:6379` for a local instance). The legacy `KV_REST_API_URL` / `KV_REST_API_TOKEN` REST variables are not used.

### Run

```bash
pnpm dev        # http://localhost:3000
pnpm build
pnpm start
```

### Running E2E tests locally

End-to-end tests live in `tests/e2e/` and are excluded from CI — they need a full local stack.

```bash
supabase start            # boots local Postgres, Auth, Storage
pnpm dev                  # in another shell, on http://localhost:3000
pnpm test:e2e             # or pnpm test:e2e:ui for the Playwright UI
```

The suite uses the Supabase **service role key** to provision and tear down throwaway tenants, so it must only ever be pointed at the local Supabase instance — never at production. `.env.local` should set `SUPABASE_SERVICE_ROLE_KEY` to the local service key printed by `supabase start`.

### Troubleshooting

- **Middleware fails with a Redis error** — `REDIS_URL` is required even in dev. The middleware resolves tenants from Redis on every request; without a reachable Redis the app cannot boot.
- **`supabase` CLI not found** — install it first (`brew install supabase/tap/supabase` or see the [Supabase docs](https://supabase.com/docs/guides/local-development)).
- **Node / pnpm version mismatch** — the project requires Node.js 20+ and pnpm 10+. Check with `node -v` and `pnpm -v`.

## Routing model

- Root domain (`localhost:3000` / `yourdomain.com`) — marketing landing page, `/new`, `/auth`, `/demo`, `/admin`.
- Subdomain (`{slug}.yourdomain.com`) — the tenant app: monthly calendar, day view, tenant settings.
- `middleware.ts` resolves subdomains via Redis and internally rewrites to `app/[tenant]/...`. The URL in the browser never changes.

## Architecture

See [CLAUDE.md](CLAUDE.md) for the full domain model, data layer, and route map.

## Deployment

Deploy on Vercel. Add the root domain and a wildcard DNS record (`*.yourdomain.com`) so every tenant subdomain resolves.
