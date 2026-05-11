import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

vi.mock('@/lib/tenant-context', () => ({
  useTenant: () => ({ tenantSlug: 'test-tenant', tenantId: 'tid' }),
}))

vi.mock('@/app/actions/activity-tags', () => ({
  getAllActivityTags: vi.fn().mockResolvedValue({ success: true, data: [] }),
  createActivityTag: vi.fn(),
}))

vi.mock('@/app/actions/poc', () => ({
  createPOC: vi.fn(),
}))

vi.mock('@/app/actions/venue-type', () => ({
  createVenueType: vi.fn(),
}))

vi.mock('@/app/actions/days', () => ({
  ensureDayExists: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'resolved-day-id', date_iso: '2026-06-01', tenant_id: 'tid', weekday: 'monday' },
  }),
}))

vi.mock('@/lib/day-mutation-client', () => ({
  mutateWithOfflineQueue: vi.fn().mockResolvedValue({ success: true, data: { id: 'act-1' } }),
}))

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}))

// Stub Radix Select to a native <select> for jsdom
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string
    onValueChange?: (v: string) => void
    children?: React.ReactNode
  }) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
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

// Stub Dialog/Drawer to render children directly
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DrawerContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/allergen-multi-select', () => ({
  AllergenMultiSelect: () => null,
}))

vi.mock('@/components/more-options-section', () => ({
  MoreOptionsSection: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean
    onCheckedChange?: (v: boolean) => void
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}))

import { ActivityForm } from '@/components/activity-form'
import { ensureDayExists } from '@/app/actions/days'
import { mutateWithOfflineQueue } from '@/lib/day-mutation-client'

const messages = {
  Tenant: {
    activityForm: {
      addTitle: 'Add activity',
      editTitle: 'Edit activity',
      titleLabel: 'Title',
      tagsLabel: 'Tags',
      tagsPlaceholder: 'Select tags…',
      addNewTag: 'Add new tag',
      tagNamePlaceholder: 'Tag name',
      dateLabel: 'Date',
      dateRequired: 'Date is required',
      startTimeLabel: 'Start time',
      endTimeLabel: 'End time',
      expectedCoversLabel: 'Expected covers',
      venueTypeLabel: 'Venue type',
      selectVenueType: 'Select venue type',
      pocLabel: 'Point of contact',
      selectPoc: 'Select point of contact',
      addNew: 'Add new…',
      newVenueType: 'New venue type',
      newPoc: 'New point of contact',
      notesLabel: 'Notes',
      recurringLabel: 'Recurring',
      selectFrequency: 'Select frequency',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
      occurrences: 'This will create {count} occurrences.',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Activity added.',
      updated: 'Activity updated.',
      pocAdded: 'Point of contact added.',
      venueTypeAdded: 'Venue type added.',
      namePlaceholder: 'Name *',
      emailPlaceholder: 'Email (optional)',
      phonePlaceholder: 'Phone (optional)',
    },
    allergens: {
      label: 'Allergens',
      moreOptions: 'More options',
      placeholder: 'None',
    },
  },
}

function renderForm(props: Partial<React.ComponentProps<typeof ActivityForm>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ActivityForm
        isOpen
        onClose={() => {}}
        pocs={[]}
        venueTypes={[]}
        onSuccess={() => {}}
        {...props}
      />
    </NextIntlClientProvider>
  )
}

describe('ActivityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a date field when no dayId is provided', () => {
    renderForm()
    expect(screen.getByTestId('activity-form-date')).toBeInTheDocument()
  })

  it('does not show a date field when dayId is provided', () => {
    renderForm({ dayId: 'some-day-id', defaultDate: '2026-05-11' })
    expect(screen.queryByTestId('activity-form-date')).not.toBeInTheDocument()
  })

  it('rejects submission without a date when no dayId is provided', async () => {
    renderForm()
    const titleInput = screen.getByTestId('activity-form-title')
    fireEvent.change(titleInput, { target: { value: 'Morning Golf' } })

    fireEvent.submit(screen.getByTestId('activity-form'))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Date is required')
    })
    expect(ensureDayExists).not.toHaveBeenCalled()
    expect(mutateWithOfflineQueue).not.toHaveBeenCalled()
  })

  it('calls ensureDayExists and submits when date is provided', async () => {
    renderForm()
    const titleInput = screen.getByTestId('activity-form-title')
    fireEvent.change(titleInput, { target: { value: 'Morning Golf' } })

    const dateInput = screen.getByTestId('activity-form-date')
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } })

    fireEvent.submit(screen.getByTestId('activity-form'))

    await waitFor(() => {
      expect(ensureDayExists).toHaveBeenCalledWith('2026-06-01')
    })
    await waitFor(() => {
      expect(mutateWithOfflineQueue).toHaveBeenCalled()
    })
  })
})
