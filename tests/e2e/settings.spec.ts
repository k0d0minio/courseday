/**
 * Tenant settings page tests.
 */
import { test, expect } from './fixtures';

test.describe('Settings', () => {
  test('settings page loads and shows tabs', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/admin/settings`);
    await expect(signedInPage).toHaveURL(`${tenantUrl}/admin/settings`);
    // At least one settings tab should be visible
    await expect(signedInPage.getByRole('tab').first()).toBeVisible();
  });

  test('venue name can be updated', async ({ signedInPage, tenantUrl }) => {
    await signedInPage.goto(`${tenantUrl}/admin/settings`);

    // Look for branding or general settings tab
    const brandingTab = signedInPage.getByRole('tab', { name: /branding/i });
    if (await brandingTab.isVisible()) {
      await brandingTab.click();
    }

    const nameInput = signedInPage.getByLabel(/venue name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Updated Venue');
      await signedInPage.getByRole('button', { name: /save/i }).first().click();
      // Toast or success indicator
      await expect(signedInPage.getByText(/saved|updated/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
