/**
 * Authentication flow tests.
 */
import { test, expect, teardownTenant } from './fixtures';

test.afterAll(async () => {
  await teardownTenant();
});

test.describe('Authentication', () => {
  test('sign-in page renders', async ({ page, tenantUrl }) => {
    await page.goto(`${tenantUrl}/auth/sign-in`);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('invalid credentials show error', async ({ page, tenantUrl }) => {
    await page.goto(`${tenantUrl}/auth/sign-in`);
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should stay on sign-in (not redirect away)
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('valid credentials sign in and redirect to home', async ({ page, tenantUrl, testEmail, testPassword }) => {
    await page.goto(`${tenantUrl}/auth/sign-in`);
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(`${tenantUrl}/`);
    await expect(page).toHaveURL(`${tenantUrl}/`);
  });

  test('authenticated user can sign out', async ({ signedInPage, tenantUrl }) => {
    // Open user menu and sign out
    await signedInPage.getByRole('button', { name: /sign out|user menu/i }).first().click();
    const signOutBtn = signedInPage.getByRole('menuitem', { name: /sign out/i });
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
    }
    await signedInPage.waitForURL(/\/auth\/sign-in/);
    await expect(signedInPage).toHaveURL(/\/auth\/sign-in/);
  });
});
