/**
 * Day view and activity CRUD tests.
 */
import { test, expect } from './fixtures'
import { addDays, format } from 'date-fns'

// Per-suite future date so parallel workers (if ever enabled) can't collide on
// today's date and so test order isn't sensitive to wall-clock midnight.
function uniqueFutureDate(offset: number): string {
  return format(addDays(new Date(), offset), 'yyyy-MM-dd')
}

test.describe('Day view', () => {
  const dayDate = uniqueFutureDate(7)

  test('navigating to day shows day view', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${dayDate}`)
    await expect(signedInPage).toHaveURL(`${tenantUrl}/day/${dayDate}`)
    // Activities section should be visible
    await expect(signedInPage.getByRole('heading', { name: /activities/i })).toBeVisible({
      timeout: 5000,
    })
  })

  test('add activity — form opens, saves, and appears in list', async ({
    signedInPage,
    tenantUrl,
  }) => {
    await signedInPage.goto(`${tenantUrl}/day/${dayDate}`)

    await signedInPage.getByTestId('add-activity').click()
    await signedInPage.getByTestId('activity-form-title').fill('E2E Test Activity')
    await signedInPage.getByTestId('activity-form-save').click()

    await expect(signedInPage.getByText('E2E Test Activity')).toBeVisible({ timeout: 5000 })
  })

  test('edit activity — updates title in list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${dayDate}`)

    const card = signedInPage.getByTestId('activity-card').filter({ hasText: 'E2E Test Activity' })
    await card.getByTestId('activity-card-edit').click()

    const titleInput = signedInPage.getByTestId('activity-form-title')
    await titleInput.clear()
    await titleInput.fill('E2E Updated Activity')
    await signedInPage.getByTestId('activity-form-save').click()

    await expect(signedInPage.getByText('E2E Updated Activity')).toBeVisible({ timeout: 5000 })
  })

  test('delete activity — removes from list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${dayDate}`)

    const card = signedInPage
      .getByTestId('activity-card')
      .filter({ hasText: 'E2E Updated Activity' })
    await card.getByTestId('activity-card-delete').click()
    await signedInPage.getByTestId('activity-card-delete-confirm').click()

    await expect(signedInPage.getByText('E2E Updated Activity')).toHaveCount(0, { timeout: 5000 })
  })
})

test.describe('Reservation CRUD', () => {
  const dayDate = uniqueFutureDate(8)

  test('add reservation — appears in list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${dayDate}`)

    await signedInPage.getByTestId('add-reservation').click()
    await signedInPage.getByTestId('reservation-form-guest-name').fill('E2E Guest')
    await signedInPage.getByTestId('reservation-form-save').click()

    await expect(signedInPage.getByText('E2E Guest')).toBeVisible({ timeout: 5000 })
  })

  test('delete reservation — removes from list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${dayDate}`)

    const card = signedInPage.getByTestId('reservation-card').filter({ hasText: 'E2E Guest' })
    await card.getByTestId('reservation-card-delete').click()
    await signedInPage.getByTestId('reservation-card-delete-confirm').click()

    await expect(signedInPage.getByText('E2E Guest')).toHaveCount(0, { timeout: 5000 })
  })
})

test.describe('Breakfast CRUD', () => {
  const dayDate = uniqueFutureDate(9)

  test('add breakfast — appears in list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${dayDate}`)

    await signedInPage.getByTestId('add-breakfast').click()
    await signedInPage.getByTestId('breakfast-form-group-name').fill('E2E Breakfast Group')
    await signedInPage.getByTestId('breakfast-form-save').click()

    await expect(signedInPage.getByText('E2E Breakfast Group')).toBeVisible({ timeout: 5000 })
  })

  test('delete breakfast — removes from list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${dayDate}`)

    const card = signedInPage
      .getByTestId('breakfast-card')
      .filter({ hasText: 'E2E Breakfast Group' })
    await card.getByTestId('breakfast-card-delete').click()
    await signedInPage.getByTestId('breakfast-card-delete-confirm').click()

    await expect(signedInPage.getByText('E2E Breakfast Group')).toHaveCount(0, { timeout: 5000 })
  })
})
