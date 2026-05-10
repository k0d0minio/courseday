/**
 * Authentication flow tests.
 */
import { test, expect, teardownTenant } from './fixtures'

test.afterAll(async () => {
  await teardownTenant()
})

test.describe('Authentication', () => {
  test('sign-in page renders on tenant subdomain', async ({ page, tenantUrl }) => {
    await page.goto(`${tenantUrl}/auth/sign-in`)
    // Form renders directly on tenant subdomain — no redirect to root domain
    await expect(page).toHaveURL(`${tenantUrl}/auth/sign-in`)
    await expect(page.getByTestId('sign-in-form')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('sign-in-email')).toBeVisible()
  })

  test('invalid credentials show error', async ({ page, tenantUrl }) => {
    await page.goto(`${tenantUrl}/auth/sign-in`)
    await page.getByTestId('sign-in-email').fill('wrong@example.com')
    // Reveal password field before filling it
    await page.getByTestId('sign-in-use-password').click()
    await page.getByTestId('sign-in-password').fill('wrongpassword')
    await page.getByTestId('sign-in-submit').click()
    // Should stay on sign-in (not redirect away)
    await expect(page).toHaveURL(/\/auth\/sign-in/)
  })

  test('valid credentials sign in and redirect to home', async ({
    page,
    tenantUrl,
    testEmail,
    testPassword,
  }) => {
    await page.goto(`${tenantUrl}/auth/sign-in`)
    await page.getByTestId('sign-in-email').fill(testEmail)
    // Reveal password field before filling it
    await page.getByTestId('sign-in-use-password').click()
    await page.getByTestId('sign-in-password').fill(testPassword)
    await page.getByTestId('sign-in-submit').click()
    await page.waitForURL(`${tenantUrl}/`)
    await expect(page).toHaveURL(`${tenantUrl}/`)
  })

  test('authenticated user can sign out', async ({ signedInPage, tenantUrl: _tenantUrl }) => {
    await signedInPage.getByTestId('sign-out').first().click()
    await signedInPage.waitForURL(/\/auth\/sign-in/)
    await expect(signedInPage).toHaveURL(/\/auth\/sign-in/)
  })
})
