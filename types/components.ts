import type { ActivityWithRelations, Reservation } from './index';

export type { ActivityWithRelations };

export type DayEntry = ActivityWithRelations | Reservation;

export function isActivity(entry: DayEntry): entry is ActivityWithRelations {
  return 'title' in entry;
}
