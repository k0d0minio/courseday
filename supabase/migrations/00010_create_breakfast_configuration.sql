CREATE TABLE breakfast_configuration (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hotel_booking_id UUID NOT NULL REFERENCES hotel_booking(id) ON DELETE CASCADE,
  breakfast_date   TEXT NOT NULL,
  table_breakdown  JSONB,
  total_guests     INT NOT NULL DEFAULT 0,
  start_time       TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT breakfast_configuration_unique UNIQUE (hotel_booking_id, breakfast_date)
);

-- Trigger: recompute total_guests from table_breakdown on every insert/update
CREATE OR REPLACE FUNCTION compute_breakfast_total_guests()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.table_breakdown IS NULL THEN
    NEW.total_guests := 0;
  ELSE
    SELECT COALESCE(SUM(val::int), 0)
    INTO NEW.total_guests
    FROM jsonb_array_elements(NEW.table_breakdown) AS val;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER breakfast_total_guests_trigger
  BEFORE INSERT OR UPDATE OF table_breakdown
  ON breakfast_configuration
  FOR EACH ROW
  EXECUTE FUNCTION compute_breakfast_total_guests();

ALTER TABLE breakfast_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "breakfast_configuration: members can select"
  ON breakfast_configuration FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "breakfast_configuration: editors can insert"
  ON breakfast_configuration FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "breakfast_configuration: editors can update"
  ON breakfast_configuration FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "breakfast_configuration: editors can delete"
  ON breakfast_configuration FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));
