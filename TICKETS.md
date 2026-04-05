# New tickets (UX, settings, PWA, CI)

This file is a **backlog of AI-executable work** for **Claude Code** (and similar agents). It does **not** replace historical progress in `TICKETS.md`; use this file when working through the items below.

## How Claude Code should use this file

1. **Tickets are strictly sequential by number** (1 → 2 → 3 → …). Each ticket lists its **Depends on** prerequisites; do not start a ticket until those are satisfied (mark completed with `- [x]` on the status line under the ticket title).
2. When the user instructs you to work on the **next available ticket**, pick the **lowest-numbered** incomplete ticket whose dependencies are all completed.
3. **After you finish a ticket** (implementation verified, e.g. `pnpm build`, and any e2e noted in the ticket): change `- [ ]` to `- [x]` in the status line.
4. **Supabase migrations** — same rule as `TICKETS.md`: own schema/RLS in `supabase/migrations/`, verify with Supabase CLI, regenerate types when needed. Do not defer DB work to the user when the toolchain is available.

**Priority key:** P0 = critical/blocking, P1 = high/core feature, P2 = medium/enhancement, P3 = low/polish.

**Dependency overview (this file only)**

- Ticket **1** (P0 tenant update auth) → **2** (nav) → **3** (settings routes) → **4**–**8** (section fixes on top of new IA).
- Tickets **9** (perf), **10** (realtime), **11** (PWA), **13** (superadmin), **14** (CI) can start once their explicit **Depends on** lines are met (several are parallel after **3**).

---

## Ticket 1: P0 — Authorize `updateTenant` before service-role writes

- [ ] **Status:** not completed.

**Priority:** P0  
**Scope:** `app/actions/tenants.ts`, optionally callers (`app/[tenant]/admin/settings/*`, onboarding)  
**Depends on:** None

### Context

`updateTenant` currently uses `createSupabaseServiceClient()`, which bypasses RLS. There is no check that the current user is an **editor** (or otherwise allowed) for the `id` being updated. A client could pass another tenant’s UUID and mutate branding, language, coordinates, etc.

### Requirements

1. Before applying updates, load the current user (e.g. `getUser()` from `app/actions/auth`).
2. Verify the user has **editor** role on the tenant `id` (reuse `getUserRole` / `isEditor` from `lib/membership.ts` or equivalent). Reject with a clear error if not authorized.
3. Keep using the service client only where necessary (e.g. slug change + Redis key moves), or refactor to a pattern that does not expose cross-tenant writes; document the chosen approach in implementation notes.
4. Ensure `createTenant` and other tenant actions remain correct; do not broaden service-role usage without checks.

### Acceptance Criteria

- Non-members and viewers cannot successfully call `updateTenant` for a tenant they do not edit.
- Editors can still update their own tenant as today (branding, language, coordinates, onboarding flags, etc.).
- `pnpm build` passes.

### Implementation Notes

- If some fields should be updatable by different roles later, structure checks so the ticket does not block that (e.g. single `requireEditor(tenantId)` for now).

---

## Ticket 2: Nav chrome — remove FAB, theme on navbar, settings menu, logo home, sign-out icon

- [ ] **Status:** not completed.

**Priority:** P1  
**Scope:** `app/[tenant]/layout.tsx`, `components/admin-indicator.tsx`, `components/logo.tsx`, `components/user-menu.tsx`, `components/mobile-nav.tsx`, new small component(s) for settings links + theme  
**Depends on:** Ticket 1

### Context

Editors see **three** paths to settings on mobile (header gear, bottom nav, floating `AdminIndicator`) and **two** on desktop. The floating bottom-right gear duplicates navbar/bottom-nav behavior. Theme toggling lives only in `AdminIndicator`. The header `Settings` link goes only to branding. `Logo` is not a link. `UserMenu` shows email and a text “Sign out” button.

### Requirements

