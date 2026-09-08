# courseday — project register

> Last `/project` run: 2026-09-08 · commit `1c0d54f`
> Maintained by `/project`. Amend by re-running it, not by hand-editing during a session.

## What this is

A multi-tenant daily-operations platform for golf clubs — *"run your golf club's day in
one view."* Reception, restaurant, pro shop and floor staff all work from one shared page:
the day's programme, restaurant reservations, breakfast services, live covers and staff
shifts, each role seeing the same day. Every club is a tenant with its own subdomain, team,
branding and language. Built out hard across April–May 2026, deployed at
**courseday.golf**, and parked since — this register is written at adoption, from the repo
and Jamie's ruling, not from a live build.

## Intent

- **For whom** — the staff of a golf club, across roles that do not otherwise share a
  system: reception (who own the day), restaurant, pro shop, floor staff. Two membership
  roles exist in the product — `editor` (writes the day) and `viewer` (reads it) — plus a
  platform superadmin who provisions tenants and toggles features.
- **The job** — put the whole of one club's day on one page, and keep every role looking at
  the same one. Where the two compete, **the shared day view wins over per-role tooling**:
  `my-schedule` and notifications are conveniences hung off the day, not rival surfaces.
- **Done looks like** — *not yet established.* No v1 sentence was ever recorded, and the
  repo was parked before one was tested against a real club. Adoption deliberately does not
  invent one; see Open questions.
- **Explicitly not** — a tee-sheet or booking engine (it reads the day a club already
  runs, it does not sell tee times) and not a POS. Neither was ever built, and nothing in
  the repo reaches for either.

## Business logic

Recorded from the code and `AGENTS.md` at adoption — these are the rules the build settled
on, not fresh decisions.

- **A tenant is the unit of isolation.** Every record hangs off a tenant; Supabase RLS
  enforces it. A club never sees another club's day.
- **The subdomain resolves the tenant, and the URL never shows it.** `middleware.ts` reads
  the host, resolves the slug through an Upstash Redis cache (`subdomain:{slug}` →
  `TenantRedisData`), and internally rewrites to `app/[tenant]/`. Redis is written whenever
  a tenant is created, updated or deleted — the cache is authoritative for routing, and
  Supabase for everything else.
- **`editor` writes the day, `viewer` reads it.** Mutations are server actions under
  `app/actions/`; viewers get `ViewerDayDashboard`.
- **A feature that is off is off everywhere.** Six per-tenant feature flags
  (`reservations`, `breakfast_config`, `weather_reporting`, `checklists`, `staff_schedule`,
  `daily_brief`) gate the UI, the server page's queries, *and* the mutating server actions;
  the morning-brief cron skips a tenant whose `daily_brief` is off. **A missing flag row
  means enabled** — the default is on, and the row is the exception.
- **Read actions are not flag-guarded**, deliberately: harmless, and admin may need them.
- **Activities, day notes, notifications, templates, feedback, branding, members,
  onboarding, PWA, realtime and language are always on** — no flag, they are the core.
- **The club's language is the tenant's, not the browser's.** `tenants.language` is passed
  down by middleware as `x-tenant-language`; `next-intl` serves en/fr/de/es from
  `messages/`, split into `Platform.*` (root domain) and `Tenant.*` (tenant app).
- **Migrations are files and CI applies them.** 55 migrations in `supabase/migrations/`,
  `NNNNN_description.sql`; production is deployed by the migration workflow on merge to
  `main`, never by hand or through MCP tooling.

## Features

| Feature | State | Tickets |
|---|---|---|
| Daily programme — activities, tags, recurrence | shipped | — |
| Restaurant reservations | shipped | — flagged `reservations` |
| Breakfast services | shipped | — flagged `breakfast_config` |
| Live covers + day summaries | shipped | — |
| Multi-tenant subdomains, branding, onboarding | shipped | — |
| Membership + roles (`editor` / `viewer`) | shipped | — |
| Staff schedule + shifts, clock in/out | shipped | — flagged `staff_schedule` |
| Checklists | shipped | — flagged `checklists` |
| Weather on the day view | shipped | — flagged `weather_reporting` |
| AI daily brief + morning email cron | shipped | — flagged `daily_brief` |
| Quick-add (AI text parsing) | shipped | — |
| Notifications, PWA, realtime | shipped | — |
| i18n — en, fr, de, es | shipped | — |
| Superadmin dashboard + feature flags | shipped | — no auth on `/admin` at park time |
| Tee-sheet / booking engine | out | — never in scope; it reads the day, it does not sell tee times |
| POS / payments | out | — never in scope |

