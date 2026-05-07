-- =============================================================================
-- Migration 00041: Remove hand-over — revert soft-delete, drop day_view_receipt,
-- restore hard DELETE RLS, restore hard unique on breakfast_configuration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Hard-delete any soft-deleted rows before dropping the columns
-- ---------------------------------------------------------------------------

DELETE FROM activity WHERE deleted_at IS NOT NULL;
DELETE FROM reservation WHERE deleted_at IS NOT NULL;
DELETE FROM breakfast_configuration WHERE deleted_at IS NOT NULL;
DELETE FROM day_notes WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Drop partial indexes on deleted_at
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS activity_day_deleted_at_idx;
DROP INDEX IF EXISTS reservation_day_deleted_at_idx;
DROP INDEX IF EXISTS breakfast_configuration_day_deleted_at_idx;
DROP INDEX IF EXISTS day_notes_day_deleted_at_idx;

-- ---------------------------------------------------------------------------
-- 3. Drop deleted_at columns
-- ---------------------------------------------------------------------------

ALTER TABLE activity DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE reservation DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE breakfast_configuration DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE day_notes DROP COLUMN IF EXISTS deleted_at;

-- ---------------------------------------------------------------------------
-- 4. Restore hard unique on breakfast_configuration (tenant, day, start_time)
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS breakfast_configuration_tenant_day_time_live_unique;

ALTER TABLE breakfast_configuration
  ADD CONSTRAINT breakfast_configuration_tenant_day_time_unique
  UNIQUE (tenant_id, day_id, start_time);

-- ---------------------------------------------------------------------------
-- 5. Drop day_view_receipt table
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS day_view_receipt;

-- ---------------------------------------------------------------------------
-- 6. Restore hard DELETE RLS policies on the four tables
-- ---------------------------------------------------------------------------

CREATE POLICY "activity: editors can delete"
  ON activity FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "reservation: editors can delete"
  ON reservation FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "breakfast_configuration: editors can delete"
  ON breakfast_configuration FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "day_notes: editors can delete own"
  ON day_notes FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id) AND user_id = auth.uid());