1. **Remove** the floating admin FAB: stop rendering `AdminIndicator` from the tenant layout (delete or keep file only if reused — prefer removing dead code).
2. **Logo / title:** wrap `Logo` in a `Link` to `/` (tenant home after subdomain rewrite).
3. **Signed-in user:** navbar shows **no** email; show **sign out as an icon button** only (accessible `aria-label`, optional tooltip). Reuse or replace `UserMenu`.
4. **Theme:** expose **light / dark / system** from the **navbar** (same behavior as current `AdminIndicator` cycle — can be a compact control: dropdown or tri-state button). Decide visibility: **all signed-in tenant users** (recommended) vs editors only; document in code comment.
5. **Settings entry:**
   - **Desktop:** replace the standalone header `Settings` icon link with a **dropdown** listing every tenant settings destination (same set as today’s tabs: POC, venue types, activity tags, branding, language, team, templates, feedback — labels from i18n).
   - **Mobile:** bottom nav **Settings** should open a **sheet or drawer** with the **same link list** (not only a single monolithic page), since the gear sits on the bottom bar.
6. Preserve notification bell and existing layout spacing; keep skip link and `dir` for RTL.

### Acceptance Criteria

- No `AdminIndicator` FAB on tenant pages.
- One clear settings entry on desktop (navbar dropdown) and one on mobile (bottom nav → sheet/drawer with destinations).
- Theme control visible in navbar per requirements above.
- Logo navigates to tenant home.
- No user email string in navbar; sign-out is icon-only with a11y labels.
- `pnpm build` passes; update Playwright `tests/e2e/settings.spec.ts` if URLs or entry points change.

### Implementation Notes

- Routes for dropdown/sheet targets are implemented in **Ticket 3**; until then, use the **final pathnames** you will add (e.g. `/admin/settings/poc`) so Ticket 3 only wires pages.

---

## Ticket 3: Settings IA — one route per section, remove tab scrollbar UX

- [ ] **Status:** not completed.

**Priority:** P1  
**Scope:** `app/[tenant]/admin/settings/`, `app/[tenant]/admin/settings/client.tsx`, `app/[tenant]/admin/onboarding/onboarding-wizard.tsx`, `messages/*.json`, e2e  
**Depends on:** Ticket 2

### Context

`SettingsClient` uses `Tabs` with many `TabsTrigger`s and horizontal scroll, producing a poor layout (vertical + horizontal scroll). Product ask: **seamless** navigation and **separate pages** per setting type, linked from the gear menu (Ticket 2).

### Requirements

1. Replace the single tabbed page with **dedicated routes** under `app/[tenant]/admin/settings/`, for example:
   - `poc`, `venue-types`, `activity-tags`, `branding`, `language`, `members`, `templates`, `feedback`
   - Add `page.tsx` per segment (or a shared layout + parallel routes) that renders only the relevant component (`PocManagement`, `VenueTypeManagement`, etc.).
2. **`/admin/settings`** should **redirect** to a sensible default (e.g. `poc` or a small overview page — pick one and document).
3. Remove `?tab=` query-driven tabs from the primary UX; update any internal links and onboarding steps that referenced `?tab=`.
4. Ensure each page has a clear heading and back/mobile-friendly navigation if needed.
5. Fix layout so the old **double-scrollbar** issue is gone (no cramped horizontal `TabsList`).

### Acceptance Criteria

- All former tab panels are reachable via stable URLs.
- No reliance on the old multi-tab strip for primary navigation.
- Onboarding still reaches branding/language steps without broken links.
- `pnpm build` passes; e2e settings spec updated and green.

### Implementation Notes

- Reuse existing section components; avoid duplicating business logic.

---

## Ticket 4: Fix Feedback (feature requests) — “Invalid input: not a Zod schema”

- [ ] **Status:** not completed.

**Priority:** P1  
**Scope:** `components/feature-request-management.tsx`, `app/actions/feature-requests.ts`, `package.json` (only if version alignment needed)  
**Depends on:** Ticket 3

### Context

The Feedback settings view throws at runtime: `Error: Invalid input: not a Zod schema` from the form resolver path. The project uses **Zod 4** and `@hookform/resolvers`; `zodResolver` may not accept Zod 4 schemas without the Standard Schema bridge.

### Requirements

