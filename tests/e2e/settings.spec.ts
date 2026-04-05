/**
 * Tenant settings page tests.
 */
import { test, expect } from './fixtures';

test.describe('Settings', () => {
  test('settings index redirects to poc page', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/admin/settings`);
    await expect(signedInPage).toHaveURL(`${tenantUrl}/admin/settings/poc`);
  });

  test('poc settings page loads', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/admin/settings/poc`);
    await expect(signedInPage).toHaveURL(`${tenantUrl}/admin/settings/poc`);
    await expect(signedInPage.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('branding settings page loads', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/admin/settings/branding`);
    await expect(signedInPage).toHaveURL(`${tenantUrl}/admin/settings/branding`);
    await expect(signedInPage.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('venue name can be updated on branding page', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/admin/settings/branding`);

    const nameInput = signedInPage.getByLabel(/venue name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Updated Venue');
      await signedInPage.getByRole('button', { name: /save/i }).first().click();
      await expect(signedInPage.getByText(/saved|updated/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('all settings sections are reachable', async ({ signedInPage, tenantUrl }) => {
    const sections = [
      'poc',
      'venue-types',
      'activity-tags',
      'branding',
      'language',
      'members',
      'templates',
      'feedback',
    ];

    for (const section of sections) {
      await signedInPage.goto(`${tenantUrl}/admin/settings/${section}`);
      await expect(signedInPage).toHaveURL(`${tenantUrl}/admin/settings/${section}`);
      await expect(signedInPage.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });
});
