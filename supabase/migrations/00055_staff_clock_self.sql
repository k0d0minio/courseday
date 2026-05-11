-- =============================================================================
-- Migration 00055: allow staff (non-editor) to clock themselves in/out
-- =============================================================================
--
-- Adds an additional UPDATE policy on `shift` that permits a tenant member to
-- update a shift row when it belongs to them (`user_id = auth.uid()`).
--
-- Postgres permissive policies are OR'd, so the existing editor policy keeps
-- editors fully empowered while this new policy unlocks self-updates for
-- staff.
--
-- Column-level safety (only `actual_start` / `actual_end` may be written by a
-- non-editor) is NOT enforceable via RLS alone — the server actions in
-- `app/actions/shifts.ts` constrain which columns are passed to UPDATE.

BEGIN;

CREATE POLICY "shift: owner can update own row for clocking"
  ON shift FOR UPDATE TO authenticated
  USING (is_tenant_member(tenant_id) AND user_id = auth.uid())
  WITH CHECK (is_tenant_member(tenant_id) AND user_id = auth.uid());

COMMIT;