Every row is `shipped` and no row points at a ticket, because **the repo is dormant and
carries no open stubs** — that is the correct state for a parked repo, not an omission. The
first stub cut here drops `.icm/dormant` in the same commit.

## Constraints

- **Technical** — Next.js 15 App Router + React 19; Supabase is the source of truth and RLS
  is the isolation boundary; Upstash Redis is on the request path for every tenant request,
  so a Redis outage is a routing outage. E2E (Playwright) needs a full local stack and is
  excluded from CI.
- **Accessibility** — *not yet established.* No bar was ever stated; the button/menu
  primitives in `components/ui/` are enforced by ESLint for consistency, which is not the
  same thing.
- **Legal / data** — staff and guest personal data (names, party sizes, shifts) sit in
  Supabase under RLS. No DPA, retention policy or sector rule was recorded in the repo.
- **Commercial** — *not yet established.* No client, deadline or budget is recorded here;
  `courseday.golf` is owned and the production deployment stands.

## Decisions

| ID | Decision | Date | Supersedes |
|---|---|---|---|
| D1 | Multi-tenant by subdomain, resolved through a Redis cache and internally rewritten — the tenant never appears in the URL | 2026-04 | — |
| D2 | Supabase + RLS is the isolation boundary, not application-level filtering | 2026-04 | — |
| D3 | Six features are per-tenant flags, enforced at UI, page-query and mutation layers; a missing row means **enabled** | 2026-04 | — |
| D4 | Four languages (en/fr/de/es), driven by the tenant's setting rather than the browser's | 2026-05 | supersedes the EN/FR-only scope of `T-08` |
| D5 | The root `TICKETS.md` backlog is deleted; planning is `.icm/intake/` | 2026-04-05 (`422cf40`) · re-stated at adoption | the `TICKETS.md` backlog |
| D6 | CI is the only place `build`/`lint`/`test`/`typecheck` runs; the ban is enforced in `.claude/settings.json` and `opencode.jsonc`, not just written down | 2026-04 | — |
| D7 | **courseday is dormant, not shelved** — built, deployed, live domain, no work planned. Adopted with the full baseline and marked `.icm/dormant` rather than dressed as active | 2026-09-08 | — |

## Open questions

- **What does v1 actually mean here — has any real golf club run a day on this?** Nothing
  in the repo names a pilot club, and `Done looks like` cannot be written until it is
  answered. *Answerable by: Jamie. Blocks: any decision to wake the repo, and every
  priority call inside it.*
- **Is courseday the productisation of `pierpont`, and does that relationship carry
  obligations?** Jamie's adoption ruling is that pierpont is superseded by courseday. What
  is unrecorded is whether Pierpont Golf Course itself is expected to land on courseday.
  *Answerable by: Jamie. Blocks: whether waking this repo has a first customer.*
- **`/admin` had no auth at park time** (the old `T-16`). A superadmin dashboard that
  toggles other tenants' features is not a surface to wake unprotected. *Answerable by:
  Jamie. Blocks: waking the repo — this becomes the first stub if it does.*
- **What accessibility bar is this built to?** Never stated. *Answerable by: Jamie. Blocks:
  nothing while dormant; inherited by every ticket once awake.*

## Run log

| Date | Commit | What changed |
|---|---|---|
| 2026-09-08 | `1c0d54f` | First run — adoption. Register written from the repo and Jamie's dormancy ruling; no interrogation of a live build. Layer 0 moved `CLAUDE.md` → `AGENTS.md` + importer, stale `TICKETS.md` routing corrected; baseline and rails seeded; canonical hooks registered in the repo's own `settings.json`; marked dormant. 7 decisions recorded, 4 open questions, 0 tickets cut (correct for a dormant repo). |
