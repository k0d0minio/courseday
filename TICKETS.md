# Tickets

This file is the **single source of truth** for AI-executable work on the Courseday platform. It is intended for **Claude Code** (and similar agents).

## How Claude Code should use this file

1. **Tickets are strictly sequential by number** (1 → 2 → 3 → …). Each ticket lists its **Depends on** prerequisites; do not start a ticket until those are satisfied (marked completed).
2. When the user instructs you to work on the **next available ticket**, pick the **lowest-numbered ticket** that is not yet completed and whose dependencies are all completed.
3. **After you finish a ticket** (implementation verified, e.g. `pnpm build` where applicable): edit this file and mark that ticket **completed** by changing `- [ ]` to `- [x]` in the status line under the ticket title. This preserves progress and makes the next ticket obvious on the next run.
4. **Phase A (overhaul)** is a major domain/UX change (restaurant & bar scheduling). It is ordered **before** Phase B so later tickets assume the post-overhaul codebase (`activity`, no `hotel_booking`, new forms, etc.).
5. **Supabase migrations — you own them end-to-end.** Whenever a ticket (or its acceptance criteria) requires schema, RLS, policies, triggers, or seed data changes, **do the work in-repo**: add or edit versioned SQL under `supabase/migrations/` (respect existing numbering; one logical change per file when practical), update `supabase/seed.sql` when bootstrap data must change, and **run verification yourself** — e.g. `supabase db reset` against local Docker, or `supabase db push` / `supabase migration up` per how this project is set up. Regenerate types when needed (`pnpm db:types` or the ticket’s stated command). **Do not** leave migrations as a “user must run manually” TODO unless the environment truly cannot run the Supabase CLI (then state that single blocker explicitly). A database-related ticket is **not done** until migrations exist, apply cleanly, and acceptance criteria that touch the DB are satisfied.

**Priority key:** P0 = critical/blocking, P1 = high/core feature, P2 = medium/enhancement, P3 = low/polish.

**Dependency overview**

- **Phase A:** Ticket 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 (overhaul chain; former OVERHAUL.md O-1 … O-14).
- **Phase B:** Starts at Ticket 15; each ticket’s **Depends on** references these new numbers.

---

# Phase A — Domain & UX overhaul (restaurant & bar scheduling)

Reframes the platform from a golf tee-time model to **restaurant & bar scheduling**: **Activities** (tagged), **Reservations** (standalone + table layouts), **Breakfast** (per-day, multiple per day); **hotel bookings removed**.

**Former reference:** tickets were labeled O-1 … O-14 in `OVERHAUL.md`.

---

## Ticket 1: Database Migration — Drop Hotel Bookings, Rename Program Items, Restructure Schema

- [x] **Status:** completed.

**Priority:** P0  
**Scope:** `supabase/migrations/`, `supabase/seed.sql`  
**Depends on:** None

### Context

The current schema models the system around `program_item` with a fixed `type` enum (golf|event), `hotel_booking` with nested `breakfast_configuration`, and `reservation` linked to both hotel bookings and program items. This does not reflect the actual product: a restaurant & bar scheduling platform where activities are tagged (not typed), breakfast is a first-class daily entity, and hotel bookings are unnecessary overhead.

Migration files 00001 through 00012 exist in `supabase/migrations/`. Two files share the prefix `00012_`: `00012_add_tenant_language.sql` and `00012_tenant_logo_storage.sql`. This must be fixed before adding new migrations.

### Requirements

1. **Fix duplicate migration prefix**: Rename `supabase/migrations/00012_tenant_logo_storage.sql` to `supabase/migrations/00013_tenant_logo_storage.sql`.

2. **Create `activity_tag` table** (new migration `00014_overhaul_schema.sql` or similar):
   - `id` — uuid PK, default `gen_random_uuid()`
   - `tenant_id` — uuid FK to `tenants(id)`, NOT NULL, ON DELETE CASCADE
   - `name` — text, NOT NULL
   - `created_at` — timestamptz, default `now()`
   - Unique constraint on `(tenant_id, name)`
   - RLS: tenant members can SELECT; editors can INSERT/UPDATE/DELETE

3. **Rename `program_item` to `activity`**: Use `ALTER TABLE program_item RENAME TO activity`.
   - Rename column: `guest_count` → `expected_covers`
   - Drop columns: `type`, `table_breakdown`, `capacity`, `is_tour_operator`
   - Keep: `id`, `day_id`, `title`, `description`, `start_time`, `end_time`, `expected_covers`, `venue_type_id`, `poc_id`, `notes`, `recurrence_group_id`, `recurrence_frequency`, `is_recurring`, `tenant_id`, `created_at`, `updated_at`

4. **Create `activity_tag_assignment` join table**:
   - `activity_id` — uuid FK to `activity(id)`, ON DELETE CASCADE
   - `tag_id` — uuid FK to `activity_tag(id)`, ON DELETE CASCADE
   - Primary key on `(activity_id, tag_id)`
   - RLS: same as `activity_tag`

5. **Modify `reservation` table**:
   - Drop columns: `hotel_booking_id`, `program_item_id`, `table_index`, `guest_email`, `guest_phone`
   - Add column: `table_breakdown` (JSONB, nullable)
   - Drop FK constraint to `hotel_booking`
   - Drop FK constraint to `program_item`
   - Keep: `id`, `day_id`, `guest_name`, `guest_count`, `start_time`, `end_time`, `notes`, `tenant_id`, `created_at`, `updated_at`

6. **Modify `breakfast_configuration` table**:
   - Drop column: `hotel_booking_id`
   - Drop the unique constraint on `(hotel_booking_id, breakfast_date)`
   - Drop or update any trigger that computes `total_guests` from `hotel_booking` (ensure it works from `table_breakdown` alone)
   - Add columns: `tenant_id` (uuid FK to `tenants(id)`, NOT NULL), `day_id` (uuid FK to `day(id)`, NOT NULL), `group_name` (text, nullable)
   - Add unique constraint on `(tenant_id, day_id, start_time)` to prevent duplicate configs at the same time on the same day
   - Keep: `id`, `breakfast_date`, `table_breakdown`, `total_guests`, `start_time`, `notes`, `created_at`

7. **Drop `hotel_booking` table**: First ensure all FK constraints referencing it have been dropped (from `reservation` and `breakfast_configuration` above). Then `DROP TABLE hotel_booking`.

8. **Update all RLS policies** for renamed tables. The `activity` table should inherit the policies that `program_item` had. Ensure viewers can SELECT on: `activity`, `reservation`, `breakfast_configuration`, `activity_tag`, `activity_tag_assignment`, `day`, `venue_type`, `point_of_contact` for their tenant. Editors get full CRUD.

9. **Update `supabase/seed.sql`** if it references old table names or dropped tables.

### Acceptance Criteria

- `supabase db reset` runs cleanly with no errors.
- No duplicate migration prefixes remain.
- `\dt` in psql shows `activity` instead of `program_item`, no `hotel_booking` table.
- `activity_tag` and `activity_tag_assignment` tables exist with correct constraints.
- `reservation` table has `table_breakdown` column, no `hotel_booking_id`/`program_item_id`/`table_index`/`guest_email`/`guest_phone`.
- `breakfast_configuration` has `tenant_id`, `day_id`, `group_name`; no `hotel_booking_id`.
- RLS policies allow tenant member SELECT and editor full CRUD on all relevant tables.

### Implementation Notes

