-- Schedule templates: reusable activity blueprints per tenant
CREATE TABLE schedule_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  items       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON schedule_templates(tenant_id);

ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read templates"
  ON schedule_templates FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "editors can manage templates"
  ON schedule_templates FOR ALL
  USING (is_tenant_editor(tenant_id));
