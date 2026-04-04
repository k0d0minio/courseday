CREATE TABLE hotel_booking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_name      TEXT NOT NULL,
  guest_count     INT NOT NULL,
  check_in        TEXT NOT NULL,
  check_out       TEXT NOT NULL,
  is_tour_operator BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hotel_booking_dates_check CHECK (check_in < check_out)
);

-- FK deferred from T-23: link reservation.hotel_booking_id to hotel_booking
ALTER TABLE reservation
  ADD CONSTRAINT fk_reservation_hotel_booking
  FOREIGN KEY (hotel_booking_id) REFERENCES hotel_booking(id) ON DELETE SET NULL;

ALTER TABLE hotel_booking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_booking: members can select"
  ON hotel_booking FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "hotel_booking: editors can insert"
  ON hotel_booking FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "hotel_booking: editors can update"
  ON hotel_booking FOR UPDATE TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "hotel_booking: editors can delete"
  ON hotel_booking FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));
