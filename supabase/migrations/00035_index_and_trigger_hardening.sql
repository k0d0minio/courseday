-- =============================================================================
-- Migration 00035: Index + trigger hardening
-- =============================================================================
--
-- Two corrections to earlier migrations:
--
-- 1. activity_checklist_item.tenant_id had no index. RLS policies on this
--    table call is_tenant_member(tenant_id) / is_tenant_editor(tenant_id),
--    and several queries filter by tenant_id directly. Without an index,
--    these scan the table.
--
-- 2. shift has updated_at column (00031) but no BEFORE UPDATE trigger to
--    keep it fresh. Manual writers can forget to set it. Add the same
--    touch_updated_at pattern used for checklist_template (00029).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Index on activity_checklist_item.tenant_id
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS activity_checklist_item_tenant_idx
  ON activity_checklist_item(tenant_id);

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger on shift
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION shift_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shift_touch_updated_at_trigger ON shift;

CREATE TRIGGER shift_touch_updated_at_trigger
  BEFORE UPDATE ON shift
  FOR EACH ROW
  EXECUTE FUNCTION shift_touch_updated_at();

COMMIT;
