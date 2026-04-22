-- =============================================================================
-- Migration 00029: Checklists per venue type and activity tag
-- =============================================================================
--
-- Introduces three tables:
--   1. checklist_template         — a reusable list owned by a tenant, scoped to
--                                   exactly one venue_type OR activity_tag.
--   2. checklist_template_item    — ordered items on a template.
--   3. activity_checklist_item    — per-activity snapshot of items. Copied at
--                                   activity creation so edits to the template
--                                   do not mutate historical activities.
--
-- RLS: members can SELECT; editors can INSERT/UPDATE/DELETE. Ticking is an
-- UPDATE on activity_checklist_item and is therefore editor-only.
--
-- Realtime: activity_checklist_item is added to supabase_realtime with
-- REPLICA IDENTITY FULL so day-view clients can react to ticks live.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. checklist_template
-- ---------------------------------------------------------------------------

CREATE TABLE checklist_template (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  venue_type_id    UUID        NULL REFERENCES venue_type(id) ON DELETE CASCADE,
  activity_tag_id  UUID        NULL REFERENCES activity_tag(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT checklist_template_scope_exactly_one CHECK (
    (venue_type_id IS NOT NULL AND activity_tag_id IS NULL) OR
    (venue_type_id IS NULL     AND activity_tag_id IS NOT NULL)
  )
);

CREATE INDEX checklist_template_tenant_idx
  ON checklist_template(tenant_id);

CREATE INDEX checklist_template_venue_type_idx
  ON checklist_template(venue_type_id)
  WHERE venue_type_id IS NOT NULL;

CREATE INDEX checklist_template_activity_tag_idx
  ON checklist_template(activity_tag_id)
  WHERE activity_tag_id IS NOT NULL;

ALTER TABLE checklist_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_template: members can select"
  ON checklist_template FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "checklist_template: editors can insert"
  ON checklist_template FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "checklist_template: editors can update"
  ON checklist_template FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "checklist_template: editors can delete"
  ON checklist_template FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

-- ---------------------------------------------------------------------------
-- 2. checklist_template_item
-- ---------------------------------------------------------------------------

CREATE TABLE checklist_template_item (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID        NOT NULL REFERENCES checklist_template(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX checklist_template_item_template_idx
  ON checklist_template_item(template_id, position);

ALTER TABLE checklist_template_item ENABLE ROW LEVEL SECURITY;

-- Scope via parent template's tenant.
CREATE POLICY "checklist_template_item: members can select"
  ON checklist_template_item FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklist_template t
      WHERE t.id = template_id
        AND is_tenant_member(t.tenant_id)
    )
  );

CREATE POLICY "checklist_template_item: editors can insert"
  ON checklist_template_item FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklist_template t
      WHERE t.id = template_id
        AND is_tenant_editor(t.tenant_id)
    )
  );

CREATE POLICY "checklist_template_item: editors can update"
  ON checklist_template_item FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklist_template t
      WHERE t.id = template_id
        AND is_tenant_editor(t.tenant_id)
    )
  );

CREATE POLICY "checklist_template_item: editors can delete"
  ON checklist_template_item FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklist_template t
      WHERE t.id = template_id
        AND is_tenant_editor(t.tenant_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. activity_checklist_item  (snapshot of template items at activity creation)
-- ---------------------------------------------------------------------------
--
-- tenant_id and day_id are denormalised so RLS is O(1) and realtime clients
-- can filter by day_id=eq.<uuid> without a join. They are set from the parent
-- activity at insert time and should stay in sync.

CREATE TABLE activity_checklist_item (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_id      UUID        NOT NULL REFERENCES day(id) ON DELETE CASCADE,
  activity_id UUID        NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  position    INTEGER     NOT NULL DEFAULT 0,
  is_done     BOOLEAN     NOT NULL DEFAULT false,
  done_by     UUID        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  done_at     TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX activity_checklist_item_activity_idx
  ON activity_checklist_item(activity_id, position);

CREATE INDEX activity_checklist_item_day_idx
  ON activity_checklist_item(day_id);

ALTER TABLE activity_checklist_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_checklist_item: members can select"
  ON activity_checklist_item FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "activity_checklist_item: editors can insert"
  ON activity_checklist_item FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "activity_checklist_item: editors can update"
  ON activity_checklist_item FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "activity_checklist_item: editors can delete"
  ON activity_checklist_item FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

-- ---------------------------------------------------------------------------
-- 4. updated_at trigger on checklist_template
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION checklist_template_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checklist_template_touch_updated_at_trigger
  BEFORE UPDATE ON checklist_template
  FOR EACH ROW
  EXECUTE FUNCTION checklist_template_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Enable realtime for activity_checklist_item
-- ---------------------------------------------------------------------------

ALTER TABLE activity_checklist_item REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_checklist_item;

COMMIT;
