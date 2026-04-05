export const KNOWN_FLAGS = [
  'activities',
  'reservations',
  'breakfast_config',
  'points_of_contact',
] as const;

export type FlagKey = (typeof KNOWN_FLAGS)[number];
export type FlagMap = Record<FlagKey, boolean>;

export const FLAG_LABELS: Record<FlagKey, string> = {
  activities: 'Activities',
  reservations: 'Reservations',
  breakfast_config: 'Breakfast',
  points_of_contact: 'Points of Contact',
};
