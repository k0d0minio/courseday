-- =============================================================================
-- Migration 00022: Day notes
-- =============================================================================

CREATE TABLE day_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_id      uuid NOT NULL REFERENCES day(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX day_notes_day_idx ON day_notes (day_id, created_at);

ALTER TABLE day_notes ENABLE ROW LEVEL SECURITY;

-- Any tenant member can read notes
CREATE POLICY "day_notes: members can select"
  ON day_notes FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

-- Editors can insert their own notes
CREATE POLICY "day_notes: editors can insert"
  ON day_notes FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id) AND user_id = auth.uid());

-- Editors can update only their own notes
CREATE POLICY "day_notes: editors can update own"
  ON day_notes FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id) AND user_id = auth.uid())
  WITH CHECK (is_tenant_editor(tenant_id) AND user_id = auth.uid());

-- Editors can delete only their own notes
CREATE POLICY "day_notes: editors can delete own"
  ON day_notes FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id) AND user_id = auth.uid());