- Use a single migration file for the overhaul changes (after the prefix fix). Wrapping in a transaction is recommended.
- Check `00003_rls_helpers.sql` for `is_tenant_member` and `is_tenant_editor` helper functions — reuse them in new RLS policies.
- The `program_item` table was created in `00007_create_program_item.sql`, `reservation` in `00008_create_reservation.sql`, `hotel_booking` in `00009_create_hotel_booking.sql`, `breakfast_configuration` in `00010_create_breakfast_configuration.sql`. Review these for the exact column names, constraints, and triggers to drop.
- When renaming `program_item` to `activity`, existing indexes and constraints will be automatically renamed by Postgres in some cases, but explicitly rename any that have `program_item` in their name for clarity.

---

## Ticket 2: RLS Policy Verification & Fixes (post-migration)

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** `supabase/migrations/` (new migration file)  
**Depends on:** Ticket 1

### Context

The database migration in Ticket 1 renames `program_item` to `activity`, drops `hotel_booking`, creates new tables (`activity_tag`, `activity_tag_assignment`), and modifies `reservation` and `breakfast_configuration`. RLS policies reference table names and may break or become incomplete after these changes. The helper functions `is_tenant_member` and `is_tenant_editor` from `00003_rls_helpers.sql` should still work, but policies attached to renamed/modified tables need verification.

### Requirements

1. **Verify and fix ALL RLS policies** across all tables to ensure:

   - **Viewers can SELECT** on: `activity`, `reservation`, `breakfast_configuration`, `activity_tag`, `activity_tag_assignment`, `day`, `venue_type`, `point_of_contact` for their tenant.
   - **Editors can SELECT, INSERT, UPDATE, DELETE** on: `activity`, `reservation`, `breakfast_configuration`, `activity_tag`, `activity_tag_assignment`, `venue_type`, `point_of_contact` for their tenant.
   - **Day table** retains its current pattern (system-managed, `ensureDayExists` uses service client).
   - **Memberships table** policies are unchanged.

2. Create a migration file with any policy changes needed.

3. Test by checking the helper functions `is_tenant_member` and `is_tenant_editor` from migration `00003_rls_helpers.sql` — ensure they still work correctly with the renamed tables.

### Acceptance Criteria

- RLS is enabled on all tables: `activity`, `reservation`, `breakfast_configuration`, `activity_tag`, `activity_tag_assignment`, `day`, `venue_type`, `point_of_contact`, `tenants`, `memberships`.
- A viewer-role user can SELECT from all listed tables for their tenant, and cannot INSERT/UPDATE/DELETE on data tables.
- An editor-role user can full CRUD on all data tables for their tenant.
- No user can access data from a tenant they don't have a membership in.
- `supabase db reset` runs cleanly.

### Implementation Notes

- When Postgres renames a table with `ALTER TABLE ... RENAME TO ...`, existing policies on that table are preserved but their names may still reference the old table name. Consider renaming policies for clarity: e.g., `program_item_select_policy` → `activity_select_policy`.
- For new tables (`activity_tag`, `activity_tag_assignment`), create policies from scratch using the same pattern as existing tables.
- The `breakfast_configuration` table now has a `tenant_id` column (added in Ticket 1), making tenant-scoping straightforward. Previously it may have relied on joining through `hotel_booking` — update the policy to use the direct `tenant_id`.
- Run `SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public'` to audit all existing policies.

---

## Ticket 3: TypeScript Types Regeneration & Alias Updates

- [x] **Status:** completed.

**Priority:** P0  
**Scope:** `types/supabase.ts`, `types/index.ts`, all files importing from `types/`  
**Depends on:** Ticket 2

### Context

`types/supabase.ts` is auto-generated but stale — it only has `tenants`, `memberships`, `point_of_contact`, `venue_type`. It's missing `day`, `program_item`, `reservation`, `hotel_booking`, `breakfast_configuration`, and the `accent_color`/`language` columns on `tenants`. After Ticket 1, the schema changes significantly: `program_item` → `activity`, `hotel_booking` dropped, new `activity_tag` and `activity_tag_assignment` tables, modified `reservation` and `breakfast_configuration`.

`types/index.ts` has manual aliases (`ProgramItem`, `ProgramItemWithRelations`, `HotelBooking`, etc.) that must be updated to match the new schema.

### Requirements

1. **Regenerate `types/supabase.ts`** by running `pnpm supabase gen types typescript --local > types/supabase.ts` (or the equivalent command used in this project). If the Supabase CLI isn't available or this fails, manually update the generated types to match the new schema from Ticket 1.

2. **Update `types/index.ts`**:
   - Replace `ProgramItem` alias with `Activity` pointing to the new `activity` table row type.
   - Replace `ProgramItemWithRelations` with `ActivityWithRelations` — include nested `tags: ActivityTag[]`, `venue_type: VenueType | null`, `poc: PointOfContact | null`.
   - Remove `HotelBooking` type entirely.
   - Update `Reservation` — remove `hotel_booking_id`, `program_item_id`, `table_index` fields. Add `table_breakdown`.
   - Remove `ReservationWithRelations` if it included hotel booking or program item relations, or update it to remove those relations.
   - Update `BreakfastConfiguration` — remove `hotel_booking_id`, add `tenant_id`, `day_id`, `group_name`.
   - Add `ActivityTag` type for the `activity_tag` table.
   - Add `ActivityTagAssignment` type for the join table.

3. **Find and fix EVERY import** across the entire codebase that references the old type names. Key files to search:
   - All files in `app/actions/`
   - All files in `components/`
   - All files in `app/[tenant]/`
   - All files in `lib/`
   - Search for: `ProgramItem`, `ProgramItemWithRelations`, `HotelBooking`, `ReservationWithRelations`

4. `pnpm build` must pass with zero type errors.

### Acceptance Criteria

- `types/supabase.ts` reflects the new schema (activity, activity_tag, activity_tag_assignment, modified reservation, modified breakfast_configuration, no hotel_booking).
- `types/index.ts` exports `Activity`, `ActivityWithRelations`, `ActivityTag`, `ActivityTagAssignment`, updated `Reservation`, updated `BreakfastConfiguration`. No `ProgramItem`, `ProgramItemWithRelations`, or `HotelBooking` exports.
- Zero references to `ProgramItem`, `ProgramItemWithRelations`, or `HotelBooking` remain in any `.ts`/`.tsx` file.
- `pnpm build` passes with zero type errors.

### Implementation Notes

- Run a codebase-wide search for old type names before declaring done: `ProgramItem`, `ProgramItemWithRelations`, `HotelBooking`, `ReservationWithRelations`, `hotel_booking`, `program_item`.
- Some files may import these types but not yet use the new forms/actions (those come in later tickets). For now, just update the types — the runtime logic changes happen in Ticket 4+.
- If the auto-generated types file can't be regenerated (e.g., no local Supabase instance), manually write the types matching the Ticket 1 migration schema exactly.

---

## Ticket 4: Server Actions Refactor

- [x] **Status:** completed.

**Priority:** P0  
**Scope:** `app/actions/program-items.ts`, `app/actions/hotel-bookings.ts`, `app/actions/reservations.ts`, `app/actions/breakfast.ts`, `lib/reservation-schema.ts`, new `app/actions/activities.ts`, new `app/actions/activity-tags.ts`  
**Depends on:** Ticket 3

### Context

Server actions reference old table names (`program_item`), old column names (`guest_count`, `type`, `table_breakdown`, `capacity`, `is_tour_operator`), and entities being removed (`hotel_booking`). The reservation actions accept `hotel_booking_id` and `program_item_id` params that no longer exist. Breakfast actions are scoped to hotel bookings (`getBreakfastConfigurationsForBooking`) but must now be scoped to days. There's also a duplicate Zod schema: `lib/reservation-schema.ts` duplicates validation in `components/add-reservation-modal.tsx`.