1. Fix `useForm` + resolver so `featureRequestSchema` validates correctly (e.g. `standardSchemaResolver` from `@hookform/resolvers/standard-schema`, or downgrade/upgrade packages per official compatibility — choose one supported approach).
2. Verify `createFeatureRequest` and list loading still work.
3. Add a minimal regression check (manual steps in Implementation Notes or a small test if feasible).

### Acceptance Criteria

- Opening the feedback settings page does not throw.
- Submitting a valid feature request succeeds; validation errors show for invalid input.
- `pnpm build` passes.

---

## Ticket 5: Branding — city search with OpenWeather Geocoding API

- [ ] **Status:** not completed.

**Priority:** P2  
**Scope:** `app/[tenant]/admin/settings/settings-form.tsx`, new server action or route handler (API key server-side), env docs (`CLAUDE.md` or `.env.example` if present)  
**Depends on:** Ticket 1, Ticket 3

### Context

Manual latitude/longitude is hard for users. Use **OpenWeather Geocoding API** to suggest cities as the user types (e.g. “br” → Brussels, Brunei, Brooklyn, …) and persist resolved coordinates for weather.

### Requirements

1. Add server-side integration (route handler or server action) that calls OpenWeather Geocoding with **`OPENWEATHER_API_KEY`** (or a single documented env name). Never expose the key to the client.
2. UI: combobox or autocomplete wired to debounced search; on select, set `latitude` / `longitude` (existing tenant columns).
3. Keep optional advanced lat/lon edit if useful, or replace fully — document choice.
4. Handle API errors and empty results gracefully (toast or inline message).

### Acceptance Criteria

- Typing a city prefix returns suggestions; choosing one saves coordinates via existing `updateTenant` flow.
- Key is not in client bundles.
- `pnpm build` passes.

### Implementation Notes

- Respect OpenWeather rate limits; debounce requests.

---

## Ticket 6: Apply tenant accent color across the tenant UI

- [ ] **Status:** not completed.

**Priority:** P2  
**Scope:** `app/globals.css`, `app/[tenant]/layout.tsx`, optional Tailwind `@theme`  
**Depends on:** Ticket 5

### Context

Layout sets `--tenant-accent` on the shell, but `--primary` and related tokens in `globals.css` are static. Most UI uses `primary` / ring colors, so branding color feels inconsistent.

### Requirements

1. Map **primary** (and related accents: e.g. sidebar primary, focus ring where appropriate) to use **`--tenant-accent`** when set, with **accessible foreground** (contrast) for light and dark mode.
2. Ensure fallbacks when `accent_color` is null match current defaults.
3. Spot-check: buttons, links, key interactive elements on tenant routes.

### Acceptance Criteria

- Changing accent in branding updates the visible primary accent across tenant pages after navigation/refresh.
- Dark/light modes remain readable.
- `pnpm build` passes.

---

## Ticket 7: Team members — fix invite and member list

- [ ] **Status:** not completed.

**Priority:** P1  
**Scope:** `app/actions/memberships.ts`, `components/member-management.tsx`, Supabase RPC/migrations if broken, env documentation  
**Depends on:** Ticket 3

### Context

Invite and member list are reported broken. `getMembers` uses `auth.admin.getUserById` (service role). `inviteMember` uses RPC `get_user_id_by_email` (service_role only). Misconfiguration or RLS errors may surface as empty lists or failed invites without clear UI.

### Requirements

1. Reproduce locally; document root cause (missing `SUPABASE_SERVICE_ROLE_KEY`, RLS, RPC, duplicate invites, etc.).
2. Fix server actions and/or policies so **editors** see the member list with emails and can invite/remove as designed.
3. Surface **action errors** in the UI (`toast` or inline) for `getMembers`, `getPendingInvitations`, `inviteMember` — do not fail silently.

### Acceptance Criteria

- Editor can load members and pending invitations reliably when env is correct.
- Invite path works for existing and new users per current product rules.
- Document required env vars in ticket Implementation Notes.
- `pnpm build` passes.

---

## Ticket 8: Schedule templates settings + surface silent `ActionResponse` failures

