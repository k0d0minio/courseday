# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Personality

Caveman mode is always enabled in this project. Follow all rules from the `caveman-mode` skill for every response.

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_redis_token
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000   # or your production domain
OPENWEATHER_API_KEY=your_openweather_api_key   # used by /api/geocode for city search in branding settings
CRON_SECRET=long_random_string                  # Vercel Cron: Authorization: Bearer for /api/cron/morning-brief
RESEND_API_KEY=...                              # morning brief + demo emails; RESEND_FROM_EMAIL optional
AI_GATEWAY_API_KEY=...                          # LLM daily brief (editor button + morning email)
```


## Architecture

This is a **multi-tenant golf course operations platform**. Each tenant (venue) gets its own subdomain. The platform manages daily activities, restaurant reservations, and breakfast configurations for golf venues.

### Domain Model

- **Tenant** — a venue (golf club). Has a `slug` (subdomain), `name`, `language`.
- **Activity** — a scheduled event for the day (golf round, group activity, etc.). Has title, tags, time, expected covers, venue type, point of contact.
- **Reservation** — a restaurant reservation. Has guest name, party size, time, table layout.
- **BreakfastConfiguration** — a breakfast service group. Has group name, guest count, service time, table layout.
- **Day** — a date record linking all items for a tenant on a given date.
- **Membership** — links users to tenants with a role (`editor` or `viewer`).

### Subdomain Routing

`middleware.ts` intercepts all requests and determines whether the host is the root domain or a tenant subdomain. Tenant requests are resolved via **Upstash Redis** (`subdomain:{slug}` keys → `TenantRedisData`) and internally rewritten to `/{slug}{pathname}` — that is, `app/[tenant]/` routes. The URL never changes in the browser.

The middleware handles three environments:
- **Local**: `tenant.localhost:3000`
- **Production**: `tenant.yourdomain.com`
- **Vercel preview**: `tenant---branch.vercel.app`

Admin routes (`/admin`) are on the root domain only.

### Data Layer

- **Supabase** is the source of truth for all application data (tenants, memberships, days, activities, reservations, breakfast configurations, POCs, venue types, activity tags). Row-Level Security enforces tenant isolation.
- **Upstash Redis** caches tenant routing data (`subdomain:{slug}` → `TenantRedisData`) to avoid a Supabase query on every request. Redis is updated whenever a tenant is created, updated, or deleted.
- `lib/supabase-server.ts` exports `createSupabaseServerClient()` (uses auth session cookies) and `createSupabaseServiceClient()` (service role, bypasses RLS).

### Route Structure

| Route | Purpose |
|-------|---------|
| `/` | Platform landing page |
| `/new` | Create a new venue (tenant sign-up) |
| `/auth/sign-in` | Platform-level sign-in |
| `/admin` | Superadmin dashboard (no auth yet — see T-16) |
| `/[tenant]/` | Tenant home — monthly calendar + agenda view |
| `/[tenant]/day/[date]` | Day view — activities, reservations, breakfasts |
| `/[tenant]/auth/sign-in` | Tenant-scoped sign-in |
| `/[tenant]/auth/sign-up` | Tenant-scoped sign-up |
| `/[tenant]/admin/settings` | Tenant settings (POCs, venue types, tags, language) |

### Server Actions

All server actions live under `app/actions/`:
- `activities.ts` — CRUD for activities and recurrence groups
- `reservations.ts` — CRUD for reservations
- `breakfast.ts` — CRUD for breakfast configurations
- `poc.ts` — CRUD for points of contact
- `venue-type.ts` — CRUD for venue types
- `activity-tags.ts` — CRUD for activity tags
- `tenants.ts` — `createTenant`, `getTenantBySlug`, `updateTenant`, `deleteTenant`
- `auth.ts` — `getUser`, sign-in/sign-up helpers
- `agenda.ts` — `getDaySummaries` (aggregated counts for calendar/agenda views)

### UI Components

`components/ui/` contains shadcn/ui primitives. Key application components:
- `HomeClient` — calendar + agenda view toggle with localStorage preference
- `AgendaView` — scrollable upcoming-days list
- `CalendarDaySidebar` — sidebar shown when a calendar day is selected
- `DayViewClient` — editor/viewer day page shell
- `ActivityCard`, `ReservationCard`, `BreakfastCard` — item display with edit/delete
- `ActivityForm`, `ReservationForm`, `BreakfastForm` — Dialog/Drawer forms
- `TableBreakdownBuilder`, `TableBreakdownDisplay` — table seating layout editor/display
- `ViewerDayDashboard` — read-only day view for non-editor members

### i18n

`next-intl` is used for all user-visible strings. Translation files are at `messages/en.json` and `messages/fr.json`. Tenant language is stored in the `tenants.language` column and passed via the `x-tenant-language` request header by middleware. Namespace structure: `Platform.*` (root domain) and `Tenant.*` (tenant app).

### Feature Flags

Per-tenant feature toggles controlled by superadmin via `app/admin/dashboard.tsx`. Source of truth: `lib/feature-flags.ts` (KNOWN_FLAGS, labels, descriptions). Stored in `feature_flags` table; missing rows default to **enabled**.

| Flag Key | Label | What it gates | Default |
|----------|-------|---------------|---------|
| `reservations` | Reservations | Reservation CRUD, reservation counts/pips on calendar/agenda/sidebar, reservation sections on day views, DaySummaryCard column. Server actions guarded. | true |
| `breakfast_config` | Breakfast Config | Breakfast CRUD, breakfast counts/pips on calendar/agenda/sidebar, breakfast sections on day views, DaySummaryCard column. Server actions guarded. | true |
| `weather_reporting` | Weather Reporting | WeatherCard on day views, weather data fetch on day page. | true |
| `checklists` | Checklists | Checklists settings page, settings dropdown/mobile-nav/command palette link. | true |
| `staff_schedule` | Staff Schedule | Staff schedule section on day views, staff settings page, shift data fetch, copy-day shift option. | true |
| `daily_brief` | Daily Brief | DailyBriefCard on day views (editor + viewer), `generateDailyBrief` server action, morning brief cron email (skips tenant when off), daily brief data fetch on day page. | true |

**Always-on modules** (no flag, core functionality):
Activities, day notes, notifications, templates, feedback, branding, members, onboarding, PWA, realtime, language settings.

**Enforcement layers:**
- **UI**: Components use `useFeatureFlag()` from `lib/feature-flags-context.tsx`. Hidden from settings-dropdown, mobile-nav, command-palette, calendar pips, agenda counts, day view sections, DaySummaryCard columns.
- **Server pages**: `app/[tenant]/page.tsx` and `app/[tenant]/day/[date]/page.tsx` skip DB queries for disabled features.
- **Server actions**: Mutation actions (`create*`, `update*`, `delete*`) return error when feature is disabled. Read actions are not guarded (harmless, may be needed for admin).
- **Cron**: Morning brief cron skips tenants with `daily_brief` off.

### Planned Work (TICKETS.md)

The `TICKETS.md` file contains the full backlog of AI-executable tickets. Follow its **How Claude Code should use this file** section — including **Supabase migrations**: implement SQL in `supabase/migrations/`, update seeds when needed, and verify with the Supabase CLI locally; do not defer migration work to the user when the toolchain is available.
