-- =============================================================================
-- Migration 00032: Hand-over — soft-delete on day entities, day_view_receipt,
-- breakfast partial unique index, realtime for day_notes, revoke client DELETE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Soft-delete columns
-- ---------------------------------------------------------------------------

ALTER TABLE activity
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE reservation
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE breakfast_configuration
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE day_notes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS activity_day_deleted_at_idx
  ON activity (day_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS reservation_day_deleted_at_idx
  ON reservation (day_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS breakfast_configuration_day_deleted_at_idx
  ON breakfast_configuration (day_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS day_notes_day_deleted_at_idx
  ON day_notes (day_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Breakfast: unique (tenant, day, start_time) only for live rows
-- ---------------------------------------------------------------------------

ALTER TABLE breakfast_configuration
  DROP CONSTRAINT IF EXISTS breakfast_configuration_tenant_day_time_unique;

CREATE UNIQUE INDEX IF NOT EXISTS breakfast_configuration_tenant_day_time_live_unique
  ON breakfast_configuration (tenant_id, day_id, start_time)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. day_view_receipt
-- ---------------------------------------------------------------------------

CREATE TABLE day_view_receipt (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_id          uuid NOT NULL REFERENCES day(id) ON DELETE CASCADE,
  last_viewed_at  timestamptz NOT NULL,
  PRIMARY KEY (user_id, day_id)
);

CREATE INDEX day_view_receipt_tenant_day_idx
  ON day_view_receipt (tenant_id, day_id);

ALTER TABLE day_view_receipt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day_view_receipt: owner can select"
  ON day_view_receipt FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id) AND user_id = auth.uid());

CREATE POLICY "day_view_receipt: owner can insert"
  ON day_view_receipt FOR INSERT TO authenticated
  WITH CHECK (is_tenant_member(tenant_id) AND user_id = auth.uid());

CREATE POLICY "day_view_receipt: owner can update"
  ON day_view_receipt FOR UPDATE TO authenticated
  USING (is_tenant_member(tenant_id) AND user_id = auth.uid())
  WITH CHECK (is_tenant_member(tenant_id) AND user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Revoke hard DELETE on day entities (soft-delete via UPDATE only)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "activity: editors can delete" ON activity;
DROP POLICY IF EXISTS "reservation: editors can delete" ON reservation;
DROP POLICY IF EXISTS "breakfast_configuration: editors can delete" ON breakfast_configuration;
DROP POLICY IF EXISTS "day_notes: editors can delete own" ON day_notes;

-- ---------------------------------------------------------------------------
-- 5. Realtime: day_notes
-- ---------------------------------------------------------------------------

ALTER TABLE day_notes REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE day_notes;
