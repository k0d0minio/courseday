import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/tenant', () => ({ getTenantId: vi.fn().mockResolvedValue('tenant-1') }));
vi.mock('@/lib/membership', () => ({ requireEditor: vi.fn(), getUserRole: vi.fn().mockResolvedValue('editor') }));
vi.mock('@/lib/supabase-server', () => ({ createTenantClient: vi.fn() }));
vi.mock('@/app/actions/days', () => ({ ensureDayExists: vi.fn().mockResolvedValue({ success: true, data: { id: 'day-1', date_iso: '2024-06-01' } }) }));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { createTenantClient } from '@/lib/supabase-server';
import {
  createActivity,
  updateActivity,
  deleteActivity,
  deleteActivityRecurrenceGroup,
  getActivitiesForDay,
} from '@/app/actions/activities';

type QueryResult = { data: unknown; error: { message: string } | null };

function makeChain(result: QueryResult = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'upsert',
   'eq', 'neq', 'in', 'lt', 'lte', 'gt', 'gte', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  (chain as { then?: unknown }).then = (fn: (v: QueryResult) => void) =>
    Promise.resolve(result).then(fn);
  return chain;
}

const VALID_ITEM = {
  title: 'Morning Round',
  dayId: '123e4567-e89b-12d3-a456-426614174000',
};

const ITEM_ROW = {
  id: 'item-1',
  tenant_id: 'tenant-1',
  day_id: VALID_ITEM.dayId,
  title: 'Morning Round',
  is_recurring: false,
};

// ── createActivity ────────────────────────────────────────────────────────────

describe('createActivity (non-recurring)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error on schema validation failure', async () => {
    const result = await createActivity({ ...VALID_ITEM, title: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Title is required');
  });

  it('inserts an activity and returns it', async () => {
    const chain = makeChain({ data: ITEM_ROW, error: null });
    const from = vi.fn().mockReturnValue(chain);
    vi.mocked(createTenantClient).mockResolvedValue({ supabase: { from } as never, tenantId: 'tenant-1' });

    const result = await createActivity(VALID_ITEM);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ title: 'Morning Round' });
    expect(from).toHaveBeenCalledWith('activity');
  });

  it('returns error when Supabase insert fails', async () => {
    const from = vi.fn().mockReturnValue(makeChain({ data: null, error: { message: 'db error' } }));
    vi.mocked(createTenantClient).mockResolvedValue({ supabase: { from } as never, tenantId: 'tenant-1' });

    const result = await createActivity(VALID_ITEM);
    expect(result.success).toBe(false);
    expect(result.error).toBe('db error');
  });
});

// ── createActivity (recurring) ────────────────────────────────────────────────

describe('createActivity (recurring)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fans out to multiple day records and returns the first-day item', async () => {
    const dayRow = { date_iso: '2024-06-01' };
    const allDayRows = [
      { id: 'day-1', date_iso: '2024-06-01' },
      { id: 'day-2', date_iso: '2024-06-08' },
    ];

    const from = vi.fn()
      .mockReturnValueOnce(makeChain({ data: dayRow, error: null }))
      .mockReturnValueOnce(makeChain({ data: allDayRows, error: null }))
      .mockReturnValue(makeChain({ data: ITEM_ROW, error: null }));

    vi.mocked(createTenantClient).mockResolvedValue({ supabase: { from } as never, tenantId: 'tenant-1' });

    const result = await createActivity({
      ...VALID_ITEM,
      isRecurring: true,
      recurrenceFrequency: 'weekly',
    });

    expect(result.success).toBe(true);
    const insertFn = (from.mock.results[2].value as ReturnType<typeof makeChain>)
      .insert as ReturnType<typeof vi.fn>;
    const insertedRows = insertFn.mock.calls[0][0] as unknown[];
    expect(Array.isArray(insertedRows)).toBe(true);
    expect(insertedRows.length).toBeGreaterThan(1);
  });
});

// ── updateActivity ────────────────────────────────────────────────────────────

describe('updateActivity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the item and returns it', async () => {
    const updated = { ...ITEM_ROW, title: 'Afternoon Round' };
    const chain = makeChain({ data: updated, error: null });
    const from = vi.fn().mockReturnValue(chain);
    vi.mocked(createTenantClient).mockResolvedValue({ supabase: { from } as never, tenantId: 'tenant-1' });

    const result = await updateActivity('item-1', { ...VALID_ITEM, title: 'Afternoon Round' });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ title: 'Afternoon Round' });
  });

  it('returns error on schema validation failure', async () => {
    const result = await updateActivity('item-1', { ...VALID_ITEM, title: '' });
    expect(result.success).toBe(false);
  });
});

// ── deleteActivity ────────────────────────────────────────────────────────────

describe('deleteActivity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes by id and tenant and returns success', async () => {
    const chain = makeChain({ data: null, error: null });
    const from = vi.fn().mockReturnValue(chain);
    vi.mocked(createTenantClient).mockResolvedValue({ supabase: { from } as never, tenantId: 'tenant-1' });

    const result = await deleteActivity('item-1');
    expect(result.success).toBe(true);
    expect(from).toHaveBeenCalledWith('activity');
    expect((chain.delete as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('returns error when Supabase delete fails', async () => {
    const from = vi.fn().mockReturnValue(makeChain({ data: null, error: { message: 'delete error' } }));
    vi.mocked(createTenantClient).mockResolvedValue({ supabase: { from } as never, tenantId: 'tenant-1' });

    const result = await deleteActivity('item-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('delete error');
  });
});

// ── deleteActivityRecurrenceGroup ─────────────────────────────────────────────

describe('deleteActivityRecurrenceGroup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes all items in the recurrence group', async () => {
    const chain = makeChain({ data: null, error: null });
    const from = vi.fn().mockReturnValue(chain);
    vi.mocked(createTenantClient).mockResolvedValue({ supabase: { from } as never, tenantId: 'tenant-1' });

    const result = await deleteActivityRecurrenceGroup('group-abc');
    expect(result.success).toBe(true);

    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls).toContainEqual(['recurrence_group_id', 'group-abc']);
  });
});

// ── getActivitiesForDay ───────────────────────────────────────────────────────

describe('getActivitiesForDay', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns items for the given day', async () => {
    const items = [ITEM_ROW, { ...ITEM_ROW, id: 'item-2', title: 'Evening Event' }];
    const from = vi.fn().mockReturnValue(makeChain({ data: items, error: null }));
    vi.mocked(createTenantClient).mockResolvedValue({ supabase: { from } as never, tenantId: 'tenant-1' });

    const result = await getActivitiesForDay('day-1');
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('returns error when not authorized', async () => {
    const { getUserRole } = await import('@/lib/membership');
    vi.mocked(getUserRole).mockResolvedValue(null);

    const result = await getActivitiesForDay('day-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authorized.');
  });
});
