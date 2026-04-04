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

/** @todo Replace with Tables<'day'> once db:types is re-run after T-17 migration */
export type Day = {
  id: string;
  tenant_id: string;
  date_iso: string;
  weekday: string;
  created_at: string;
};
export type DayInsert = Omit<Day, 'id' | 'created_at'>;

/** @todo Replace with Tables<'program_item'> once the program_item migration exists (T-20) */
export type ProgramItem = {
  id: string;
  tenant_id: string;
  day_id: string;
  type: 'golf' | 'event';
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  guest_count: number | null;
  capacity: number | null;
  venue_type_id: string | null;
  poc_id: string | null;
  table_breakdown: number[] | null;
  is_tour_operator: boolean;
  notes: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  recurrence_group_id: string | null;
  created_at: string;
  updated_at: string;
};
export type ProgramItemInsert = Omit<ProgramItem, 'id' | 'created_at' | 'updated_at'>;
export type ProgramItemUpdate = Partial<ProgramItemInsert>;

/** @todo Replace with Tables<'reservation'> once the reservation migration exists (T-23) */
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

/** @todo Replace with Tables<'hotel_booking'> once the hotel_booking migration exists (T-25) */
export type HotelBooking = {
  id: string;
  tenant_id: string;
  guest_name: string;
  guest_count: number;
  check_in: string;
  check_out: string;
  is_tour_operator: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type HotelBookingInsert = Omit<HotelBooking, 'id' | 'created_at' | 'updated_at'>;
export type HotelBookingUpdate = Partial<HotelBookingInsert>;

/** @todo Replace with Tables<'breakfast_configuration'> once the migration exists (T-26) */
export type BreakfastConfiguration = {
  id: string;
  tenant_id: string;
  hotel_booking_id: string;
  breakfast_date: string;
  table_breakdown: number[] | null;
  total_guests: number;
  start_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type BreakfastConfigurationInsert = Omit<BreakfastConfiguration, 'id' | 'created_at' | 'updated_at'>;
export type BreakfastConfigurationUpdate = Partial<BreakfastConfigurationInsert>;

export type PointOfContact = Tables<'point_of_contact'>;
export type PointOfContactInsert = TablesInsert<'point_of_contact'>;
export type PointOfContactUpdate = TablesUpdate<'point_of_contact'>;

export type VenueType = Tables<'venue_type'>;
export type VenueTypeInsert = TablesInsert<'venue_type'>;
export type VenueTypeUpdate = TablesUpdate<'venue_type'>;

/** ProgramItem with joined venue_type and point_of_contact relations */
export type ProgramItemWithRelations = ProgramItem & {
  venue_type: VenueType | null;
  point_of_contact: PointOfContact | null;
};
