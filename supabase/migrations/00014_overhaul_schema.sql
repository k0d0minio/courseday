-- =============================================================================
-- Migration 00014: Domain overhaul — drop hotel_booking, rename program_item
-- to activity, restructure reservation & breakfast_configuration, add
-- activity_tag and activity_tag_assignment tables.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Create activity_tag table
-- ---------------------------------------------------------------------------

CREATE TABLE activity_tag (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT activity_tag_tenant_name_unique UNIQUE (tenant_id, name)
);

ALTER TABLE activity_tag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_tag: members can select"
  ON activity_tag FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "activity_tag: editors can insert"
  ON activity_tag FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "activity_tag: editors can update"
  ON activity_tag FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "activity_tag: editors can delete"
  ON activity_tag FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

-- ---------------------------------------------------------------------------
-- 2. Rename program_item → activity; rename/drop columns
-- ---------------------------------------------------------------------------

ALTER TABLE program_item RENAME TO activity;

-- Rename the index
ALTER INDEX program_item_tenant_day_idx RENAME TO activity_tenant_day_idx;

-- Rename column guest_count → expected_covers
ALTER TABLE activity RENAME COLUMN guest_count TO expected_covers;

-- Drop columns no longer needed
ALTER TABLE activity
  DROP COLUMN type,
  DROP COLUMN table_breakdown,
  DROP COLUMN capacity,
  DROP COLUMN is_tour_operator;

-- Rename existing RLS policies for clarity
ALTER POLICY "program_item: members can select" ON activity
  RENAME TO "activity: members can select";

ALTER POLICY "program_item: editors can insert" ON activity
  RENAME TO "activity: editors can insert";

ALTER POLICY "program_item: editors can update" ON activity
  RENAME TO "activity: editors can update";

ALTER POLICY "program_item: editors can delete" ON activity
  RENAME TO "activity: editors can delete";

-- ---------------------------------------------------------------------------
-- 3. Create activity_tag_assignment join table
-- ---------------------------------------------------------------------------

CREATE TABLE activity_tag_assignment (
  activity_id UUID NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES activity_tag(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, tag_id)
);

ALTER TABLE activity_tag_assignment ENABLE ROW LEVEL SECURITY;

-- For join-table policies we scope by the activity's tenant via a subquery
CREATE POLICY "activity_tag_assignment: members can select"
  ON activity_tag_assignment FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activity a
      WHERE a.id = activity_id
        AND is_tenant_member(a.tenant_id)
    )
  );

CREATE POLICY "activity_tag_assignment: editors can insert"
  ON activity_tag_assignment FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activity a
      WHERE a.id = activity_id
        AND is_tenant_editor(a.tenant_id)
    )
  );

CREATE POLICY "activity_tag_assignment: editors can delete"
  ON activity_tag_assignment FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activity a
      WHERE a.id = activity_id
        AND is_tenant_editor(a.tenant_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Modify reservation table
-- ---------------------------------------------------------------------------

-- Drop FK to hotel_booking (added in 00009)
ALTER TABLE reservation
  DROP CONSTRAINT IF EXISTS fk_reservation_hotel_booking;

-- Drop FK to program_item (inline in 00008)
ALTER TABLE reservation
  DROP CONSTRAINT IF EXISTS reservation_program_item_id_fkey;

-- Drop unwanted columns
ALTER TABLE reservation
  DROP COLUMN IF EXISTS hotel_booking_id,
  DROP COLUMN IF EXISTS program_item_id,
  DROP COLUMN IF EXISTS table_index,
  DROP COLUMN IF EXISTS guest_email,
  DROP COLUMN IF EXISTS guest_phone;

-- Add table_breakdown
ALTER TABLE reservation
  ADD COLUMN table_breakdown JSONB;

-- ---------------------------------------------------------------------------
-- 5. Modify breakfast_configuration table
-- ---------------------------------------------------------------------------

-- Drop old unique constraint that references hotel_booking_id
ALTER TABLE breakfast_configuration
  DROP CONSTRAINT IF EXISTS breakfast_configuration_unique;

-- Drop trigger that may reference hotel_booking
DROP TRIGGER IF EXISTS breakfast_total_guests_trigger ON breakfast_configuration;

-- Drop FK and column to hotel_booking
ALTER TABLE breakfast_configuration
  DROP CONSTRAINT IF EXISTS breakfast_configuration_hotel_booking_id_fkey;

ALTER TABLE breakfast_configuration
  DROP COLUMN IF EXISTS hotel_booking_id;

-- Add new columns
ALTER TABLE breakfast_configuration
  ADD COLUMN day_id     UUID REFERENCES day(id) ON DELETE CASCADE,
  ADD COLUMN group_name TEXT;

-- Existing rows are scoped to hotel_booking (dropped below) and cannot be
-- mapped to a day_id. Delete them so NOT NULL can be enforced cleanly.
DELETE FROM breakfast_configuration;

ALTER TABLE breakfast_configuration
  ALTER COLUMN day_id SET NOT NULL;

-- Add new unique constraint
ALTER TABLE breakfast_configuration
  ADD CONSTRAINT breakfast_configuration_tenant_day_time_unique
  UNIQUE (tenant_id, day_id, start_time);

-- Recreate the trigger (unchanged logic — sums table_breakdown)
CREATE TRIGGER breakfast_total_guests_trigger
  BEFORE INSERT OR UPDATE OF table_breakdown
  ON breakfast_configuration
  FOR EACH ROW
  EXECUTE FUNCTION compute_breakfast_total_guests();

-- ---------------------------------------------------------------------------
-- 6. Drop hotel_booking table (all FKs referencing it already dropped above)
-- ---------------------------------------------------------------------------

DROP TABLE hotel_booking;

COMMIT;
