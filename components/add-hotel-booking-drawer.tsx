'use client';

import { useEffect, useState, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { createHotelBooking, updateHotelBooking } from '@/app/actions/hotel-bookings';
import {
  getBreakfastConfigurationsForBooking,
  updateBreakfastConfiguration,
} from '@/app/actions/breakfast';
import { datesInRange } from '@/lib/day-utils';
import type { HotelBooking, BreakfastConfiguration } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NightData = {
  configId: string | null;
  tableBreakdown: string;
  startTime: string;
  notes: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: string; // current day being viewed (YYYY-MM-DD) — used to select initial tab
  editItem?: HotelBooking | null;
  onSuccess: (booking: HotelBooking, configs: BreakfastConfiguration[]) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddHotelBookingDrawer({ isOpen, onClose, date, editItem, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const [guestName, setGuestName] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [isTourOperator, setIsTourOperator] = useState(false);
  const [bookingNotes, setBookingNotes] = useState('');

  // Per-night breakfast data, keyed by YYYY-MM-DD
  const [nights, setNights] = useState<Record<string, NightData>>({});

  const isEditing = !!editItem;

  // Reset / pre-fill when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    if (editItem) {
      setGuestName(editItem.guest_name);
      setGuestCount(String(editItem.guest_count));
      setCheckIn(parseISO(editItem.check_in));
      setCheckOut(parseISO(editItem.check_out));
      setIsTourOperator(editItem.is_tour_operator);
      setBookingNotes(editItem.notes ?? '');

      // Fetch existing breakfast configs
      getBreakfastConfigurationsForBooking(editItem.id).then((result) => {
        if (!result.success) return;
        const nightMap: Record<string, NightData> = {};
        for (const config of result.data) {
          nightMap[config.breakfast_date] = {
            configId: config.id,
            tableBreakdown: config.table_breakdown
              ? (config.table_breakdown as number[]).join('+')
              : '',
            startTime: config.start_time ?? '',
            notes: config.notes ?? '',
          };
        }
        setNights(nightMap);
      });
    } else {
      setGuestName('');
      setGuestCount('');
      setCheckIn(undefined);
      setCheckOut(undefined);
      setIsTourOperator(false);
      setBookingNotes('');
      setNights({});
    }
  }, [isOpen, editItem]);

  // Recompute night list when dates change (preserves existing per-night data)
  useEffect(() => {
    if (!checkIn || !checkOut) return;
    const checkInStr = format(checkIn, 'yyyy-MM-dd');
    const checkOutStr = format(checkOut, 'yyyy-MM-dd');
    if (checkInStr >= checkOutStr) return;

    const nightList = nightsBetween(checkInStr, checkOutStr);
    setNights((prev) => {
      const next: Record<string, NightData> = {};
      for (const d of nightList) {
        next[d] = prev[d] ?? { configId: null, tableBreakdown: '', startTime: '', notes: '' };
      }
      return next;
    });
  }, [checkIn, checkOut]);

  const nightDates = Object.keys(nights).sort();
  const defaultTab = nightDates.includes(date) ? date : (nightDates[0] ?? '');

  function updateNight(date: string, patch: Partial<NightData>) {
    setNights((prev) => ({ ...prev, [date]: { ...prev[date], ...patch } }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const checkInStr = checkIn ? format(checkIn, 'yyyy-MM-dd') : '';
      const checkOutStr = checkOut ? format(checkOut, 'yyyy-MM-dd') : '';
      const count = parseInt(guestCount, 10);

      if (!guestName.trim()) { toast.error('Guest name is required.'); return; }
      if (!checkInStr) { toast.error('Check-in date is required.'); return; }
      if (!checkOutStr) { toast.error('Check-out date is required.'); return; }
      if (checkInStr >= checkOutStr) { toast.error('Check-out must be after check-in.'); return; }
      if (!count || count < 1) { toast.error('Guest count must be at least 1.'); return; }

      const payload = {
        guestName: guestName.trim(),
        guestCount: count,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        isTourOperator,
        notes: bookingNotes || undefined,
      };

      let booking: HotelBooking;

      if (isEditing) {
        const result = await updateHotelBooking(editItem!.id, payload);
        if (!result.success) { toast.error(result.error); return; }
        booking = result.data;
      } else {
        const result = await createHotelBooking(payload);
        if (!result.success) { toast.error(result.error); return; }
        booking = result.data;
      }

      // Fetch all breakfast configs for this booking (auto-created or existing)
      const configsResult = await getBreakfastConfigurationsForBooking(booking.id);
      if (!configsResult.success) {
        toast.success(isEditing ? 'Booking updated.' : 'Booking added.');
        onSuccess(booking, []);
        onClose();
        return;
      }

      // Update configs for nights that have user data
      const configMap = new Map(configsResult.data.map((c) => [c.breakfast_date, c]));
      const finalConfigs = new Map<string, BreakfastConfiguration>(
        configsResult.data.map((c) => [c.id, c])
      );

      for (const [nightDate, nightData] of Object.entries(nights)) {
        const config = configMap.get(nightDate);
        if (!config) continue;

        const hasData = nightData.tableBreakdown || nightData.startTime || nightData.notes;
        const isExistingDirty =
          isEditing &&
          (config.table_breakdown !== null ||
            config.start_time !== null ||
            config.notes !== null);

        if (hasData || isExistingDirty) {
          const result = await updateBreakfastConfiguration(config.id, {
            tableBreakdown: nightData.tableBreakdown || undefined,
            startTime: nightData.startTime || undefined,
            notes: nightData.notes || undefined,
          });
          if (result.success) finalConfigs.set(result.data.id, result.data);
        }
      }

      toast.success(isEditing ? 'Booking updated.' : 'Booking added.');
      onSuccess(booking, [...finalConfigs.values()]);
      onClose();
    });
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(v) => { if (!v) onClose(); }}
      direction="right"
    >
      <DrawerContent className="flex flex-col overflow-hidden sm:max-w-lg">
        <DrawerHeader className="border-b">
          <DrawerTitle>{isEditing ? 'Edit hotel booking' : 'Add hotel booking'}</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Guest name */}
          <div className="space-y-1">
            <Label htmlFor="hb-name">Guest name *</Label>
            <Input
              id="hb-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Smith"
            />
          </div>

          {/* Guest count */}
          <div className="space-y-1">
            <Label htmlFor="hb-count">Guest count *</Label>
            <Input
              id="hb-count"
              type="number"
              min={1}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
            />
          </div>

          {/* Check-in / Check-out */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Check-in *</Label>
              <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !checkIn && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, 'd MMM yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={(d) => { setCheckIn(d); setCheckInOpen(false); }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label>Check-out *</Label>
              <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !checkOut && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, 'd MMM yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    disabled={checkIn ? { before: checkIn } : undefined}
                    onSelect={(d) => { setCheckOut(d); setCheckOutOpen(false); }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tour operator toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="hb-tour-op"
              checked={isTourOperator}
              onCheckedChange={setIsTourOperator}
            />
            <Label htmlFor="hb-tour-op">Tour operator</Label>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="hb-notes">Notes</Label>
            <Textarea
              id="hb-notes"
              rows={2}
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
            />
          </div>

          {/* Per-night breakfast tabs */}
          {nightDates.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Breakfast configuration</p>
              <Tabs defaultValue={defaultTab}>
                <TabsList className="flex flex-wrap h-auto gap-1">
                  {nightDates.map((d) => (
                    <TabsTrigger key={d} value={d} className="text-xs">
                      {format(parseISO(d), 'EEE d MMM')}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {nightDates.map((d) => {
                  const night = nights[d];
                  return (
                    <TabsContent key={d} value={d} className="space-y-3 pt-3">
                      <div className="space-y-1">
                        <Label htmlFor={`bf-bd-${d}`}>Table breakdown</Label>
                        <Input
                          id={`bf-bd-${d}`}
                          placeholder="e.g. 3+2+1"
                          value={night.tableBreakdown}
                          onChange={(e) => updateNight(d, { tableBreakdown: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Seat counts separated by +
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`bf-time-${d}`}>Start time</Label>
                        <Input
                          id={`bf-time-${d}`}
                          type="time"
                          value={night.startTime}
                          onChange={(e) => updateNight(d, { startTime: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`bf-notes-${d}`}>Notes</Label>
                        <Textarea
                          id={`bf-notes-${d}`}
                          rows={2}
                          value={night.notes}
                          onChange={(e) => updateNight(d, { notes: e.target.value })}
                        />
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nightsBetween(checkIn: string, checkOut: string): string[] {
  const dayBefore = subtractOneDay(checkOut);
  if (dayBefore < checkIn) return [];
  return datesInRange(checkIn, dayBefore);
}

function subtractOneDay(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
