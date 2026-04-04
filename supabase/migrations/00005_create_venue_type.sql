CREATE TABLE venue_type (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  code       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-tenant uniqueness (case-insensitive)
CREATE UNIQUE INDEX venue_type_tenant_name_unique
  ON venue_type (tenant_id, lower(name));

CREATE UNIQUE INDEX venue_type_tenant_code_unique
  ON venue_type (tenant_id, lower(code))
  WHERE code IS NOT NULL AND code <> '';

ALTER TABLE venue_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_type: members can select"
  ON venue_type FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "venue_type: editors can insert"
  ON venue_type FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "venue_type: editors can update"
  ON venue_type FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "venue_type: editors can delete"
  ON venue_type FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));
