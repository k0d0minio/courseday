CREATE TABLE program_item (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_id              UUID NOT NULL REFERENCES day(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('golf', 'event')),
  title               TEXT NOT NULL,
  description         TEXT,
  start_time          TEXT,
  end_time            TEXT,
  guest_count         INT,
  capacity            INT,
  venue_type_id       UUID REFERENCES venue_type(id) ON DELETE SET NULL,
  poc_id              UUID REFERENCES point_of_contact(id) ON DELETE SET NULL,
  table_breakdown     JSONB,
  is_tour_operator    BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  is_recurring        BOOLEAN NOT NULL DEFAULT false,
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  recurrence_group_id UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX program_item_tenant_day_idx ON program_item (tenant_id, day_id);

ALTER TABLE program_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "program_item: members can select"
  ON program_item FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "program_item: editors can insert"
  ON program_item FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "program_item: editors can update"
  ON program_item FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "program_item: editors can delete"
  ON program_item FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));
