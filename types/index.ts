// Re-export generated Supabase types
export type { Database, Tables, TablesInsert, TablesUpdate } from './supabase';

// ── Imports ──────────────────────────────────────────────────────────────────

import type { Tables, TablesInsert, TablesUpdate } from './supabase';

// ── Tenant ───────────────────────────────────────────────────────────────────

export type Tenant = Tables<'tenants'>;
export type TenantInsert = TablesInsert<'tenants'>;
export type TenantUpdate = TablesUpdate<'tenants'>;

// ── Membership ───────────────────────────────────────────────────────────────

export type Membership = Tables<'memberships'>;
export type MembershipInsert = TablesInsert<'memberships'>;
export type MembershipUpdate = TablesUpdate<'memberships'>;

// ── Day ──────────────────────────────────────────────────────────────────────

export type Day = Tables<'day'>;
export type DayInsert = TablesInsert<'day'>;

// ── Activity (formerly program_item) ─────────────────────────────────────────

export type Activity = Tables<'activity'>;
export type ActivityInsert = TablesInsert<'activity'>;
export type ActivityUpdate = TablesUpdate<'activity'>;

// ── Activity tags ─────────────────────────────────────────────────────────────

export type ActivityTag = Tables<'activity_tag'>;
export type ActivityTagInsert = TablesInsert<'activity_tag'>;
export type ActivityTagUpdate = TablesUpdate<'activity_tag'>;

export type ActivityTagAssignment = Tables<'activity_tag_assignment'>;

// ── Reservation ───────────────────────────────────────────────────────────────

export type Reservation = Tables<'reservation'>;
export type ReservationInsert = TablesInsert<'reservation'>;
export type ReservationUpdate = TablesUpdate<'reservation'>;

// ── BreakfastConfiguration ───────────────────────────────────────────────────

export type BreakfastConfiguration = Tables<'breakfast_configuration'>;
export type BreakfastConfigurationInsert = TablesInsert<'breakfast_configuration'>;
export type BreakfastConfigurationUpdate = TablesUpdate<'breakfast_configuration'>;

// ── Point of contact ──────────────────────────────────────────────────────────

export type PointOfContact = Tables<'point_of_contact'>;
export type PointOfContactInsert = TablesInsert<'point_of_contact'>;
export type PointOfContactUpdate = TablesUpdate<'point_of_contact'>;

// ── Venue type ────────────────────────────────────────────────────────────────

export type VenueType = Tables<'venue_type'>;
export type VenueTypeInsert = TablesInsert<'venue_type'>;
export type VenueTypeUpdate = TablesUpdate<'venue_type'>;

// ── Composite / relation types ────────────────────────────────────────────────

export type ActivityWithRelations = Activity & {
  tags?: ActivityTag[];
  venue_type: VenueType | null;
  point_of_contact: PointOfContact | null;
};