- [ ] **Status:** not completed.

**Priority:** P1  
**Scope:** `components/schedule-template-management.tsx`, `app/actions/schedule-templates.ts`, related settings components, optionally `components/template-dialog.tsx`  
**Depends on:** Ticket 3

### Context

Templates settings “not working.” `ScheduleTemplateManagement` only updates state when `getTemplates` succeeds; **errors are swallowed** (empty list). The same **silent failure** pattern may exist in other settings-related clients.

### Requirements

1. Fix templates: show loading, **empty**, and **error** states; on `!result.success`, show `result.error` (toast or alert).
2. If templates are only creatable from day view, add a clear **CTA or link** from the templates settings page to that flow — or add create UI on the settings page; pick one and implement.
3. **Audit** other settings-area components that call server actions (`FeatureRequestManagement` after Ticket 4, `MemberManagement` after Ticket 7, POC/venue/tag managers) and ensure failures are not silently ignored where user-visible feedback is expected. Scope the audit to **tenant admin settings routes** completed in Ticket 3.

### Acceptance Criteria

- Templates page never misleads with an empty list when the server returned an error.
- User can manage templates in line with product intent (list/delete + create path documented in UI).
- `pnpm build` passes.

---

## Ticket 9: Performance — reduce sluggishness on tenant app

- [ ] **Status:** not completed.

**Priority:** P2  
**Scope:** tenant layout, home/day data loading, heavy client bundles — as identified by profiling  
**Depends on:** Ticket 3

### Context

The app feels slow. This ticket is a **focused** performance pass, not a vague rewrite.

### Requirements

1. Profile tenant **home** and **day** views (React Profiler + Network; note LCP if relevant).
2. Implement **at least two** concrete improvements (examples: parallelize independent server fetches, reduce serial waterfalls in `layout`/`page`, dynamic import for heavy client-only components, avoid over-fetching, memoization where measured).
3. Document before/after notes briefly in Implementation Notes.

### Acceptance Criteria

- Measurable improvement on at least one hot path (describe in notes) or clear reduction in redundant requests.
- No regressions in auth or tenant resolution; `pnpm build` passes.

---

## Ticket 10: Realtime updates — tenant day view (incl. PWA)

- [ ] **Status:** not completed.

**Priority:** P2  
**Scope:** day view client/server, Supabase Realtime subscriptions, relevant tables (activities, reservations, breakfasts for current `day_id`)  
**Depends on:** None (may ship after Ticket 3 for calmer routing)

### Context

Users must manually refresh to see others’ changes. Realtime should work in the **installed PWA** the same as in a browser tab (no push requirement for this ticket).

### Requirements

1. Subscribe to Postgres changes for rows tied to the **currently open day** (scoped by `tenant_id` / `day_id` per RLS).
2. Merge updates into UI state (invalidate or patch) without full page reload.
3. Unsubscribe on navigation away from the day.
4. Document limitations (e.g. only day view, not calendar aggregates).

### Acceptance Criteria

- Two sessions on the same day see updates without manual refresh.
- Works when app is installed as PWA (smoke test steps in notes).
- `pnpm build` passes; no excessive channel leaks (verify unsubscribe).

### Implementation Notes

- Align with Supabase Realtime RLS; use existing Supabase client patterns.

---

## Ticket 11: PWA — tenant name, theme color, and icon consistency

- [ ] **Status:** not completed.

**Priority:** P2  
**Scope:** `app/[tenant]/pwa/manifest/route.ts`, `app/[tenant]/pwa/icon/route.ts`, `app/[tenant]/layout.tsx` metadata, caching headers  
**Depends on:** None

### Context

Installed PWA does not show the tenant name; accent/logo may also be wrong. Manifest and icon routes use `getTenantFromHeaders()` and Supabase; failures fall back to generic “Courseday.”

### Requirements

1. Verify `/pwa/manifest` and `/pwa/icon` resolve correctly under **tenant subdomain rewrites**; fix handler or paths if `getTenantFromHeaders` throws.
2. Ensure `short_name`, `name`, and `theme_color` reflect tenant data when available.
3. Review **Cache-Control** — avoid stale manifest after branding changes (balance caching vs freshness).
4. Align with `generateMetadata` / `appleWebApp` where relevant.

