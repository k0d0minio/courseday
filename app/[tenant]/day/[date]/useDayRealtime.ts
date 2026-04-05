'use client';

import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import type {
  ActivityWithRelations,
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
              return [...prev, row].sort((a, b) =>
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
              return [...prev, row].sort((a, b) =>
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
              return [...prev, row];
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dayId, setActivities, setReservations, setBreakfastConfigs]);
}
