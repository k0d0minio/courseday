-- =============================================================================
-- Migration 00031: Staff members, role presets, shifts (per-day schedule)
-- =============================================================================

BEGIN;

CREATE TABLE staff_member (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT '',
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX staff_member_tenant_id_idx ON staff_member (tenant_id);
CREATE INDEX staff_member_tenant_active_idx ON staff_member (tenant_id) WHERE active = true;

ALTER TABLE staff_member ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_member: members can select"
  ON staff_member FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "staff_member: editors can insert"
  ON staff_member FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "staff_member: editors can update"
  ON staff_member FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "staff_member: editors can delete"
  ON staff_member FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

-- Tenant-configurable role labels (combobox presets)
CREATE TABLE staff_role (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX staff_role_tenant_name_unique
  ON staff_role (tenant_id, lower(name));

CREATE INDEX staff_role_tenant_id_idx ON staff_role (tenant_id);

ALTER TABLE staff_role ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_role: members can select"
  ON staff_role FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "staff_role: editors can insert"
  ON staff_role FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "staff_role: editors can update"
  ON staff_role FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "staff_role: editors can delete"
  ON staff_role FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE TABLE shift (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_id           UUID NOT NULL REFERENCES day(id) ON DELETE CASCADE,
  staff_member_id  UUID NOT NULL REFERENCES staff_member(id) ON DELETE RESTRICT,
  role             TEXT NOT NULL DEFAULT '',
  start_time       TEXT,
  end_time         TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shift_tenant_day_idx ON shift (tenant_id, day_id);
CREATE INDEX shift_staff_member_idx ON shift (staff_member_id);

ALTER TABLE shift ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift: members can select"
  ON shift FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "shift: editors can insert"
  ON shift FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "shift: editors can update"
  ON shift FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "shift: editors can delete"
  ON shift FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

ALTER PUBLICATION supabase_realtime ADD TABLE shift;

COMMIT;