### Acceptance Criteria

- Installing PWA from a tenant subdomain shows tenant **short name** (or name) and **theme_color** from branding.
- Icon route uses tenant accent/logo behavior as designed.
- `pnpm build` passes.

---

## Ticket 12: Language selector — switching locale for the venue

- [ ] **Status:** not completed.

**Priority:** P1  
**Scope:** `app/[tenant]/admin/settings/language-settings.tsx`, `middleware.ts`, `i18n/request.ts`, `app/actions/tenants.ts` (Redis update path)  
**Depends on:** Ticket 1, Ticket 3

### Context

Switching language in settings is reported broken. Flow: `updateTenant` → Redis `subdomain:{slug}` → middleware `x-tenant-language` → `next-intl` request config.

### Requirements

1. Trace end-to-end; fix any break (unsupported locale strings, Redis not updated, header not applied, client state).
2. After save + reload, UI messages match selected language.
3. If `useLocale()` vs DB can desync, fix initialization or messaging.

### Acceptance Criteria

- Editor can switch among supported locales (`en`, `fr`, `es`, `de`) and see the UI update after reload (or faster if you implement router refresh without full reload).
- `pnpm build` passes.

---

## Ticket 13: Superadmin panel on root domain + guard UX

- [ ] **Status:** not completed.

**Priority:** P1  
**Scope:** `lib/superadmin.ts`, `app/admin/page.tsx`, platform landing/layout (link for superadmins only), `middleware.ts` if needed  
**Depends on:** None

### Context

Superadmin UI lives at `app/admin/page.tsx` on the **root** host. `requireSuperadmin()` redirects to `/auth/sign-in` when not superadmin — **even if the user is already signed in**, which is confusing. There may be no discoverable link to `/admin` from the marketing home.

### Requirements

1. **Guard UX:** If user is authenticated but **not** a superadmin, redirect to **`/`** (or a dedicated “not authorized” page) with an optional query or toast — **do not** send them to sign-in as if logged out.
2. **Discoverability:** On the root domain, show a discrete **Admin** (or similar) link **only** when `getSuperadminStatus()` is true (server-rendered).
3. Confirm `middleware` does not block `example.com/admin` (tenant middleware should not run on root — verify).
4. Document that access requires a row in `superadmins`.

### Acceptance Criteria

- Superadmin can open `/admin` on the root domain and use the dashboard.
- Non-superadmin signed-in user gets a clear outcome (home / 403), not misleading sign-in redirect.
- `pnpm build` passes.

---

## Ticket 14: GitHub Actions — lint, format, test

- [ ] **Status:** not completed.

**Priority:** P2  
**Scope:** `.github/workflows/`, `package.json`, config files for ESLint/Prettier (or Biome) as chosen  
**Depends on:** None

### Context

There is no CI workflow in-repo today. The project has `vitest` and Playwright scripts but no ESLint/Prettier deps in `package.json`.

### Requirements

1. Add **ESLint** (flat config compatible with Next 15 + TS) and **Prettier** (or **Biome**) — pick one formatting strategy; document in README or `CLAUDE.md` only if you already document dev workflow there.
2. Workflow on **pull_request** (and **push** to `main`): `pnpm install`, `pnpm exec eslint .` (or equivalent), format check, `pnpm test:run`, **`pnpm build`**.
3. **Playwright:** run on `main` only, or `workflow_dispatch`, or nightly — **state choice in workflow comments** to save minutes; minimum is unit + build on PRs.

### Acceptance Criteria

- CI passes on a clean tree; failures block merge when branch protection is enabled.
- Scripts documented in `package.json` (`lint`, `lint:fix`, `format:check` as applicable).

### Implementation Notes

- Keep ruleset pragmatic; avoid fixing the entire codebase in the same PR unless necessary — can phase `eslint` to warn-first if the team prefers (document).

---

_End of NEW-TICKETS.md backlog._
