BEGIN;

-- 1. Phone column on memberships
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS phone text;

-- 2. Per-member weekly schedule
CREATE TABLE member_schedule (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  membership_id  uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  day_of_week    smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time     text NOT NULL,
  end_time       text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id, day_of_week, start_time)
);

CREATE INDEX member_schedule_tenant_idx ON member_schedule (tenant_id);
CREATE INDEX member_schedule_membership_idx ON member_schedule (membership_id);

ALTER TABLE member_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_schedule: members can select"
  ON member_schedule FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "member_schedule: editors can insert"
  ON member_schedule FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "member_schedule: editors can update"
  ON member_schedule FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "member_schedule: editors can delete"
  ON member_schedule FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

-- 3. auto_generated flag on shift (cron-materialised shifts vs manual ones)
ALTER TABLE shift ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT true;

-- Allow idempotent upsert by cron: (tenant, day, user, start_time) is unique
CREATE UNIQUE INDEX shift_auto_key_idx ON shift (tenant_id, day_id, user_id, start_time);

COMMIT;
