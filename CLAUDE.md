# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Personality

Caveman mode is always enabled in this project. Follow all rules from the `caveman-mode` skill for every response.

## Commands

```bash
pnpm dev        # Start dev server with Turbopack on localhost:3000
pnpm build      # Production build
pnpm start      # Start production server
pnpm test       # Unit tests in watch mode (Vitest)
pnpm test:run   # Unit tests single run
pnpm test:coverage  # Unit tests with coverage report
pnpm test:e2e   # E2E tests (Playwright — requires local Supabase + dev server)
pnpm test:e2e:ui    # Playwright UI mode
pnpm lint       # ESLint via next lint
pnpm lint:fix   # Auto-fix lint errors
pnpm format     # Prettier format all files
pnpm format:check   # Check formatting without writing
pnpm db:types   # Re-generate types/supabase.ts from linked Supabase project
```

## Code Quality

Pre-commit hook (husky + lint-staged) runs automatically on `git commit`. It formats staged files with Prettier and lints with ESLint (`--max-warnings=0` — warnings become errors at commit time).

ESLint config: `eslint.config.mjs` — extends `next/core-web-vitals`, adds TypeScript-aware rules. `types/supabase.ts` is excluded (generated file).

Prettier config: `.prettierrc` — no semis, single quotes, 100-char width, Tailwind class sorting.

## Testing

### Unit Tests (Vitest)

- Location: `tests/lib/`, `tests/actions/`, `tests/quick-add-normalize.test.ts`, `lib/*.test.ts`
- No running DB required — all tests mock Supabase, Redis, and Next.js internals
- Mock pattern: `vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }))`
- Setup file: `tests/setup.ts` (imports `@testing-library/jest-dom`)
- Config: `vitest.config.ts` — jsdom environment, globals enabled, alias `@/` → root

### E2E Tests (Playwright)

- Location: `tests/e2e/` — specs: `auth.spec.ts`, `day.spec.ts`, `routing.spec.ts`, `settings.spec.ts`
- Requires: local Supabase running (`supabase start`), dev server running (`pnpm dev`)
- Uses Supabase service role key to create/teardown test tenants — never run against production
- E2E is excluded from CI (needs full local stack); run locally before merging auth/routing changes

## Database Migrations

- Location: `supabase/migrations/` — 34 migrations, numbered `00001`–`00034`
- Naming convention: `NNNNN_description_words.sql` (5 zero-padded digits, lowercase, underscores)
- Create new: `supabase migration new description_words` (auto-generates correct filename)
- Apply locally: `supabase db reset` (replays all migrations + seed.sql)
- Apply to production: automatically via CI on merge to `main` (see migration workflow)
- After schema changes: run `pnpm db:types` to regenerate `types/supabase.ts`
- CI validates naming + no duplicates on PRs; pushes to prod on merge to main

## CI/CD

GitHub Actions (`.github/workflows/`):

| Job          | Trigger                          | What it does                                |
| ------------ | -------------------------------- | ------------------------------------------- |
| `typecheck`  | every PR + push to main          | `tsc --noEmit`                              |
| `lint`       | every PR + push to main          | `next lint` + `prettier --check`            |
| `unit-tests` | every PR + push to main          | `vitest run` (dummy env vars, no DB)        |
| `build`      | every PR + push to main          | `next build` (after typecheck + unit-tests) |
| `validate`   | PR or push to main (migrations)  | validates naming + no duplicates            |
| `deploy`     | push to main touching migrations | `supabase db push` to production            |

Vercel auto-deploys on every push via Git integration (preview for branches, production for `main`).

**Required GitHub Secrets:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`
Set at: `github.com/k0d0minio/courseday/settings/secrets/actions`

## Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
REDIS_URL=your_redis_connection_url
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

| Route                      | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `/`                        | Platform landing page                               |
| `/new`                     | Create a new venue (tenant sign-up)                 |
| `/auth/sign-in`            | Platform-level sign-in                              |
| `/admin`                   | Superadmin dashboard (no auth yet — see T-16)       |
| `/[tenant]/`               | Tenant home — monthly calendar + agenda view        |
| `/[tenant]/day/[date]`     | Day view — activities, reservations, breakfasts     |
| `/[tenant]/auth/sign-in`   | Tenant-scoped sign-in                               |
| `/[tenant]/auth/sign-up`   | Tenant-scoped sign-up                               |
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
- `auth-confirm.ts` — email confirmation flow
- `agenda.ts` — `getDaySummaries` (aggregated counts for calendar/agenda views)
- `days.ts` — day record management
- `day-notes.ts` — day notes CRUD
- `day-view-receipts.ts` — handover receipts + soft deletes
- `checklists.ts` — checklist template CRUD with nested items
- `shifts.ts` — staff shift CRUD
- `staff.ts` — staff member CRUD
- `staff-role.ts` — staff role CRUD
- `schedule-templates.ts` — copy-day template management
- `weather.ts` — weather data fetch
- `daily-brief.ts` — LLM daily brief generation
- `quick-add.ts` — AI text parsing for quick activity creation
- `feature-flags.ts` — per-tenant feature flag toggles (superadmin)
- `feature-requests.ts` — user feedback submission
- `memberships.ts` — team membership management
- `notifications.ts` — user notification management
- `courses.ts` — golf course data

### UI Components

`components/ui/` contains shadcn/ui primitives.

**Button conventions** — `components/ui/button.tsx` is the only button primitive in product UI. Raw `<button>` elements outside `components/ui/` are forbidden by ESLint (`no-restricted-syntax`); whitelist a bespoke surface via `// eslint-disable-next-line no-restricted-syntax` with a one-line reason. Never override `h-*`, `min-h-*`, `px-*`, `py-*`, `text-xs`, or `text-[…]` on `Button` via `className` — extend the variant config instead. Lint enforces this.