### Requirements

1. **Rename `app/actions/program-items.ts` → `app/actions/activities.ts`**. Rename all exported functions:
   - `createProgramItem` → `createActivity`
   - `updateProgramItem` → `updateActivity`
   - `deleteProgramItem` → `deleteActivity`
   - `deleteRecurrenceGroup` → `deleteActivityRecurrenceGroup`
   - `getProgramItemsForDay` → `getActivitiesForDay`
   
   Update all internal Supabase queries to use the `activity` table. Add tag assignment logic: `createActivity` and `updateActivity` should accept a `tagIds: string[]` parameter and manage rows in `activity_tag_assignment` (delete existing assignments, insert new ones). Remove references to dropped columns (`type`, `table_breakdown`, `capacity`, `is_tour_operator`).

2. **Create `app/actions/activity-tags.ts`** with:
   - `createActivityTag(name: string)`
   - `updateActivityTag(id: string, name: string)`
   - `deleteActivityTag(id: string)`
   - `getAllActivityTags()`
   
   Follow the same patterns as `app/actions/venue-type.ts`.

3. **Delete `app/actions/hotel-bookings.ts`** entirely.

4. **Update `app/actions/reservations.ts`**:
   - Remove `hotel_booking_id` and `program_item_id` from create/update payloads.
   - Remove `guest_email`, `guest_phone`.
   - Add `table_breakdown` support (JSONB, stored as `number[]`).
   - Remove all references to hotel bookings and program items.
   - Consolidate the duplicate Zod schemas — delete `lib/reservation-schema.ts` and keep one schema in the action file (or keep it in lib but ensure only one exists).

5. **Update `app/actions/breakfast.ts`**:
   - Rename `getBreakfastConfigurationsForBooking` → `getBreakfastConfigurationsForDay(dayId: string)`.
   - Add `createBreakfastConfiguration(params)` action (currently only update exists).
   - Add `deleteBreakfastConfiguration(id: string)` action.
   - Remove all `hotel_booking_id` references.
   - Update params to accept: `dayId`, `groupName`, `guestCount`, `tableBreakdown`, `startTime`, `notes`.

6. **Update every file that imports from the old action paths**. Search for all imports of: `program-items`, `hotel-bookings`, and update to new paths/names.

7. `pnpm build` must pass.

### Acceptance Criteria

- `app/actions/activities.ts` exists with all renamed functions querying the `activity` table and managing tags via `activity_tag_assignment`.
- `app/actions/activity-tags.ts` exists with full CRUD for activity tags.
- `app/actions/hotel-bookings.ts` does not exist.
- `app/actions/reservations.ts` has no references to `hotel_booking_id`, `program_item_id`, `guest_email`, `guest_phone`.
- `app/actions/breakfast.ts` queries by day, supports create/update/delete, no `hotel_booking_id`.
- `lib/reservation-schema.ts` is deleted (or is the single source of truth with no duplicate elsewhere).
- No file imports from `app/actions/program-items` or `app/actions/hotel-bookings`.
- `pnpm build` passes.

### Implementation Notes

- For tag assignment in `createActivity`/`updateActivity`: use a Supabase transaction or sequential operations — first upsert the activity row, then delete all existing `activity_tag_assignment` rows for that activity, then insert the new ones. This simple delete-and-reinsert approach avoids complex diffing.
- The reservation schema consolidation: check both `lib/reservation-schema.ts` and the local schema inside `components/add-reservation-modal.tsx` to determine which is more complete, then keep one.
- When deleting `hotel-bookings.ts`, first search for all imports of it to ensure no file will break.

---

## Ticket 5: Visual Table Breakdown Builder Component

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** New `components/table-breakdown-builder.tsx`  
**Depends on:** Ticket 4

### Context

Currently, table breakdown is entered as a cryptic string like `3+2+1` (3-top, 2-top, 1-top). This is error-prone and unintuitive. A visual builder lets staff add/remove tables and adjust seat counts with clear affordances. This component will be shared between the reservation form (Ticket 8) and breakfast configuration form (Ticket 9).

### Requirements

Props interface:

```typescript
type TableBreakdownBuilderProps = {
  value: number[];
  onChange: (breakdown: number[]) => void;
  disabled?: boolean;
};
```

1. Display a visual row of "table" blocks. Each block shows the seat count for that table.
2. "Add table" button at the end appends a new table with default 2 seats.
3. Each table block has +/- buttons (or a small stepper) to adjust seat count. Minimum 1 seat, maximum 20 seats per table.
4. Each table block has a small × button to remove it.
5. Below the tables, show a summary: "X tables · Y total covers".
6. Empty state (no tables): show just the "Add table" button with helper text "Add tables to define the seating layout".
7. Tables should wrap to multiple rows on narrow screens.
8. Fully keyboard accessible: tab between tables, arrow keys or +/- to adjust counts, Delete/Backspace to remove.
9. Use shadcn/ui primitives (Button, Badge or similar) for consistent styling.
10. Compact enough to fit inside a form alongside other fields.

### Acceptance Criteria

- Component renders with an empty state when `value` is `[]`.
- Adding a table calls `onChange` with `[2]` (default 2 seats).
- Clicking + on a 2-seat table calls `onChange` with `[3]`.
- Clicking - on a 2-seat table calls `onChange` with `[1]`.
- Clicking - on a 1-seat table does nothing (minimum).
- Clicking × on a table removes it from the array.
- Summary text updates correctly: "3 tables · 8 total covers" for `[3, 3, 2]`.
- Keyboard navigation works: Tab focuses tables, +/- adjusts, Delete removes.
- Renders correctly at 320px width (tables wrap).
- No lint errors. Component exports cleanly.

### Implementation Notes

- Consider using `flex flex-wrap gap-2` for the table grid to handle wrapping.
- Each table block could be a small card with the count centered, +/- on sides or top/bottom, and × in the corner.
- Use `aria-label` on buttons for accessibility: "Add seat to table 1", "Remove table 2", etc.
- The `number[]` data model maps directly to the JSONB `table_breakdown` column in the database.

---

## Ticket 6: Activity Tag Management in Settings

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** New `components/activity-tag-management.tsx`, `app/[tenant]/admin/settings/` (settings page)  
**Depends on:** Ticket 4

### Context

Activity tags are tenant-specific and configurable. They need a management UI in the tenant admin settings, alongside the existing venue type and POC management panels. The existing `components/venue-type-management.tsx` and `components/poc-management.tsx` provide the exact pattern to follow.

### Requirements

1. Create `components/activity-tag-management.tsx` — a settings panel for managing activity tags.
2. List all activity tags for the tenant.
3. Add new tag: name field + save button.
4. Edit tag name inline.
5. Delete tag with confirmation dialog.
6. Uses actions from `app/actions/activity-tags.ts`.
7. Add this as a new tab in the tenant admin settings page at `app/[tenant]/admin/settings/`. The settings page currently has tabs for POC, Venue Types, Branding, Language. Add "Activity Tags" as a new tab.

### Acceptance Criteria

- `components/activity-tag-management.tsx` exists and follows the same pattern as `venue-type-management.tsx`.
- Settings page at `/admin/settings` shows an "Activity Tags" tab.
- Can create a new tag, see it in the list, edit its name, and delete it.
- Deleting a tag shows a confirmation dialog.
- Tags are scoped to the current tenant.
- `pnpm build` passes.

