/**
 * Subdomain routing smoke tests.
 * Verifies that the middleware correctly routes tenant subdomains.
 */
import { test, expect } from './fixtures';

test.describe('Subdomain routing', () => {
  test('tenant subdomain redirects to sign-in when unauthenticated', async ({ page, tenantUrl }) => {
    await page.goto(tenantUrl);
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('unknown subdomain returns 404', async ({ page }) => {
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
    const response = await page.goto(`http://no-such-tenant-xyz.${root}`);
    expect(response?.status()).toBe(404);
  });

  test('root domain loads platform landing page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveURL('http://localhost:3000/');
    // Should not redirect to sign-in (root domain is public)
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
  });
});