| Surface                               | size                               | variant                      |
| ------------------------------------- | ---------------------------------- | ---------------------------- |
| Marketing landing CTA (root domain)   | `lg`                               | `default` / `outline`        |
| CTA on brand-coloured background      | `lg`                               | `onBrand` / `onBrandOutline` |
| App / auth / onboarding form submit   | `default` + `w-full`               | `default`                    |
| Dialog/Drawer footer cancel           | `default`                          | `outline`                    |
| Card "add" / row action               | `sm` or `xs`                       | `default` / `outline`        |
| Toolbar / popover trigger             | `sm`                               | `outline` / `ghost`          |
| Icon-only — large                     | `icon` (size-9)                    | `ghost` / `outline`          |
| Icon-only — small                     | `iconSm` (size-8)                  | `ghost`                      |
| Icon-only — extra small               | `iconXs` / `iconXxs` / `iconMicro` | `ghost`                      |
| Icon-only — touch (mobile)            | `iconResponsive`                   | `ghost`                      |
| Tag/multi-select trigger (multi-line) | `formField`                        | `outline`                    |
| Inline disclosure / link              | `inline`                           | `ghost` / `link`             |

`components/ui/menu-item.tsx` is the canonical primitive for popover/dropdown menu items. Use it (or `<MenuItem asChild><Link…/></MenuItem>`) instead of styling raw `<button>` or `<Link>` elements with menu-row classes.

Key application components:

- `HomeClient` — calendar + agenda view toggle with localStorage preference
- `AgendaView` — scrollable upcoming-days list
- `CalendarDaySidebar` — sidebar shown when a calendar day is selected
- `DayViewClient` — editor/viewer day page shell
- `ActivityCard`, `ReservationCard`, `BreakfastCard` — item display with edit/delete
- `ActivityForm`, `ReservationForm`, `BreakfastForm` — Dialog/Drawer forms
- `TableBreakdownBuilder`, `TableBreakdownDisplay` — table seating layout editor/display
- `ViewerDayDashboard` — read-only day view for non-editor members

### i18n

`next-intl` is used for all user-visible strings. Translation files are at `messages/en.json`, `messages/fr.json`, `messages/de.json`, and `messages/es.json`. Tenant language is stored in the `tenants.language` column and passed via the `x-tenant-language` request header by middleware. Namespace structure: `Platform.*` (root domain) and `Tenant.*` (tenant app).

### Feature Flags

Per-tenant feature toggles controlled by superadmin via `app/admin/dashboard.tsx`. Source of truth: `lib/feature-flags.ts` (KNOWN_FLAGS, labels, descriptions). Stored in `feature_flags` table; missing rows default to **enabled**.

| Flag Key            | Label             | What it gates                                                                                                                                                            | Default |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `reservations`      | Reservations      | Reservation CRUD, reservation counts/pips on calendar/agenda/sidebar, reservation sections on day views, DaySummaryCard column. Server actions guarded.                  | true    |
| `breakfast_config`  | Breakfast Config  | Breakfast CRUD, breakfast counts/pips on calendar/agenda/sidebar, breakfast sections on day views, DaySummaryCard column. Server actions guarded.                        | true    |
| `weather_reporting` | Weather Reporting | WeatherCard on day views, weather data fetch on day page.                                                                                                                | true    |
| `checklists`        | Checklists        | Checklists settings page, settings dropdown/mobile-nav/command palette link.                                                                                             | true    |
| `staff_schedule`    | Staff Schedule    | Staff schedule section on day views, staff settings page, shift data fetch, copy-day shift option.                                                                       | true    |
| `daily_brief`       | Daily Brief       | DailyBriefCard on day views (editor + viewer), `generateDailyBrief` server action, morning brief cron email (skips tenant when off), daily brief data fetch on day page. | true    |

**Always-on modules** (no flag, core functionality):
Activities, day notes, notifications, templates, feedback, branding, members, onboarding, PWA, realtime, language settings.

**Enforcement layers:**

- **UI**: Components use `useFeatureFlag()` from `lib/feature-flags-context.tsx`. Hidden from settings-dropdown, mobile-nav, command-palette, calendar pips, agenda counts, day view sections, DaySummaryCard columns.
- **Server pages**: `app/[tenant]/page.tsx` and `app/[tenant]/day/[date]/page.tsx` skip DB queries for disabled features.
- **Server actions**: Mutation actions (`create*`, `update*`, `delete*`) return error when feature is disabled. Read actions are not guarded (harmless, may be needed for admin).
- **Cron**: Morning brief cron skips tenants with `daily_brief` off.

### Planned Work (TICKETS.md)

The `TICKETS.md` file contains the full backlog of AI-executable tickets. Follow its **How Claude Code should use this file** section — including **Supabase migrations**: implement SQL in `supabase/migrations/`, update seeds when needed, and verify with the Supabase CLI locally; do not defer migration work to the user when the toolchain is available.