### Implementation Notes

- Copy the structure of `components/venue-type-management.tsx` almost verbatim — same layout, same interaction patterns, just different field names and actions.
- The settings page likely uses a tab component (shadcn/ui Tabs). Add the new tab in a logical position — after "Venue Types" is natural since they're both categorization concepts.
- Activity tags are simpler than venue types or POCs — they only have a `name` field.

---

## Ticket 7: Activity Form

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** New `components/activity-form.tsx`, delete `components/add-entry-modal.tsx`, update all imports  
**Depends on:** Ticket 4

### Context

`components/add-entry-modal.tsx` creates/edits `program_item` records with a fixed `type` enum (golf|event), `table_breakdown`, `capacity`, and `is_tour_operator` fields. The new activity form drops these fields and adds multi-select tag support via `activity_tag`. The form should be significantly simpler and shorter.

### Requirements

1. **Fields:**
   - Title (text input, required)
   - Tags (multi-select from `activity_tag` list, optional). Use a combobox/multi-select pattern — show available tags as checkable items. Include an "Add new tag" option inline (same pattern as the current inline POC/venue type creation in `add-entry-modal.tsx`).
   - Start time / End time (time inputs, optional)
   - Expected covers (number input, optional, min 1)
   - Venue type (select + inline create, reuse current pattern from `add-entry-modal.tsx`)
   - Point of contact (select + inline create, reuse current pattern from `add-entry-modal.tsx`)
   - Notes (textarea, optional)
   - Recurring toggle + frequency selector (keep existing recurrence logic from `add-entry-modal.tsx`)

2. **Removed fields** (they existed in `add-entry-modal.tsx` but are not activity concerns): `table_breakdown`, `capacity`, `is_tour_operator`, `type` enum.

3. The form supports both create and edit modes (same as current `add-entry-modal.tsx` pattern with `editItem` prop).

4. Use Dialog container on desktop, Drawer (from vaul, already in `components/ui/drawer.tsx`) on mobile (<640px). Use Tailwind responsive classes or a `useMediaQuery` hook to switch.

5. Call `createActivity` / `updateActivity` from `app/actions/activities.ts` on submit, passing selected tag IDs.

6. Delete `components/add-entry-modal.tsx` after the new form is working and all references are updated.

7. Target: under 350 lines.

### Acceptance Criteria

- `components/activity-form.tsx` exists and renders correctly in both create and edit modes.
- Tag multi-select loads tags from `getAllActivityTags()` and allows inline creation.
- Submitting the form calls `createActivity` (create mode) or `updateActivity` (edit mode) with correct parameters including `tagIds`.
- Recurrence logic works: toggling recurring on shows frequency selector; creating a recurring activity creates the recurrence group.
- `components/add-entry-modal.tsx` is deleted.
- No file imports `add-entry-modal` or references `AddEntryModal`.
- Dialog renders on desktop, Drawer on mobile.
- `pnpm build` passes.

### Implementation Notes

- Study the inline creation pattern in `add-entry-modal.tsx` for POC and venue type — it likely uses a state toggle to show a mini-form within the select dropdown. Replicate this for tags.
- For the multi-select tag pattern, consider using a Popover with a list of checkboxes, or the shadcn/ui Combobox pattern with multi-select.
- The recurrence logic from `add-entry-modal.tsx` can be extracted mostly as-is — it's independent of the other field changes.
- Use `useMediaQuery` or check `window.innerWidth` for the Dialog/Drawer switch. There may already be a media query hook in the codebase — search for `useMediaQuery` before creating one.

---

## Ticket 8: Reservation Form

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** New `components/reservation-form.tsx`, delete `components/add-reservation-modal.tsx`, update all imports  
**Depends on:** Ticket 4, Ticket 5

### Context

`components/add-reservation-modal.tsx` creates/edits reservations linked to hotel bookings and program items, with guest email/phone fields and a table index selector. The new reservation form is standalone — no links to other entities, no email/phone, and uses the visual table breakdown builder instead of a program item + table index combo.

### Requirements

1. **Fields:**
   - Guest name (text input, optional)
   - Party size (number input, optional, min 1)
   - Start time / End time (time inputs, optional)
   - Table layout (use `TableBreakdownBuilder` from Ticket 5, optional)
   - Notes (textarea, optional)

2. **Removed fields**: `guest_email`, `guest_phone`, linked hotel booking, linked program item, table index.

3. Create and edit modes via `editItem` prop.

4. Dialog on desktop, Drawer on mobile.

5. Call `createReservation` / `updateReservation` from `app/actions/reservations.ts`.

6. Delete `components/add-reservation-modal.tsx` after the new form is working.

7. Target: under 200 lines.

### Acceptance Criteria

- `components/reservation-form.tsx` exists and renders correctly in create and edit modes.
- `TableBreakdownBuilder` is rendered and functional — changes to table layout update the form state.
- Submitting calls `createReservation` or `updateReservation` with correct parameters including `table_breakdown` as `number[]`.
- `components/add-reservation-modal.tsx` is deleted.
- No file imports `add-reservation-modal` or references `AddReservationModal`.
- `pnpm build` passes.

### Implementation Notes

- This is a significant simplification — the new form has roughly half the fields of the old one.
- The `TableBreakdownBuilder` value should be stored as `number[]` in form state and passed directly to the action, which stores it as JSONB.
- Reuse the Dialog/Drawer pattern from Ticket 7.

---

## Ticket 9: Breakfast Configuration Form

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** New `components/breakfast-form.tsx`, delete `components/add-breakfast-modal.tsx`, update all imports  
**Depends on:** Ticket 4, Ticket 5

### Context

`components/add-breakfast-modal.tsx` is edit-only for a single `breakfast_configuration` and is tightly coupled to `hotel_booking` (it's embedded in the hotel booking drawer's per-night tabs). The new breakfast form is standalone: it creates and edits breakfast configurations scoped to a day, not a hotel booking. It uses the visual table breakdown builder and adds a group name field.

### Requirements

1. **Fields:**
   - Group name (text input, optional — e.g., "Smith party", "Conference delegates")
   - Guest count (number input, optional, min 1)
   - Table layout (use `TableBreakdownBuilder` from Ticket 5, optional)
   - Service time (time input, optional)
   - Notes (textarea, optional)

2. This is a **create and edit** form. The current `add-breakfast-modal.tsx` was edit-only. The new form must support creating new breakfast configurations for a day.

3. Dialog on desktop, Drawer on mobile.

4. Call `createBreakfastConfiguration` / `updateBreakfastConfiguration` from `app/actions/breakfast.ts`.

5. Delete `components/add-breakfast-modal.tsx` after the new form is working.

6. Target: under 200 lines.

### Acceptance Criteria

- `components/breakfast-form.tsx` exists and renders correctly in create and edit modes.
- Create mode: submitting calls `createBreakfastConfiguration` with dayId, groupName, guestCount, tableBreakdown, startTime, notes.
- Edit mode: submitting calls `updateBreakfastConfiguration` with the existing config's ID and updated fields.
- `TableBreakdownBuilder` is functional within the form.
- `components/add-breakfast-modal.tsx` is deleted.
- No file imports `add-breakfast-modal` or references `AddBreakfastModal`.
- `pnpm build` passes.

### Implementation Notes

