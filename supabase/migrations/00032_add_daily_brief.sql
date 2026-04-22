-- =============================================================================
-- Migration 00032: Cached LLM daily brief per tenant + day
-- =============================================================================

BEGIN;

CREATE TABLE daily_brief (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_id         uuid NOT NULL REFERENCES day(id) ON DELETE CASCADE,
  content        jsonb NOT NULL,
  generated_at   timestamptz NOT NULL DEFAULT now(),
  generated_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model          text NOT NULL,
  prompt_version text NOT NULL
);

CREATE UNIQUE INDEX daily_brief_tenant_day_unique
  ON daily_brief (tenant_id, day_id);

CREATE INDEX daily_brief_day_idx ON daily_brief (day_id);

ALTER TABLE daily_brief ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_brief: members can select"
  ON daily_brief FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "daily_brief: editors can insert"
  ON daily_brief FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id) AND generated_by = auth.uid());

CREATE POLICY "daily_brief: editors can update"
  ON daily_brief FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id))
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "daily_brief: editors can delete"
  ON daily_brief FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

COMMIT;
