import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const generateObjectMock = vi.fn()

vi.mock('ai', () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}))

vi.mock('@ai-sdk/gateway', () => ({
  gateway: vi.fn().mockReturnValue('mocked-model'),
}))

vi.mock('@/lib/ai-call-log', () => ({
  logAiCall: vi.fn().mockResolvedValue(undefined),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { generateQuickAddParse } from '@/lib/quick-add-generate'

const ORIGINAL_ENV = { ...process.env }
const DAY_ID = '00000000-0000-0000-0000-000000000001'
const CTX = '2026-05-10'

beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...ORIGINAL_ENV, AI_GATEWAY_API_KEY: 'test-key' }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function llmActivity(over: Record<string, unknown> = {}) {
  return {
    kind: 'activity' as const,
    dateAmbiguous: false,
    fields: {
      title: null,
      description: null,
      guestName: null,
      groupName: null,
      startTime: null,
      endTime: null,
      expectedCovers: null,
      guestCount: null,
      notes: null,
      tableBreakdown: null,
      allergenHints: null,
      ...over,
    },
  }
}

function llmReservation(over: Record<string, unknown> = {}) {
  return {
    kind: 'reservation' as const,
    dateAmbiguous: false,
    fields: {
      title: null,
      description: null,
      guestName: null,
      groupName: null,
      startTime: null,
      endTime: null,
      expectedCovers: null,
      guestCount: null,
      notes: null,
      tableBreakdown: null,
      allergenHints: null,
      ...over,
    },
  }
}

function llmBreakfast(over: Record<string, unknown> = {}) {
  return {
    kind: 'breakfast' as const,
    dateAmbiguous: false,
    fields: {
      title: null,
      description: null,
      guestName: null,
      groupName: null,
      startTime: null,
      endTime: null,
      expectedCovers: null,
      guestCount: null,
      notes: null,
      tableBreakdown: null,
      allergenHints: null,
      ...over,
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateQuickAddParse — multi-item', () => {
  it('returns a length-1 items array for a single-item paste', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        items: [
          llmActivity({
            title: 'Member golf',
            startTime: '08:00',
            expectedCovers: 24,
          }),
        ],
      },
      usage: { promptTokens: 10, completionTokens: 5 },
    })

    const r = await generateQuickAddParse('Member golf 8am, 24 players', DAY_ID, CTX)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.items).toHaveLength(1)
    expect(r.items[0]!.kind).toBe('activity')
    expect(r.items[0]!.dayId).toBe(DAY_ID)
    expect(r.items[0]!.contextDate).toBe(CTX)
    if (r.items[0]!.kind === 'activity') {
      expect(r.items[0]!.defaults.title).toBe('Member golf')
      expect(r.items[0]!.defaults.startTime).toBe('08:00')
      expect(r.items[0]!.defaults.expectedCovers).toBe('24')
    }
  })

  it('returns 3 items for a multi-reservation paste', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        items: [
          llmReservation({ guestName: 'Smith', guestCount: 6, startTime: '19:30' }),
          llmReservation({
            guestName: 'Lee',
            guestCount: 2,
            startTime: '20:00',
            allergenHints: ['no nuts'],
          }),
          llmReservation({ guestName: 'Patel', guestCount: 4, startTime: '20:15' }),
        ],
      },
      usage: { promptTokens: 30, completionTokens: 12 },
    })

    const text = '- Smith party of 6 at 7:30pm\n- Lee, 2 guests, 8pm, no nuts\n- Patel 4 at 8:15pm'
    const r = await generateQuickAddParse(text, DAY_ID, CTX)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.items).toHaveLength(3)
    for (const it of r.items) {
      expect(it.kind).toBe('reservation')
      expect(it.dayId).toBe(DAY_ID)
      expect(it.contextDate).toBe(CTX)
    }
    if (r.items[0]!.kind === 'reservation') {
      expect(r.items[0]!.defaults.guestName).toBe('Smith')
      expect(r.items[0]!.defaults.guestCount).toBe('6')
      expect(r.items[0]!.defaults.startTime).toBe('19:30')
    }
    if (r.items[1]!.kind === 'reservation') {
      expect(r.items[1]!.allergens).toContain('nuts')
    }
    if (r.items[2]!.kind === 'reservation') {
      expect(r.items[2]!.defaults.guestName).toBe('Patel')
    }
  })

  it('handles mixed-kind paste (activity + breakfast + reservation)', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        items: [
          llmActivity({ title: 'Tee time', startTime: '09:00', expectedCovers: 16 }),
          llmBreakfast({ groupName: 'Room block A', guestCount: 30, startTime: '07:00' }),
          llmReservation({ guestName: 'Garcia', guestCount: 4, startTime: '20:00' }),
        ],
      },
      usage: { promptTokens: 40, completionTokens: 18 },
    })

    const text =
      'Tee time 9am, 16 players. Breakfast for room block A, 30 guests at 7am. Reservation: Garcia, 4, 8pm.'
    const r = await generateQuickAddParse(text, DAY_ID, CTX)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.items).toHaveLength(3)
    expect(r.items.map((it) => it.kind)).toEqual(['activity', 'breakfast', 'reservation'])

    if (r.items[0]!.kind === 'activity') {
      expect(r.items[0]!.defaults.title).toBe('Tee time')
      expect(r.items[0]!.defaults.startTime).toBe('09:00')
      expect(r.items[0]!.defaults.expectedCovers).toBe('16')
    }
    if (r.items[1]!.kind === 'breakfast') {
      expect(r.items[1]!.defaults.groupName).toBe('Room block A')
      expect(r.items[1]!.defaults.guestCount).toBe('30')
      expect(r.items[1]!.defaults.startTime).toBe('07:00')
    }
    if (r.items[2]!.kind === 'reservation') {
      expect(r.items[2]!.defaults.guestName).toBe('Garcia')
      expect(r.items[2]!.defaults.guestCount).toBe('4')
      expect(r.items[2]!.defaults.startTime).toBe('20:00')
    }
  })

  it('all items inherit the same dayId from input', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        items: [
          llmActivity({ title: 'A', startTime: '09:00', expectedCovers: 4 }),
          llmReservation({ guestName: 'B', guestCount: 2, startTime: '20:00' }),
        ],
      },
      usage: {},
    })
    const r = await generateQuickAddParse('two things', DAY_ID, CTX)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.items.every((it) => it.dayId === DAY_ID)).toBe(true)
    expect(r.items.every((it) => it.contextDate === CTX)).toBe(true)
  })

  it('returns error when text is too short', async () => {
    const r = await generateQuickAddParse('a', DAY_ID, CTX)
    expect(r.success).toBe(false)
    expect(generateObjectMock).not.toHaveBeenCalled()
  })
})
