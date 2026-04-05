import { test as base, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase admin client (service role, bypasses RLS)
// ---------------------------------------------------------------------------

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const TEST_SLUG = `e2e-${Date.now()}`;
const TEST_EMAIL = `e2e-${Date.now()}@courseday-test.invalid`;
const TEST_PASSWORD = 'E2eTestPass1!';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

export type TestFixtures = {
  tenantUrl: string;
  tenantSlug: string;
  tenantId: string;
  testEmail: string;
  testPassword: string;
  signedInPage: import('@playwright/test').Page;
};

// ---------------------------------------------------------------------------
// Shared setup/teardown (runs once per worker via globalSetup-like approach)
// ---------------------------------------------------------------------------

let _tenantId: string | null = null;
let _userId: string | null = null;

async function setupTenant() {
  if (_tenantId) return { tenantId: _tenantId, userId: _userId! };

  const supabase = getServiceClient();

  // Create test user
  const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (userErr) throw new Error(`Failed to create test user: ${userErr.message}`);
  _userId = userData.user.id;

  // Create test tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .insert({ name: 'E2E Test Venue', slug: TEST_SLUG })
    .select('id')
    .single();
  if (tenantErr) throw new Error(`Failed to create test tenant: ${tenantErr.message}`);
  _tenantId = tenant.id;

  // Create membership (editor)
  await supabase.from('memberships').insert({
    user_id: _userId,
    tenant_id: _tenantId,
    role: 'editor',
  });

  // Seed tenant into Redis via the app's internal API isn't available here,
  // so we rely on the middleware's Supabase fallback for the first request.

  return { tenantId: _tenantId, userId: _userId };
}

async function teardownTenant() {
  if (!_tenantId && !_userId) return;
  const supabase = getServiceClient();
  if (_tenantId) await supabase.from('tenants').delete().eq('id', _tenantId);
  if (_userId) await supabase.auth.admin.deleteUser(_userId);
  _tenantId = null;
  _userId = null;
}

// ---------------------------------------------------------------------------
// Extended test fixture
// ---------------------------------------------------------------------------

export const test = base.extend<TestFixtures>({
  tenantSlug: async ({}, use) => {
    await setupTenant();
    await use(TEST_SLUG);
  },

  tenantId: async ({}, use) => {
    const { tenantId } = await setupTenant();
    await use(tenantId as string);
  },

  testEmail: async ({}, use) => {
    await use(TEST_EMAIL);
  },

  testPassword: async ({}, use) => {
    await use(TEST_PASSWORD);
  },

  tenantUrl: async ({}, use) => {
    await setupTenant();
    await use(`http://${TEST_SLUG}.${ROOT_DOMAIN}`);
  },

  signedInPage: async ({ page, tenantUrl }, use) => {
    await setupTenant();
    // Navigate to sign-in page
    await page.goto(`${tenantUrl}/auth/sign-in`);
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Wait for redirect to home
    await page.waitForURL(`${tenantUrl}/`);
    await use(page);
  },
});

export { expect, teardownTenant };
