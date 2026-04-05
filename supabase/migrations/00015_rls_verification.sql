-- =============================================================================
-- Migration 00015: RLS policy verification & fixes (post-migration 00014)
-- =============================================================================
-- Migration 00014 renamed program_item → activity (policies renamed in-place),
-- created activity_tag (full CRUD policies), and activity_tag_assignment
-- (SELECT/INSERT/DELETE policies). This migration adds the missing UPDATE policy
-- on activity_tag_assignment to give editors full CRUD, matching the pattern
-- used on all other editor-writable tables.
--
-- All other tables have been audited and their policies are correct:
--   activity           — SELECT (members), INSERT/UPDATE/DELETE (editors) ✓
--   reservation        — SELECT (members), INSERT/UPDATE/DELETE (editors) ✓
--   breakfast_config   — SELECT (members), INSERT/UPDATE/DELETE (editors) ✓
--   activity_tag       — SELECT (members), INSERT/UPDATE/DELETE (editors) ✓
--   day                — SELECT (members) only; INSERT via service role ✓
--   venue_type         — SELECT (members), INSERT/UPDATE/DELETE (editors) ✓
--   point_of_contact   — SELECT (members), INSERT/UPDATE/DELETE (editors) ✓
--   tenants            — SELECT (members via is_tenant_member) ✓
--   memberships        — unchanged inline policies ✓
--
-- Helper functions is_tenant_member / is_tenant_editor (00003_rls_helpers.sql)
-- query only the memberships table and are unaffected by the 00014 rename. ✓
-- =============================================================================

-- activity_tag_assignment was missing an UPDATE policy for editors.
-- (The table has only PK columns so UPDATE is a no-op in practice, but the
-- policy is required to satisfy the full-CRUD editor requirement consistently.)
CREATE POLICY "activity_tag_assignment: editors can update"
  ON activity_tag_assignment FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activity a
      WHERE a.id = activity_id
        AND is_tenant_editor(a.tenant_id)
    )
  );
