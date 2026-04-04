CREATE TABLE point_of_contact (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-tenant uniqueness (case-insensitive)
CREATE UNIQUE INDEX poc_tenant_name_unique
  ON point_of_contact (tenant_id, lower(name))
  WHERE name IS NOT NULL;

CREATE UNIQUE INDEX poc_tenant_email_unique
  ON point_of_contact (tenant_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX poc_tenant_phone_unique
  ON point_of_contact (tenant_id, phone)
  WHERE phone IS NOT NULL AND phone <> '';

ALTER TABLE point_of_contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poc: members can select"
  ON point_of_contact FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "poc: editors can insert"
  ON point_of_contact FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "poc: editors can update"
  ON point_of_contact FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "poc: editors can delete"
  ON point_of_contact FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));
