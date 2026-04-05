/**
 * Day view and activity CRUD tests.
 */
import { test, expect } from './fixtures';
import { format } from 'date-fns';

const TODAY = format(new Date(), 'yyyy-MM-dd');

test.describe('Day view', () => {
  test('navigating to today shows day view', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${TODAY}`);
    await expect(signedInPage).toHaveURL(`${tenantUrl}/day/${TODAY}`);
    // Activities section should be visible
    await expect(signedInPage.getByRole('heading', { name: /activities/i })).toBeVisible();
  });

  test('add activity — form opens, saves, and appears in list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${TODAY}`);

    // Click "Activity" add button
    await signedInPage.getByRole('button', { name: /^activity$/i }).click();

    // Fill title
    const titleInput = signedInPage.getByLabel(/title/i);
    await titleInput.fill('E2E Test Activity');

    // Submit
    await signedInPage.getByRole('button', { name: /^save$/i }).click();

    // Activity should appear
    await expect(signedInPage.getByText('E2E Test Activity')).toBeVisible();
  });

  test('edit activity — updates title in list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${TODAY}`);

    // Find the activity added in the previous test and click its edit button
    const editBtn = signedInPage.getByRole('button', { name: /edit: E2E Test Activity/i });
    await editBtn.click();

    const titleInput = signedInPage.getByLabel(/title/i);
    await titleInput.clear();
    await titleInput.fill('E2E Updated Activity');

    await signedInPage.getByRole('button', { name: /^save$/i }).click();

    await expect(signedInPage.getByText('E2E Updated Activity')).toBeVisible();
  });

  test('delete activity — removes from list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${TODAY}`);

    // Delete the activity
    const deleteBtn = signedInPage.getByRole('button', { name: /delete: E2E Updated Activity/i });
    await deleteBtn.click();

    // Confirm deletion in dialog
    await signedInPage.getByRole('button', { name: /^delete$/i }).click();

    await expect(signedInPage.getByText('E2E Updated Activity')).not.toBeVisible();
  });
});

test.describe('Reservation CRUD', () => {
  test('add reservation — appears in list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${TODAY}`);

    await signedInPage.getByRole('button', { name: /add reservation/i }).click();

    await signedInPage.getByLabel(/guest name/i).fill('E2E Guest');

    await signedInPage.getByRole('button', { name: /^save$/i }).click();

    await expect(signedInPage.getByText('E2E Guest')).toBeVisible();
  });

  test('delete reservation — removes from list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${TODAY}`);

    const deleteBtn = signedInPage.getByRole('button', { name: /delete: E2E Guest/i });
    await deleteBtn.click();

    await signedInPage.getByRole('button', { name: /^delete$/i }).click();

    await expect(signedInPage.getByText('E2E Guest')).not.toBeVisible();
  });
});

test.describe('Breakfast CRUD', () => {
  test('add breakfast — appears in list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${TODAY}`);

    await signedInPage.getByRole('button', { name: /add breakfast/i }).click();

    await signedInPage.getByLabel(/group name/i).fill('E2E Breakfast Group');

    await signedInPage.getByRole('button', { name: /^save$/i }).click();

    await expect(signedInPage.getByText('E2E Breakfast Group')).toBeVisible();
  });

  test('delete breakfast — removes from list', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/day/${TODAY}`);

    const deleteBtn = signedInPage.getByRole('button', { name: /delete: E2E Breakfast Group/i });
    await deleteBtn.click();

    await signedInPage.getByRole('button', { name: /^delete$/i }).click();

    await expect(signedInPage.getByText('E2E Breakfast Group')).not.toBeVisible();
  });
});
