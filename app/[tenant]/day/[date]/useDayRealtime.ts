'use client';

import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import type {
  ActivityWithRelations,
  ActivityChecklistItem,
  Reservation,
  BreakfastConfiguration,
} from '@/types/index';

type SetActivities = React.Dispatch<React.SetStateAction<ActivityWithRelations[]>>;
type SetReservations = React.Dispatch<React.SetStateAction<Reservation[]>>;
type SetBreakfastConfigs = React.Dispatch<React.SetStateAction<BreakfastConfiguration[]>>;

/**
 * Subscribes to Postgres changes for the three day-view tables scoped to the
 * given `dayId`. State setters are patched on each event:
 *
 * - INSERT: append (skip if already present, e.g. optimistic update from this session)
 * - UPDATE: replace by id (preserves existing joined fields like poc/venue_type
 *   that realtime rows don't carry)
 * - DELETE: remove by id
 *
 * The channel is removed on component unmount or when `dayId` changes (navigation).
 *
 * Limitation: calendar aggregate counts are not updated in real-time.
 * Realtime only applies to the day view.
 */
export function useDayRealtime(
  dayId: string,
  setActivities: SetActivities,
  setReservations: SetReservations,
  setBreakfastConfigs: SetBreakfastConfigs
) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`day-${dayId}`)
      // Activities
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity',
          filter: `day_id=eq.${dayId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as ActivityWithRelations;
            setActivities((prev) => {
              if (prev.some((a) => a.id === row.id)) return prev;
              const withoutPendingDuplicate = prev.filter((item) => {
                if (!item.id.startsWith('pending-')) return true;
                return !(
                  item.day_id === row.day_id &&
                  item.title === row.title &&
                  item.start_time === row.start_time
                );
              });
              return [...withoutPendingDuplicate, row].sort((a, b) =>
                (a.start_time ?? '').localeCompare(b.start_time ?? '')
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as ActivityWithRelations;
            // Merge to preserve joined fields (venue_type, poc, tags) that
            // the realtime payload doesn't include.
            setActivities((prev) =>
              prev.map((a) => (a.id === row.id ? { ...a, ...row } : a))
            );
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            setActivities((prev) => prev.filter((a) => a.id !== id));
          }
        }
      )
      // Reservations
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation',
          filter: `day_id=eq.${dayId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Reservation;
            setReservations((prev) => {
              if (prev.some((r) => r.id === row.id)) return prev;
              const withoutPendingDuplicate = prev.filter((item) => {
                if (!item.id.startsWith('pending-')) return true;
                return !(
                  item.day_id === row.day_id &&
                  item.guest_name === row.guest_name &&
                  item.start_time === row.start_time
                );
              });
              return [...withoutPendingDuplicate, row].sort((a, b) =>
                (a.start_time ?? '').localeCompare(b.start_time ?? '')
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Reservation;
            setReservations((prev) =>
              prev.map((r) => (r.id === row.id ? row : r))
            );
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            setReservations((prev) => prev.filter((r) => r.id !== id));
          }
        }
      )
      // Breakfast configurations
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'breakfast_configuration',
          filter: `day_id=eq.${dayId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as BreakfastConfiguration;
            setBreakfastConfigs((prev) => {
              if (prev.some((c) => c.id === row.id)) return prev;
              const withoutPendingDuplicate = prev.filter((item) => {
                if (!item.id.startsWith('pending-')) return true;
                return !(
                  item.day_id === row.day_id &&
                  item.group_name === row.group_name &&
                  item.start_time === row.start_time
                );
              });
              return [...withoutPendingDuplicate, row];
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as BreakfastConfiguration;
            setBreakfastConfigs((prev) =>
              prev.map((c) => (c.id === row.id ? row : c))
            );
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            setBreakfastConfigs((prev) => prev.filter((c) => c.id !== id));
          }
        }
      )
      // Activity checklist items
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_checklist_item',
          filter: `day_id=eq.${dayId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as ActivityChecklistItem;
            setActivities((prev) =>
              prev.map((activity) => {
                if (activity.id !== row.activity_id) return activity;
                const checklist = activity.checklist_items ?? [];
                if (checklist.some((item) => item.id === row.id)) return activity;
                return {
                  ...activity,
                  checklist_items: [...checklist, row].sort(
                    (a, b) => a.position - b.position
                  ),
                };
              })
            );
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as ActivityChecklistItem;
            setActivities((prev) =>
              prev.map((activity) => {
                if (activity.id !== row.activity_id) return activity;
                const checklist = activity.checklist_items ?? [];
                return {
                  ...activity,
                  checklist_items: checklist.map((item) =>
                    item.id === row.id ? row : item
                  ),
                };
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as {
              id: string;
              activity_id: string;
            };
            setActivities((prev) =>
              prev.map((activity) => {
                if (activity.id !== old.activity_id) return activity;
                return {
                  ...activity,
                  checklist_items: (activity.checklist_items ?? []).filter(
                    (item) => item.id !== old.id
                  ),
                };
              })
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dayId, setActivities, setReservations, setBreakfastConfigs]);
}
