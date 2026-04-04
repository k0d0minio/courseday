// Re-export generated Supabase types
export type { Database, Tables, TablesInsert, TablesUpdate } from './supabase';

// ── Existing table aliases ───────────────────────────────────────────────────

import type { Tables, TablesInsert, TablesUpdate } from './supabase';

export type Tenant = Tables<'tenants'>;
export type TenantInsert = TablesInsert<'tenants'>;
export type TenantUpdate = TablesUpdate<'tenants'>;

export type Membership = Tables<'memberships'>;
export type MembershipInsert = TablesInsert<'memberships'>;
export type MembershipUpdate = TablesUpdate<'memberships'>;

// ── Future table aliases (populated when tables are created and db:types is re-run) ──
// These are stubs that will be replaced with generated row types.

/** @todo Replace with Tables<'days'> once the days table migration exists */
export type Day = {
  id: string;
  tenant_id: string;
  date: string;
  created_at: string;
  updated_at: string;
};
export type DayInsert = Omit<Day, 'id' | 'created_at' | 'updated_at'>;
export type DayUpdate = Partial<DayInsert>;

/** @todo Replace with Tables<'program_items'> once the program_items migration exists */
export type ProgramItem = {
  id: string;
  tenant_id: string;
  day_id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  venue_type_id: string | null;
  point_of_contact_id: string | null;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
};
export type ProgramItemInsert = Omit<ProgramItem, 'id' | 'created_at' | 'updated_at'>;
export type ProgramItemUpdate = Partial<ProgramItemInsert>;

/** @todo Replace with Tables<'reservations'> once the reservations migration exists */
export type Reservation = {
  id: string;
  tenant_id: string;
  day_id: string;
  guest_name: string;
  tee_time: string | null;
  holes: number | null;
  hotel_booking_id: string | null;
  program_item_id: string | null;
  created_at: string;
  updated_at: string;
};
export type ReservationInsert = Omit<Reservation, 'id' | 'created_at' | 'updated_at'>;
export type ReservationUpdate = Partial<ReservationInsert>;

/** @todo Replace with Tables<'hotel_bookings'> */
export type HotelBooking = {
  id: string;
  tenant_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  room_type: string | null;
  created_at: string;
  updated_at: string;
};
export type HotelBookingInsert = Omit<HotelBooking, 'id' | 'created_at' | 'updated_at'>;
export type HotelBookingUpdate = Partial<HotelBookingInsert>;

/** @todo Replace with Tables<'breakfast_configurations'> */
export type BreakfastConfiguration = {
  id: string;
  tenant_id: string;
  day_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type BreakfastConfigurationInsert = Omit<BreakfastConfiguration, 'id' | 'created_at' | 'updated_at'>;
export type BreakfastConfigurationUpdate = Partial<BreakfastConfigurationInsert>;

export type PointOfContact = Tables<'point_of_contact'>;
export type PointOfContactInsert = TablesInsert<'point_of_contact'>;
export type PointOfContactUpdate = TablesUpdate<'point_of_contact'>;

/** @todo Replace with Tables<'venue_types'> */
export type VenueType = {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
};
export type VenueTypeInsert = Omit<VenueType, 'id' | 'created_at'>;
export type VenueTypeUpdate = Partial<VenueTypeInsert>;