- The current `add-breakfast-modal.tsx` gets its `hotel_booking_id` from props — the new form gets `dayId` from props instead.
- Reuse the Dialog/Drawer pattern from Ticket 7 and Ticket 8.
- The `group_name` field helps staff label breakfast configs without needing a full hotel booking entity. It's free text, no validation beyond max length.

---

## Ticket 10: Remove Hotel Booking UI

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** `components/add-hotel-booking-drawer.tsx`, `components/hotel-booking-card.tsx`, `app/[tenant]/day/[date]/DayViewClient.tsx`, `app/[tenant]/day/[date]/page.tsx`, `components/CalendarDaySidebar.tsx`, `components/HomeClient.tsx`  
**Depends on:** Ticket 9

### Context

With hotel bookings removed from the domain model (Ticket 1), breakfast promoted to standalone (Ticket 9), and the hotel booking server actions deleted (Ticket 4), all remaining hotel booking UI must be cleaned out. This includes the drawer component, display card, and all references in the day view, sidebar, and month calendar.

### Requirements

1. Delete `components/add-hotel-booking-drawer.tsx`.
2. Delete `components/hotel-booking-card.tsx`.
3. Remove hotel booking imports, state, handlers, and sections from `app/[tenant]/day/[date]/DayViewClient.tsx`.
4. Remove hotel booking section from `components/CalendarDaySidebar.tsx`.
5. Remove hotel booking pip (`H`) from `components/HomeClient.tsx` month calendar.
6. Remove hotel booking data fetching from `app/[tenant]/day/[date]/page.tsx` (the server component that loads data).
7. Remove hotel booking data fetching from `components/CalendarDaySidebar.tsx`.
8. Search the entire codebase for any remaining references to `hotel_booking`, `HotelBooking`, `hotel-booking`, `hotelBooking` and remove them.
9. `pnpm build` must pass.

### Acceptance Criteria

- `components/add-hotel-booking-drawer.tsx` does not exist.
- `components/hotel-booking-card.tsx` does not exist.
- Zero references to `hotel_booking`, `HotelBooking`, `hotel-booking`, or `hotelBooking` remain in any `.ts`/`.tsx` file (except possibly migration files, which are historical).
- Day view renders without hotel booking section.
- Month calendar renders without `H` pip.
- `pnpm build` passes.

### Implementation Notes

- Be thorough with the codebase search. Hotel booking references may exist in:
  - Translation files (`messages/en.json`, `messages/fr.json`)
  - Type files (should be cleaned in Ticket 3, but verify)
  - Action files (should be cleaned in Ticket 4, but verify)
  - Any utility or helper files
- The day view server component (`page.tsx`) likely fetches hotel bookings and passes them as props to `DayViewClient`. Remove from both the fetch and the props interface.

---

## Ticket 11: Updated Day View for Editors

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** `app/[tenant]/day/[date]/DayViewClient.tsx`, `app/[tenant]/day/[date]/page.tsx`, `components/entry-card.tsx` (replace), `components/reservation-card.tsx`, `components/day-summary-card.tsx`, `components/CalendarDaySidebar.tsx`, `components/HomeClient.tsx`, new `components/activity-card.tsx`, new `components/breakfast-card.tsx`  
**Depends on:** Ticket 7, Ticket 8, Ticket 9, Ticket 10

### Context

The day view currently has sections tied to the old domain model. With all new forms built (Tickets 7–9) and hotel booking UI removed (Ticket 10), the day view needs to be restructured around the new domain: Breakfast, Activities, Reservations.

### Requirements

1. **Rename sections:**
   - "Golf & Events" → "Activities"
   - "Tee Time Reservations" → "Reservations"
   - Remove "Hotel Bookings" section
   - Add new "Breakfast" section

2. **The day view should have 3 sections for editors:**

   **Breakfast** — list of breakfast configurations for this day. Each shows: group name (or "Unnamed"), guest count, table layout (rendered visually from `table_breakdown`), service time, notes. Edit and delete buttons. "Add Breakfast" button at section header.

   **Activities** — list of activities. Each shows: title, tags (as small badges), time range, expected covers, venue, contact, notes. Edit and delete buttons. "Add Activity" button at section header.

   **Reservations** — list of reservations. Each shows: guest name, party size, time, table layout (rendered visually), notes. Edit and delete buttons. "Add Reservation" button at section header.

3. **Replace `components/entry-card.tsx`** with a new `components/activity-card.tsx` that displays activities with tag badges.

4. **Update `components/reservation-card.tsx`** to show `table_breakdown` visually (render the `number[]` as small table blocks) instead of the old program item link.

5. **Create `components/breakfast-card.tsx`** to display breakfast configurations with visual table layout.

6. **Update `components/day-summary-card.tsx`** to show: total breakfast covers, total activity covers, total reservation covers (party sizes).

7. **Wire up all new forms**: `activity-form.tsx` (Ticket 7), `reservation-form.tsx` (Ticket 8), `breakfast-form.tsx` (Ticket 9).

8. **Update the server component `page.tsx`** to fetch breakfast configurations for the day (using the new `getBreakfastConfigurationsForDay` action), and pass them to `DayViewClient`.

9. **Update `components/CalendarDaySidebar.tsx`:**
   - Quick-add buttons: "+ Activity", "+ Reservation", "+ Breakfast"
   - Update sections to match new names
   - Show breakfast configs in sidebar
   - Remove hotel booking section

10. **Update month calendar pips in `components/HomeClient.tsx`**: Replace `G`/`E`/`R`/`H` with `A` (activities), `R` (reservations), `B` (breakfasts). Update the legend.

### Acceptance Criteria

- Day view shows three sections: Breakfast, Activities, Reservations.
- Each section has an "Add" button that opens the correct form.
- Activity cards display tag badges, expected covers, venue, contact.
- Reservation cards display visual table layout.
- Breakfast cards display group name, guest count, visual table layout, service time.
- Summary card shows totals for each section.
- Calendar sidebar quick-add buttons work for all three entity types.
- Month calendar shows A/R/B pips with updated legend.
- `components/entry-card.tsx` can be deleted (replaced by `activity-card.tsx`).
- `pnpm build` passes.

### Implementation Notes

- The visual table layout in cards can be a simple read-only version of the `TableBreakdownBuilder` — just render the `number[]` as small blocks with seat counts, no interaction needed. Consider a `TableBreakdownDisplay` helper component or a `readonly` mode on the builder.
- The day view sections should be ordered: Breakfast → Activities → Reservations (morning → day → evening flow, matching a typical service day).
- For the summary card, aggregate: sum of `breakfast_configuration.total_guests` (or `guest_count`), sum of `activity.expected_covers`, sum of `reservation.guest_count`.

---

## Ticket 12: Viewer Daily Dashboard

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** `app/[tenant]/day/[date]/DayViewClient.tsx`  
**Depends on:** Ticket 11

### Context

Currently viewers see the same `DayViewClient` but with edit buttons hidden and hotel bookings invisible. The viewer experience needs to be redesigned as a clean, glanceable dashboard that answers "What do I need to prepare for today?" — showing ALL data (breakfast, activities, reservations) without any editing controls.

### Requirements

1. **ALL data must be visible to viewers** — breakfast, activities, reservations. No sections hidden by role.

2. **Organize the viewer's day view by service period** for scannability:
   - **Summary card at top**: total breakfast covers, total reservation covers, total activities, with clear numbers
   - **Breakfast Service** — all breakfast configs for the day, showing group name, guest count, table layout (visual), time
   - **Today's Activities** — activities with tag badges, time, expected covers
   - **Reservations** — guest name, party size, time, table layout (visual)

3. Remove all edit/add/delete buttons for viewers.

