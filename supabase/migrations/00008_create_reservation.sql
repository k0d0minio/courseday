CREATE TABLE reservation (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_id           UUID NOT NULL REFERENCES day(id) ON DELETE CASCADE,
  guest_name       TEXT,
  guest_email      TEXT,
  guest_phone      TEXT,
  guest_count      INT,
  start_time       TEXT,
  end_time         TEXT,
  notes            TEXT,
  -- hotel_booking_id FK added in 00009_create_hotel_booking.sql
  hotel_booking_id UUID,
  program_item_id  UUID REFERENCES program_item(id) ON DELETE SET NULL,
  table_index      INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reservation_tenant_day_idx ON reservation (tenant_id, day_id);

ALTER TABLE reservation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservation: members can select"
  ON reservation FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "reservation: editors can insert"
  ON reservation FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "reservation: editors can update"
  ON reservation FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "reservation: editors can delete"
  ON reservation FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));
