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

- Location: all unit tests live under `tests/`, mirroring source paths (e.g. `lib/foo.ts` → `tests/lib/foo.test.ts`, `app/actions/bar.ts` → `tests/actions/bar.test.ts`, `middleware.ts` → `tests/middleware.test.ts`). Do not colocate `*.test.ts` next to source files.
- No running DB required — all tests mock Supabase, Redis, and Next.js internals
- Mock pattern: `vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }))`
- Setup file: `tests/setup.ts` (imports `@testing-library/jest-dom`)
- Config: `vitest.config.ts` — jsdom environment, globals enabled, alias `@/` → root

### E2E Tests (Playwright)

- Location: `tests/e2e/` — specs: `auth.spec.ts`, `day.spec.ts`, `routing.spec.ts`, `settings.spec.ts`
- Requires: local Supabase running (`supabase start`), dev server running (`pnpm dev`)
- Uses Supabase service role key to create/teardown test tenants — never run against production
- E2E is excluded from CI (needs full local stack); run locally before merging auth/routing changes
- Failure artifacts: `playwright.config.ts` enables `video: 'retain-on-failure'` and `screenshot: 'only-on-failure'` — videos + screenshots land in `test-results/` for failed runs only.

#### `data-testid` convention

E2E selectors prefer `getByTestId` over text/role-based selectors for any element that is content-driven (translated, copy-edited, or user-data). Role-based selectors stay for genuinely accessible-named elements (page headings, persistent landmarks).

Naming — kebab-case, scope-prefixed:

- Cards: `<entity>-card`, `<entity>-card-edit`, `<entity>-card-delete`, `<entity>-card-delete-confirm` (e.g. `activity-card`, `activity-card-edit`).
- Forms: `<entity>-form`, `<entity>-form-<field>`, `<entity>-form-save` (e.g. `activity-form-title`, `reservation-form-guest-name`).
- Page-level add buttons: `add-<entity>` (e.g. `add-activity`, `add-reservation`, `add-breakfast`).
- Auth: `sign-in-form`, `sign-in-email`, `sign-in-password`, `sign-in-use-password`, `sign-in-submit`, `sign-out`.

Post-mutation assertions: always wrap with an explicit timeout — `expect(...).toBeVisible({ timeout: 5000 })` or `expect(...).toHaveCount(0, { timeout: 5000 })` — to absorb server-action latency.

Per-test dates: never share a `TODAY` across tests. Compute `format(addDays(new Date(), N), 'yyyy-MM-dd')` per `describe` block so parallel workers (if `workers` ever increases) don't collide.

## Database Migrations

- Location: `supabase/migrations/`
- Naming convention: `NNNNN_description_words.sql` (5 zero-padded digits, lowercase, underscores)
- **Always write migration files directly** — do NOT apply via Supabase MCP tools. CI deploys them automatically.
- **Before creating a migration file, run `ls supabase/migrations/ | sort | tail -1` to get the current highest number**, then use the next one. Multiple agents may be running in parallel — never assume the number from your context is still current.
- Apply locally: `supabase db reset` (replays all migrations + seed.sql)
- Apply to production: automatically via CI on merge to `main` (see migration workflow)
- After schema changes: run `pnpm db:types` to regenerate `types/supabase.ts`
- CI validates naming + no duplicates on PRs; pushes to prod on merge to main

## Agent Workflow Rules — TOKEN BUDGET CRITICAL

These rules override any default Claude Code behavior. Violating them wastes the user's usage limits.

### Absolute bans — never run these locally

**You are a code-editing agent. You are NOT a test runner, build runner, or dev server operator.** GitHub Actions CI is the source of truth for all verification. Your job ends at `git push`.

**Never run** any of the following, under any circumstance — including when CI fails, even when CI failure messages explicitly cite test/lint/type/build errors:

- `pnpm test`, `pnpm test:run`, `pnpm test:coverage`, `pnpm test:e2e`, `pnpm test:e2e:ui`, `vitest`, `playwright`, `npx vitest`, `npx playwright`
- `pnpm build`, `next build`, `pnpm start`
- `pnpm lint`, `pnpm lint:fix`, `next lint`, `eslint`
- `pnpm format`, `pnpm format:check`, `prettier`
- `tsc`, `npx tsc`, `pnpm tsc`
- `pnpm dev`, `next dev` (the user runs the dev server themselves; ask them to verify UI changes and report back)
- `supabase start`, `supabase db reset` (user-managed; CI handles prod migrations)

**When CI fails:** read the failure log via `mcp__github__pull_request_read` or equivalent, reason about the cause, edit the code, push again. Do NOT reproduce locally.

**Pre-commit hook already runs** Prettier + ESLint on staged files via husky. That is the only verification that runs in your sessions, and it runs automatically — you don't invoke it.

### Read budget — never read these files

These files burn thousands of tokens with near-zero useful signal. Do not Read them; if you need a fact from them, use `grep` for the specific symbol:

- `types/supabase.ts` (generated, multi-thousand lines — `grep` for table/column names instead)
- `pnpm-lock.yaml`, `package-lock.json`
- `messages/en.json`, `messages/fr.json`, `messages/de.json`, `messages/es.json` — i18n files; `grep` for the key, do not full-read
- Anything in `coverage/`, `.next/`, `node_modules/`, `playwright-report/`, `test-results/`

### Context discipline

- **Never re-read a file you just edited.** Edit/Write errors out on failure; the harness tracks state. Re-reading is pure waste.
- **Multi-file searches → Explore subagent.** If a question requires touching more than 2 files to answer, spawn `Agent` with `subagent_type: "Explore"`. Do not flood the main context with `grep`/`Read` results.
- **Cap end-of-turn summary at 1 sentence.** State what changed and stop. No "next steps" sections, no bullet lists, no recap of the conversation.
- **No TodoWrite for trivial tasks.** Use it only for genuinely multi-step work (3+ independent steps). A single edit + commit + push does not need a todo list.
- **No `git status` after a commit.** Commits either succeed or the hook blocks them; the success line in the commit output is sufficient.

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
- `checklists.ts` — checklist template CRUD with nested items
- `shifts.ts` — staff shift CRUD
- `staff.ts` — staff member CRUD
- `staff-role.ts` — staff role CRUD
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
| `staff_schedule`    | Staff Schedule    | Staff schedule section on day views, staff settings page, shift data fetch.                                                                                              | true    |
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