4. Use a clean, high-contrast layout. This is a "glance between tasks" screen — no clutter.

5. Keep `DayNav` (prev/next day navigation) for viewers.

6. Ensure the layout works well on tablets (common in restaurants behind the bar) and phones.

7. The RLS policies from Ticket 1 already grant viewers SELECT access to all tables. This ticket is purely a UI change — make `DayViewClient` conditionally render the viewer layout when `authState.isEditor` is false.

### Acceptance Criteria

- Viewers see all three data sections: breakfast, activities, reservations.
- No edit, add, or delete buttons visible for viewers.
- Summary card at top shows aggregate counts.
- Layout is responsive and readable on tablet (768px) and phone (375px) widths.
- Day navigation works for viewers.
- Editors still see the full CRUD editor view from Ticket 11.
- `pnpm build` passes.

### Implementation Notes

- Consider extracting the viewer layout into a separate component (e.g., `ViewerDayDashboard`) rendered conditionally inside `DayViewClient`, rather than scattering `isEditor` checks throughout.
- For the "glance" design: use large numbers for totals, minimal chrome, generous spacing. Think restaurant kitchen display vibes.
- Tablet layout is key — many F&B staff use iPads mounted behind the bar. Test at 768×1024 portrait.

---

## Ticket 13: Editor Agenda/Timeline View

- [x] **Status:** completed.

**Priority:** P2  
**Scope:** New `components/AgendaView.tsx`, `components/HomeClient.tsx`  
**Depends on:** Ticket 11

### Context

The month calendar works well for navigating to specific dates but doesn't give editors a quick sense of upcoming workload. An agenda/timeline view shows a scrollable list of upcoming days with inline summaries — useful for weekly planning and especially for mobile editors where the calendar sidebar isn't available.

### Requirements

1. Add a view toggle to the editor home page (`components/HomeClient.tsx`): "Calendar" | "Agenda". Default to whatever the user last chose (store in `localStorage`).

2. The agenda view shows a scrollable vertical list of upcoming days (next 14 days by default).

3. Each day row shows:
   - Date and weekday (e.g., "Monday 7 April")
   - Compact counts: e.g., "3 activities · 5 reservations · 2 breakfasts"
   - Expandable: clicking a day row expands to show a summary list of items (similar to `CalendarDaySidebar` content but inline)
   - Quick-add buttons when expanded: + Activity, + Reservation, + Breakfast
   - "Open full day view" link

4. Load more days on scroll (infinite scroll or "Load more" button).

5. Works well on mobile — this replaces the sidebar for mobile editors.

6. Create as `components/AgendaView.tsx`. Import into `HomeClient` and conditionally render based on view toggle.

### Acceptance Criteria

- View toggle visible on editor home page: Calendar | Agenda.
- Selecting "Agenda" renders the agenda view. Selecting "Calendar" renders the month calendar.
- Preference persists across page reloads (localStorage).
- Agenda view shows 14 days of upcoming data with correct counts.
- Clicking a day row expands it to show item summaries and quick-add buttons.
- "Load more" or infinite scroll adds more days.
- Mobile layout is clean and usable at 375px width.
- `pnpm build` passes.

### Implementation Notes

- For data fetching, the agenda view needs activity/reservation/breakfast counts for multiple days. Consider a new server action `getDaySummaries(startDate, endDate)` that returns aggregated counts per day, rather than fetching full data for 14+ days.
- The expanded state could load full data for that day lazily (on expand) to avoid fetching everything upfront.
- For the view toggle, use shadcn/ui `Tabs` or `ToggleGroup` for the switcher UI.
- localStorage key suggestion: `editor-home-view-preference`.

---

## Ticket 14: i18n Key Updates (overhaul terminology)

- [x] **Status:** complete

**Priority:** P2  
**Scope:** `messages/en.json`, `messages/fr.json`, all components using `useTranslations()`  
**Depends on:** Ticket 11, Ticket 12, Ticket 13

### Context

Translation files use old domain terms: "program item", "golf & events", "tee time reservation", "hotel booking". All UI text must reflect the new domain model. Components have been rebuilt in Tickets 7–12 and may have introduced new hardcoded English strings that need translating.

### Requirements

1. **Update `messages/en.json`:**
   - Replace all "program item" references with "activity"
   - Replace "golf & events" with "activities"
   - Replace "tee time reservation" / "tee time reservations" with "reservation" / "reservations"
   - Replace "hotel booking" / "hotel bookings" — remove these keys entirely
   - Add keys for: "breakfast" section, "group name", "expected covers", "party size", "table layout", "service time", "activity tags", "agenda" view
   - Add keys for the agenda view: "agenda", "calendar", "load more", etc.

2. **Update `messages/fr.json`** with French translations for all changed and new keys.

3. **Update all component `useTranslations()` calls** to use the new key names. Key namespaces to check:
   - `Tenant.day.*` (day view)
   - `Tenant.sidebar.*` (calendar sidebar)
   - `Tenant.home.*` (month calendar / agenda)
   - `Tenant.settings.*` (admin settings)
   - Any other namespaces that reference old terms

4. Search for any remaining hardcoded English strings in components that should be translated.

5. `pnpm build` must pass with no missing translation key warnings.

### Acceptance Criteria

- No translation keys reference "program item", "golf", "tee time", or "hotel booking".
- All new UI text (from Tickets 7 through 13) has corresponding keys in both `en.json` and `fr.json`.
- All components use `useTranslations()` — no hardcoded English strings for user-visible text.
- `pnpm build` passes with no missing key warnings.
- Switching locale to French shows correct translations for all new and updated keys.

### Implementation Notes

- Use the existing namespace structure in the translation files. Don't create new top-level namespaces unless necessary.
- For French translations: "activity" = "activité", "activities" = "activités", "reservation" = "réservation", "breakfast" = "petit-déjeuner", "expected covers" = "couverts prévus", "party size" = "nombre de convives", "table layout" = "disposition des tables", "service time" = "heure de service", "activity tags" = "étiquettes d'activité", "group name" = "nom du groupe", "agenda" = "agenda".
- Search for `t("` and `t('` patterns across all `.tsx` files to find translation key usage.
- Check for interpolation patterns (e.g., `{count}`) that may need updating if the key structure changed.

---

# Phase B — Platform & product backlog (after Phase A)

The following tickets assume **Phase A is complete** (activities, reservations, breakfast; no hotel bookings). Where older wording referenced `program_item`, `add-entry-modal`, or hotel UI, interpret it as **`activity` / `activity-form` / post-overhaul surfaces**.

---

## Ticket 15: Legacy Code Cleanup

- [x] **Status:** complete

**Priority:** P0  
**Scope:** `app/actions.ts`, `app/s/[subdomain]/page.tsx`, `lib/subdomains.ts`, `CLAUDE.md`  
**Depends on:** Ticket 14

### Context

The codebase may still contain remnants from the original Vercel Platforms Starter Kit (emoji-based subdomains, `/s/[subdomain]`, `app/actions.ts`). The live system uses tenant actions under `app/actions/`, `[tenant]` routing, Supabase Auth, and Redis for routing. `CLAUDE.md` must match reality **after** the overhaul.

### Requirements

