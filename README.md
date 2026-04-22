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
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_redis_token
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
OPENWEATHER_API_KEY=your_openweather_api_key
```

### Run

```bash
pnpm dev        # http://localhost:3000
pnpm build
pnpm start
```

## Routing model

- Root domain (`localhost:3000` / `yourdomain.com`) — marketing landing page, `/new`, `/auth`, `/demo`, `/admin`.
- Subdomain (`{slug}.yourdomain.com`) — the tenant app: monthly calendar, day view, tenant settings.
- `middleware.ts` resolves subdomains via Redis and internally rewrites to `app/[tenant]/...`. The URL in the browser never changes.

## Architecture

See [CLAUDE.md](CLAUDE.md) for the full domain model, data layer, and route map.

## Deployment

Deploy on Vercel. Add the root domain and a wildcard DNS record (`*.yourdomain.com`) so every tenant subdomain resolves.
