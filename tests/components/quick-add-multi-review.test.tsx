import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

vi.mock('@/lib/feature-flags-context', () => ({
  useFeatureFlag: () => true,
}))

// Radix Switch relies on PointerEvent which jsdom doesn't fully support.
// Swap for a native checkbox-styled button so tests are reliable.
vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
    'aria-label': ariaLabel,
    id,
  }: {
    checked?: boolean
    onCheckedChange?: (v: boolean) => void
    disabled?: boolean
    'aria-label'?: string
    id?: string
  }) => (
    // eslint-disable-next-line no-restricted-syntax -- bespoke test stub for jsdom
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}))

import { QuickAddMultiReview } from '@/components/quick-add-multi-review'
import type { QuickAddParseData } from '@/lib/quick-add-types'

const messages = {
  Tenant: {
    quickAdd: {
      multiReviewTitle: 'Review items',
      multiReviewDescription: 'We found {count} items. Toggle which to create, then confirm.',
      multiCreateButton: 'Create {count} items',
      multiAcceptToggle: 'Include {title}',
      multiKindDisabled: 'This item type is not enabled for this club.',
      multiRowSaved: 'Saved.',
      dateAmbiguousShort: 'Date unclear',
      back: 'Back',
      saving: 'Saving…',
      kindActivity: 'Activity',
      kindReservation: 'Reservation',
      kindBreakfast: 'Breakfast',
      primaryActivity: 'Title',
      primaryReservation: 'Guest name',
      primaryBreakfast: 'Group name',
      startTimeLabel: 'Start time',
      expectedCoversLabel: 'Expected covers',
      guestCountLabel: 'Guest count',
    },
  },
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const DAY = '00000000-0000-0000-0000-000000000001'
const CTX = '2026-05-10'

function activity(title: string, startTime: string, covers: string): QuickAddParseData {
  return {
    kind: 'activity',
    dayId: DAY,
    contextDate: CTX,
    resolvedDate: CTX,
    dateAmbiguous: false,
    defaults: {
      title,
      description: '',
      startTime,
      endTime: '',
      expectedCovers: covers,
      notes: '',
    },
    allergens: [],
    gapFieldKeys: [],
    modelFilledFieldKeys: ['title', 'startTime'],
  }
}

function reservation(name: string, count: string, startTime: string): QuickAddParseData {
  return {
    kind: 'reservation',
    dayId: DAY,
    contextDate: CTX,
    resolvedDate: CTX,
    dateAmbiguous: false,
    defaults: { guestName: name, guestCount: count, startTime, endTime: '', notes: '' },
    tableBreakdown: [],
    allergens: [],
    gapFieldKeys: [],
    modelFilledFieldKeys: ['guestName', 'guestCount'],
  }
}

function breakfast(group: string, count: string, startTime: string): QuickAddParseData {
  return {
    kind: 'breakfast',
    dayId: DAY,
    contextDate: CTX,
    resolvedDate: CTX,
    dateAmbiguous: false,
    defaults: { groupName: group, guestCount: count, startTime, notes: '' },
    tableBreakdown: [],
    allergens: [],
    gapFieldKeys: [],
    modelFilledFieldKeys: ['groupName', 'guestCount'],
  }
}

describe('QuickAddMultiReview', () => {
  it('renders one row per item with title, time and count', () => {
    const items = [
      activity('Tee time', '09:00', '16'),
      breakfast('Room block A', '30', '07:00'),
      reservation('Garcia', '4', '20:00'),
    ]
    renderWithIntl(
      <QuickAddMultiReview items={items} onSaveOne={vi.fn()} onAllDone={vi.fn()} onBack={vi.fn()} />
    )

    expect(screen.getByText('Tee time')).toBeInTheDocument()
    expect(screen.getByText('Room block A')).toBeInTheDocument()
    expect(screen.getByText('Garcia')).toBeInTheDocument()
    expect(screen.getByText(/Start time: 09:00/)).toBeInTheDocument()
    expect(screen.getByText(/Expected covers: 16/)).toBeInTheDocument()
    expect(screen.getByText(/Guest count: 4/)).toBeInTheDocument()
  })

  it('Create button reflects accepted count and excludes deselected rows', async () => {
    const items = [
      reservation('Smith', '6', '19:30'),
      reservation('Lee', '2', '20:00'),
      reservation('Patel', '4', '20:15'),
    ]
    const onSaveOne = vi.fn().mockResolvedValue({ success: true })
    const onAllDone = vi.fn()
    renderWithIntl(
      <QuickAddMultiReview
        items={items}
        onSaveOne={onSaveOne}
        onAllDone={onAllDone}
        onBack={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Create 3 items' })).toBeInTheDocument()

    const leeToggle = screen.getByRole('switch', { name: 'Include Lee' })
    fireEvent.click(leeToggle)

    expect(screen.getByRole('button', { name: 'Create 2 items' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create 2 items' }))

    await waitFor(() => expect(onSaveOne).toHaveBeenCalledTimes(2))
    expect(onSaveOne.mock.calls.map((c) => c[0].guestName)).toEqual(['Smith', 'Patel'])
    await waitFor(() => expect(onAllDone).toHaveBeenCalledTimes(1))
  })

  it('partial failure: errored row stays unchecked for retry, success rows do not retry', async () => {
    const items = [reservation('Smith', '6', '19:30'), reservation('Lee', '2', '20:00')]
    const onSaveOne = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'Network down' })
    const onAllDone = vi.fn()

    renderWithIntl(
      <QuickAddMultiReview
        items={items}
        onSaveOne={onSaveOne}
        onAllDone={onAllDone}
        onBack={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create 2 items' }))

    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument())
    expect(onAllDone).not.toHaveBeenCalled()

    expect(screen.getByText('Saved.')).toBeInTheDocument()

    // Failed row's toggle is now off; create-button count reflects only that row
    // when re-toggled.
    const leeToggle = screen.getByRole('switch', { name: 'Include Lee' })
    expect(leeToggle).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(leeToggle)
    expect(screen.getByRole('button', { name: 'Create 1 items' })).toBeInTheDocument()

    onSaveOne.mockResolvedValueOnce({ success: true })
    fireEvent.click(screen.getByRole('button', { name: 'Create 1 items' }))

    await waitFor(() => expect(onAllDone).toHaveBeenCalledTimes(1))
    // Smith's row should not be re-saved (already saved). Total calls = 3:
    // Smith (1st run, ok), Lee (1st run, fail), Lee (retry, ok).
    expect(onSaveOne).toHaveBeenCalledTimes(3)
    const names = onSaveOne.mock.calls.map((c) => c[0].guestName)
    expect(names.filter((n) => n === 'Smith')).toHaveLength(1)
    expect(names.filter((n) => n === 'Lee')).toHaveLength(2)
  })

  it('all items use the dayId from input', async () => {
    const items = [activity('A', '09:00', '4'), reservation('B', '2', '20:00')]
    const seen: string[] = []
    const onSaveOne = vi.fn(async (p: { dayId: string }) => {
      seen.push(p.dayId)
      return { success: true } as const
    })
    renderWithIntl(
      <QuickAddMultiReview
        items={items}
        onSaveOne={onSaveOne}
        onAllDone={vi.fn()}
        onBack={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create 2 items' }))
    await waitFor(() => expect(onSaveOne).toHaveBeenCalledTimes(2))
    expect(seen.every((id) => id === DAY)).toBe(true)
  })
})
