BEGIN;

CREATE TABLE shift_template (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  role            text NOT NULL DEFAULT '',
  start_time      text,
  end_time        text,
  default_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shift_template_tenant_id_idx ON shift_template (tenant_id);
CREATE UNIQUE INDEX shift_template_tenant_name_unique
  ON shift_template (tenant_id, lower(name));

ALTER TABLE shift_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_template: members can select"
  ON shift_template FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "shift_template: editors can insert"
  ON shift_template FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "shift_template: editors can update"
  ON shift_template FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "shift_template: editors can delete"
  ON shift_template FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

COMMIT;
