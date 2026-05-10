import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

// Radix Select doesn't behave well in jsdom (relies on PointerEvent + portals).
// Swap the primitive for a native <select> so the kind-switch test is reliable.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
    disabled,
  }: {
    value?: string
    onValueChange?: (v: string) => void
    children?: React.ReactNode
    disabled?: boolean
  }) => (
    <select
      data-testid="kind-select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

import { QuickAddReview } from '@/components/quick-add-review'
import type { QuickAddParseData } from '@/lib/quick-add-types'

const messages = {
  Tenant: {
    quickAdd: {
      reviewTitle: 'Review',
      reviewDescription: 'Review the parsed details, adjust anything, then save.',
      kindLabel: 'Type',
      kindActivity: 'Activity',
      kindReservation: 'Reservation',
      kindBreakfast: 'Breakfast',
      primaryActivity: 'Title',
      primaryReservation: 'Guest name',
      primaryBreakfast: 'Group name',
      startTimeLabel: 'Start time',
      endTimeLabel: 'End time',
      expectedCoversLabel: 'Expected covers',
      guestCountLabel: 'Guest count',
      notesLabel: 'Notes',
      dateLabel: 'Date',
      back: 'Back',
      save: 'Save',
      saving: 'Saving…',
    },
    allergens: {
      label: 'Allergens',
      names: {
        gluten: 'Gluten',
        crustaceans: 'Crustaceans',
        eggs: 'Eggs',
        fish: 'Fish',
        peanuts: 'Peanuts',
        soy: 'Soy',
        dairy: 'Dairy',
        nuts: 'Nuts',
        celery: 'Celery',
        mustard: 'Mustard',
        sesame: 'Sesame',
        sulphites: 'Sulphites',
        lupin: 'Lupin',
        molluscs: 'Molluscs',
      },
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

const baseActivity: QuickAddParseData = {
  kind: 'activity',
  dayId: '00000000-0000-0000-0000-000000000001',
  contextDate: '2026-05-10',
  dateAmbiguous: false,
  defaults: {
    title: 'Member golf',
    description: '',
    startTime: '08:00',
    endTime: '12:00',
    expectedCovers: '24',
    notes: '',
  },
  allergens: ['nuts'],
  gapFieldKeys: ['expectedCovers'],
  modelFilledFieldKeys: ['title', 'startTime'],
}

const baseReservation: QuickAddParseData = {
  kind: 'reservation',
  dayId: '00000000-0000-0000-0000-000000000001',
  contextDate: '2026-05-10',
  dateAmbiguous: false,
  defaults: {
    guestName: 'Smith',
    guestCount: '6',
    startTime: '20:00',
    endTime: '',
    notes: '',
  },
  tableBreakdown: [4, 2],
  allergens: [],
  gapFieldKeys: ['startTime'],
  modelFilledFieldKeys: ['guestName', 'guestCount'],
}

describe('QuickAddReview', () => {
  it('shows parsed activity fields and saves on confirm', () => {
    const onConfirm = vi.fn()
    const onBack = vi.fn()

    renderWithIntl(
      <QuickAddReview
        data={baseActivity}
        rawText="Member golf 8am, 24 players"
        onConfirm={onConfirm}
        onBack={onBack}
      />
    )

    expect(screen.getByLabelText('Title')).toHaveValue('Member golf')
    expect(screen.getByLabelText('Start time')).toHaveValue('08:00')
    expect(screen.getByLabelText('Expected covers')).toHaveValue(24)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'activity',
        title: 'Member golf',
        startTime: '08:00',
        endTime: '12:00',
        expectedCovers: 24,
        allergens: ['nuts'],
        contextDate: '2026-05-10',
        dayId: baseActivity.dayId,
      })
    )
  })

  it('switching kind reshapes save payload while preserving applicable fields', () => {
    const onConfirm = vi.fn()

    renderWithIntl(
      <QuickAddReview
        data={baseReservation}
        rawText="Party of 6 at 8pm, Smith"
        onConfirm={onConfirm}
        onBack={() => {}}
      />
    )

    // Reservation initial primary label
    expect(screen.getByLabelText('Guest name')).toHaveValue('Smith')

    fireEvent.change(screen.getByTestId('kind-select'), { target: { value: 'activity' } })

    // After switching to activity, the primary label is "Title" but the value
    // (originally guest name) is preserved.
    expect(screen.getByLabelText('Title')).toHaveValue('Smith')
    // Count field re-labels to "Expected covers" with the same numeric value.
    expect(screen.getByLabelText('Expected covers')).toHaveValue(6)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    const arg = onConfirm.mock.calls[0]![0]
    expect(arg.kind).toBe('activity')
    expect(arg.title).toBe('Smith')
    expect(arg.startTime).toBe('20:00')
    expect(arg.expectedCovers).toBe(6)
  })

  it('Back triggers onBack', () => {
    const onBack = vi.fn()
    renderWithIntl(
      <QuickAddReview data={baseActivity} rawText="raw" onConfirm={() => {}} onBack={onBack} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows date picker when dateAmbiguous and submits new date', () => {
    const ambiguous: QuickAddParseData = { ...baseActivity, dateAmbiguous: true }
    const onConfirm = vi.fn()

    renderWithIntl(
      <QuickAddReview data={ambiguous} rawText="raw" onConfirm={onConfirm} onBack={() => {}} />
    )

    const date = screen.getByLabelText('Date') as HTMLInputElement
    expect(date.value).toBe('2026-05-10')
    fireEvent.change(date, { target: { value: '2026-05-12' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ contextDate: '2026-05-12' }))
  })

  it('disables Save while pending', () => {
    renderWithIntl(
      <QuickAddReview
        data={baseActivity}
        rawText="raw"
        onConfirm={() => {}}
        onBack={() => {}}
        isPending
      />
    )
    const save = screen.getByRole('button', { name: 'Saving…' })
    expect(save).toBeDisabled()
  })

  it('toggles allergen chips', () => {
    const onConfirm = vi.fn()
    renderWithIntl(
      <QuickAddReview data={baseActivity} rawText="raw" onConfirm={onConfirm} onBack={() => {}} />
    )
    const group = screen.getByRole('group', { name: 'Allergens' })
    const eggs = within(group).getByRole('button', { name: 'Eggs' })
    fireEvent.click(eggs)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    const arg = onConfirm.mock.calls[0]![0]
    expect(arg.allergens).toEqual(expect.arrayContaining(['nuts', 'eggs']))
  })
})
