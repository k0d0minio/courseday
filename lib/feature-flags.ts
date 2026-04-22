export const KNOWN_FLAGS = [
  'reservations',
  'breakfast_config',
  'weather_reporting',
  'checklists',
  'staff_schedule',
] as const;

export type FlagKey = (typeof KNOWN_FLAGS)[number];
export type FlagMap = Record<FlagKey, boolean>;

export const FLAG_LABELS: Record<FlagKey, string> = {
  reservations: 'Reservations',
  breakfast_config: 'Breakfast Config',
  weather_reporting: 'Weather Reporting',
  checklists: 'Checklists',
  staff_schedule: 'Staff schedule',
};

export const FLAG_DESCRIPTIONS: Record<FlagKey, string> = {
  reservations: 'Show reservations on tenant day views.',
  breakfast_config: 'Show breakfast planning and breakfast cards.',
  weather_reporting: 'Show weather card and weather reporting data.',
  checklists: 'Show checklists in tenant settings.',
  staff_schedule: 'Show staff scheduling on day views and Staff settings.',
};