1. Delete `app/actions.ts` if it still exists — legacy `createSubdomainAction` / `deleteSubdomainAction` using the old Redis model. Resolve any imports (e.g. admin dashboard) per Ticket 16 if still applicable.
2. Delete `app/s/[subdomain]/page.tsx` if middleware no longer rewrites there.
3. Refactor `lib/subdomains.ts`: remove legacy `SubdomainData` / `getSubdomainData` / `getAllSubdomains` / `isValidIcon()` if unused. Keep slug sanitization aligned with `TenantRedisData`.
4. Update `CLAUDE.md`: env vars (`REDIS_URL`, Supabase keys), data layer (Supabase + Redis), routing (`/${slug}` → `app/[tenant]/`), server actions location, `vitest` / `pnpm test`, and **post-overhaul** domain terms.
5. No regressions: tenant routes, auth, and actions keep working.

### Implementation Notes

- `lib/subdomain.ts` (singular) — middleware subdomain extraction; do not remove if still in use.
- Run `pnpm build` after changes.

---

## Ticket 16: Superadmin Role & Auth for /admin

- [x] **Status:** complete

**Priority:** P0  
**Scope:** `supabase/migrations/`, `app/admin/page.tsx`, `app/admin/dashboard.tsx`, `middleware.ts`, `app/actions/tenants.ts`  
**Depends on:** Ticket 15

### Context

The `/admin` route must not be public. Protect it with a superadmin role and current tenant actions.

### Requirements

1. `superadmins` table: `id` (uuid PK), `user_id` (uuid FK `auth.users`, unique), `created_at` (timestamptz). RLS: only superadmins can read/write.
2. Server-side guard: authenticated + row in `superadmins`; else redirect to `/auth/sign-in`.
3. `app/admin/page.tsx` — tenants from Supabase `tenants` table.
4. `app/admin/dashboard.tsx` — show `name`, `slug`, `language`, `created_at`; use `deleteTenant(id)` from `app/actions/tenants.ts`; no emoji/legacy fields.
5. `getSuperadminStatus` / `requireSuperadmin()` helper.
6. Seed a superadmin in `supabase/seed.sql` for local dev.

### Implementation Notes

- Middleware continues to block `/admin` from subdomains.
- Use service client or RLS for the superadmin check as appropriate.

---

## Ticket 17: Feature Flags System

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** `supabase/migrations/`, `app/actions/`, `lib/`, `app/[tenant]/`, `app/admin/`  
**Depends on:** Ticket 16

### Context

Enable/disable features per tenant for tiered rollout.

### Requirements

1. `feature_flags` table: `id`, `tenant_id` (FK), `flag_key`, `enabled`, timestamps; unique `(tenant_id, flag_key)`.
2. RLS: superadmins all; tenant members read own tenant.
3. Actions: `getFeatureFlags`, `setFeatureFlag` (superadmin).
4. `FeatureFlagProvider` + `useFeatureFlag(key)`.
5. Superadmin UI: per-tenant toggles for known keys.
6. Wrap **post-overhaul** sections in `DayViewClient.tsx` (e.g. breakfast, activities, reservations) with flag checks.
7. Initial keys (adjust for overhaul): e.g. `breakfast_config`, `reservations`, `points_of_contact`, `activities` — **remove** `hotel_bookings`; add or rename keys to match shipped modules.

### Implementation Notes

- Pass initial flags from `[tenant]/layout.tsx` where possible.
- `KNOWN_FLAGS` constant for toggles when no row exists.

---

## Ticket 18: Member Invitation & Role Management

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** `app/[tenant]/admin/members/page.tsx` (new), `app/actions/memberships.ts` (new), `supabase/migrations/`  
**Depends on:** Ticket 15

### Context

`memberships` exists but no invite/UI for roles.

### Requirements

1. Members page: table (email, role, joined).
2. Invite form (email + `editor`/`viewer`); existing user → membership; else `pending_invitations` + list pending.
3. Editors change others' roles; remove others (not self).
4. RLS on `memberships` for editors/viewers as specified.
5. Nav link from tenant admin settings.
6. On sign-up/sign-in, accept pending invitation → membership.

### Implementation Notes

- Actions: `getMembers`, `inviteMember`, `updateMemberRole`, `removeMember`.
- Editors only on the page.

---

## Ticket 19: Tenant Onboarding Wizard

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** `app/[tenant]/admin/onboarding/page.tsx` (new), `supabase/migrations/`, `app/actions/tenants.ts`, `app/[tenant]/page.tsx`  
**Depends on:** Ticket 18

### Context

Guide new tenants after `/new` through setup.

### Requirements

1. `onboarding_completed` on `tenants` (default false).
2. Wizard steps: branding, language, venue types, POCs, **team invites (Ticket 18)**.
3. Save per step; stepper UI; back navigation; skip-all.
4. After create tenant, redirect to onboarding.
5. Banner on tenant home when incomplete; dismissible (e.g. localStorage).

### Implementation Notes

- Reuse existing tenant/venue/POC/member actions.

---

## Ticket 20: Mobile Design Optimization

- [x] **Status:** completed.

**Priority:** P1  
**Scope:** `components/HomeClient.tsx`, `app/[tenant]/day/[date]/DayViewClient.tsx`, `components/activity-form.tsx`, `components/reservation-form.tsx`, `components/breakfast-form.tsx`, `app/[tenant]/admin/settings/client.tsx`, `app/[tenant]/layout.tsx`  
**Depends on:** Ticket 14

### Context

Staff use phones on the floor; desktop-first UI is hard to use.

### Requirements

1. **Calendar**: ≥44px tap targets; simplify cells on `<640px`; thumb-friendly nav.
2. **Day view**: stack sections; accordions where helpful; FAB reachable.
3. **Forms**: Dialog on desktop, **Drawer on `<640px`** for activity/reservation/breakfast forms (already targeted in overhaul — ensure consistency).
4. **Navigation**: sticky bottom tabs (Home, Today, Settings) on `<640px`; `components/mobile-nav.tsx` in `[tenant]/layout.tsx` with `sm:hidden`.
5. Touch targets ≥44px.
6. Admin settings: vertical nav or select on mobile.
7. Tailwind breakpoints only (no JS viewport detection **unless** already required for Dialog/Drawer switching per existing patterns).

### Implementation Notes

- Test 320–428px widths.
- Preserve desktop layout.

---

## Ticket 21: Feature Request Form

- [x] **Status:** completed.

**Priority:** P2  
**Scope:** `supabase/migrations/`, `app/actions/feature-requests.ts` (new), `app/[tenant]/admin/settings/`, `app/admin/`  
**Depends on:** Ticket 16

### Context

In-app feature requests for tenants and triage for superadmins.

### Requirements

1. `feature_requests` table with status enum-style text, RLS for members/superadmins.
2. Actions: create, list tenant, list all (superadmin), update status.
3. Tab in tenant settings + section in superadmin dashboard.
4. Zod validation on title/description lengths; `Badge` for status colors.

---

## Ticket 22: Notifications System

- [x] **Status:** completed.

**Priority:** P2  
**Scope:** `supabase/migrations/`, `app/actions/notifications.ts` (new), `lib/notifications.ts` (new), `components/notification-bell.tsx` (new), `app/[tenant]/layout.tsx`  
**Depends on:** Ticket 14

### Context

Notify members when schedule data changes.

### Requirements

1. `notifications` table + RLS (own rows).
2. `createNotification`, `notifyTenantMembers` helpers.
3. Call from mutating actions: **post-overhaul** — `createActivity`, `updateActivity`, `deleteActivity`, reservation and breakfast mutations as applicable (replace old `createProgramItem` / hotel hooks).
4. `NotificationBell` in tenant layout; popover; mark read; deep link; mark all read.
5. Polling ~30s acceptable initially.

### Implementation Notes

- `Promise.allSettled` for non-blocking notify.

