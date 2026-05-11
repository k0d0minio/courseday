import { describe, it, expect } from 'vitest'
import { buildDataFromLlm } from '@/lib/quick-add-build'
import type { QuickAddLlmItem } from '@/lib/quick-add-build'

const DAY_ID = '00000000-0000-0000-0000-000000000001'
const CTX = '2026-05-11'

function llmActivity(
  over: Partial<QuickAddLlmItem['fields']> & { dateAmbiguous?: boolean } = {}
): QuickAddLlmItem {
  const { dateAmbiguous = false, ...fieldOverrides } = over
  return {
    kind: 'activity',
    dateAmbiguous,
    fields: {
      date: null,
      title: 'Tee time',
      description: null,
      guestName: null,
      groupName: null,
      startTime: '09:00',
      endTime: null,
      expectedCovers: null,
      guestCount: null,
      notes: null,
      tableBreakdown: null,
      allergenHints: null,
      ...fieldOverrides,
    },
  }
}

describe('buildDataFromLlm — resolvedDate', () => {
  it('leaves resolvedDate empty when LLM returns date: null (no date phrase)', () => {
    // "tee time 9am" — LLM cannot infer a date, returns date: null
    const item = llmActivity({ date: null, startTime: '09:00' })
    const result = buildDataFromLlm(item, DAY_ID, CTX)
    expect(result.resolvedDate).toBe('')
  })

  it('uses explicit future date when LLM returns date (relative: next Monday)', () => {
    // "tee time 9am next Monday" with context 2026-05-12 (Tue) → LLM resolves to 2026-05-18
    const item = llmActivity({ date: '2026-05-18', startTime: '09:00' })
    const result = buildDataFromLlm(item, DAY_ID, '2026-05-12')
    expect(result.resolvedDate).toBe('2026-05-18')
  })

  it('uses context day when LLM resolves "tonight" to context date', () => {
    // "tee time tonight 9pm" — LLM anchors to context day
    const item = llmActivity({ date: CTX, startTime: '21:00' })
    const result = buildDataFromLlm(item, DAY_ID, CTX)
    expect(result.resolvedDate).toBe(CTX)
  })

  it('uses absolute date when LLM resolves "26 June"', () => {
    // "tee time on 26 June" — LLM resolves to next 26 June
    const item = llmActivity({ date: '2026-06-26', startTime: null })
    const result = buildDataFromLlm(item, DAY_ID, CTX)
    expect(result.resolvedDate).toBe('2026-06-26')
  })
})

describe('buildDataFromLlm — resolvedDate for reservation and breakfast', () => {
  it('reservation: empty resolvedDate when date is null', () => {
    const item: QuickAddLlmItem = {
      kind: 'reservation',
      dateAmbiguous: false,
      fields: {
        date: null,
        title: null,
        description: null,
        guestName: 'Smith',
        groupName: null,
        startTime: '19:30',
        endTime: null,
        expectedCovers: null,
        guestCount: 6,
        notes: null,
        tableBreakdown: null,
        allergenHints: null,
      },
    }
    const result = buildDataFromLlm(item, DAY_ID, CTX)
    expect(result.resolvedDate).toBe('')
  })

  it('breakfast: non-empty resolvedDate when date is provided', () => {
    const item: QuickAddLlmItem = {
      kind: 'breakfast',
      dateAmbiguous: false,
      fields: {
        date: '2026-06-01',
        title: null,
        description: null,
        guestName: null,
        groupName: 'Room A',
        startTime: '07:00',
        endTime: null,
        expectedCovers: null,
        guestCount: 20,
        notes: null,
        tableBreakdown: null,
        allergenHints: null,
      },
    }
    const result = buildDataFromLlm(item, DAY_ID, CTX)
    expect(result.resolvedDate).toBe('2026-06-01')
  })
})