---

## Ticket 23: Recurring Events Enhancement

- [x] **Status:** completed.

**Priority:** P2  
**Scope:** `supabase/migrations/`, `app/actions/activities.ts`, `components/activity-form.tsx`, `components/activity-card.tsx`  
**Depends on:** Ticket 14

### Context

Stronger recurrence for **activities** (formerly program items).

### Requirements

1. `recurrence_rule` JSONB on **activities** (or equivalent column set already in schema — align with Ticket 1).
2. UI in **activity form** for repeat rules, bulk generation (cap 52), edit/delete this vs all future.
3. Indicator on **activity card** for recurrence groups.
4. Zod schema for rules in `lib/` as appropriate.

### Implementation Notes

- Use `date-fns` for instance generation server-side.

---

## Ticket 24: Day Notes & Comments

- [x] **Status:** completed.

**Priority:** P2  
**Scope:** `supabase/migrations/`, `app/actions/day-notes.ts` (new), `app/[tenant]/day/[date]/DayViewClient.tsx`, `app/[tenant]/day/[date]/queries.ts`  
**Depends on:** Ticket 14

### Context

Day-level internal notes.

### Requirements

1. `day_notes` table + RLS (editors CRUD, viewers read).
2. Actions + UI at top of day view; author, timestamp; edit own; validation 1–2000 chars.
3. Fetch in day queries; `whitespace-pre-wrap`.

---

## Ticket 25: Weather Integration

- [x] **Status:** done.

**Priority:** P2  
**Scope:** `app/[tenant]/day/[date]/DayViewClient.tsx`, `app/actions/weather.ts` (new), `supabase/migrations/`, `app/[tenant]/admin/settings/`  
**Depends on:** Ticket 14

### Context

Forecast in day view via Open-Meteo; Redis cache.

### Requirements

1. `latitude` / `longitude` on `tenants`; settings inputs; Open-Meteo; Redis TTL 30m; card in day view; graceful fallbacks; tenant timezone.

---

## Ticket 26: Copy & Template Day Schedules

- [x] **Status:** done.

**Priority:** P2  
**Scope:** `supabase/migrations/`, `app/actions/schedule-templates.ts` (new), `app/[tenant]/day/[date]/DayViewClient.tsx`  
**Depends on:** Ticket 14

### Context

Copy day and save/apply templates for **activities**.

### Requirements

1. Copy day's **activities** to another date.
2. `schedule_templates` JSONB for activity-shaped items; save/apply/replace or merge; settings management; RLS for editors.

---

## Ticket 27: Dark Mode Refinement

- [ ] **Status:** pending — set to `[x]` when done.

**Priority:** P3  
**Scope:** `app/globals.css`, `components/`, `app/[tenant]/day/[date]/DayViewClient.tsx`, `components/HomeClient.tsx`  
**Depends on:** Ticket 14

### Context

Theme-aware colors across custom UI; print styles; accent contrast.

### Requirements

1. Replace hard-coded colors with variables / `dark:` variants.
2. Calendar, day view, emoji picker, accent contrast helper; `@media print` light mode.

---

## Ticket 28: PWA Enhancement

- [ ] **Status:** pending — set to `[x]` when done.

**Priority:** P3  
**Scope:** `public/sw.js`, `public/manifest.webmanifest`, `components/pwa-register.tsx`, `components/pwa-install-prompt.tsx`, `next.config.ts`  
**Depends on:** Ticket 14

### Context

Real offline/shell caching; install prompt; icons.

### Requirements

Workbox/serwist-style SW; manifest; icons from `icon.svg`; install banner; offline indicator; don’t cache auth/mutations.

---

## Ticket 29: Internationalization Hardening

- [ ] **Status:** pending — set to `[x]` when done.

**Priority:** P3  
**Scope:** `messages/en.json`, `messages/fr.json`, `messages/es.json` (new), `messages/de.json` (new), components, `lib/day-utils.ts`, `app/layout.tsx`  
**Depends on:** Ticket 14

### Context

Full audit + **es**/**de** locales after overhaul strings (Ticket 14).

### Requirements

1. Audit hardcoded strings → `useTranslations` / `getTranslations`.
2. Add `es.json`, `de.json`.
3. Date/number formatting per tenant locale; `dir` on layout for future RTL.
4. Language selector includes `es` / `de`.

---

## Ticket 30: Rate Limiting & Security

- [ ] **Status:** pending — set to `[x]` when done.

**Priority:** P3  
**Scope:** `app/actions/auth.ts`, `app/actions/`, `middleware.ts`, `next.config.ts`  
**Depends on:** Ticket 14

### Context

Rate limits + security headers + Zod audit.

### Requirements

Upstash ratelimit (or adapter to Redis), auth + mutation limits, `ActionResponse` on throttle, headers (X-Frame-Options, CSP starter, etc.), schema bounds audit.

---

## Ticket 31: Error Monitoring Integration

- [ ] **Status:** pending — set to `[x]` when done.

**Priority:** P3  
**Scope:** `next.config.ts`, `app/error.tsx`, `app/[tenant]/not-found.tsx`, `app/layout.tsx`, `app/actions/`  
**Depends on:** Ticket 14

### Context

Sentry (or PostHog exceptions) with tenant/user context.

### Requirements

SDK setup, `withSentryConfig`, context in `[tenant]` layout and actions, error boundary reporting, env examples, source maps.

---

## Ticket 32: Accessibility Audit & Fixes

- [ ] **Status:** pending — set to `[x]` when done.

**Priority:** P3  
**Scope:** `components/`, `app/[tenant]/layout.tsx`, `app/globals.css`  
**Depends on:** Ticket 14

### Context

WCAG 2.1 AA target.

### Requirements

Skip link, `aria-label`s, focus/aria-live, contrast, labels, keyboard calendar nav, logical tab order. Optional `@axe-core/react` in dev.

---

## Ticket 33: Tenant Suspension & Lifecycle Management

- [ ] **Status:** pending — set to `[x]` when done.

**Priority:** P3  
**Scope:** `supabase/migrations/`, `middleware.ts`, `app/actions/tenants.ts`, `app/admin/dashboard.tsx`  
**Depends on:** Ticket 16

### Context

Suspend/reactivate/archive; deletion cleanup (Redis, storage, cascades).

### Requirements

`status` on tenants; middleware branded suspended page; actions; superadmin UI; typed delete confirmation; `TenantRedisData.status`.

---

## Ticket 34: Automated E2E Test Suite

- [ ] **Status:** pending — set to `[x]` when done.

**Priority:** P3  
**Scope:** `playwright.config.ts` (new), `tests/e2e/` (new), `package.json`  
**Depends on:** Ticket 14

### Context

Playwright flows for tenant create, auth, **activity**/reservation/breakfast CRUD as applicable, settings, subdomain routing.

### Requirements

Install Playwright, fixtures with Supabase service role, idempotent tests, `pnpm test:e2e`.

---

## Quick dependency reference (Phase B)

| Ticket | Depends on |
|--------|------------|
| 15 | 14 |
| 16 | 15 |
| 17 | 16 |
| 18 | 15 |
| 19 | 18 |
| 20 | 14 |
| 21 | 16 |
| 22 | 14 |
| 23 | 14 |
| 24 | 14 |
| 25 | 14 |
| 26 | 14 |
| 27 | 14 |
| 28 | 14 |
| 29 | 14 |
| 30 | 14 |
| 31 | 14 |
| 32 | 14 |
| 33 | 16 |
| 34 | 14 |
