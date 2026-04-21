# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Settings >> branding city search shows mocked results
- Location: tests/e2e/settings.spec.ts:24:7

# Error details

```
Test timeout of 30000ms exceeded while setting up "signedInPage".
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel(/email/i)

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "Lourenço Botelho" [ref=e4] [cursor=pointer]:
        - /url: /
      - generic [ref=e5]:
        - navigation "Main" [ref=e6]:
          - list [ref=e8]:
            - listitem [ref=e9]:
              - link "Home" [ref=e10] [cursor=pointer]:
                - /url: /
            - listitem [ref=e11]:
              - link "About" [ref=e12] [cursor=pointer]:
                - /url: /about
            - listitem [ref=e13]:
              - link "Approach" [ref=e14] [cursor=pointer]:
                - /url: /approach
            - listitem [ref=e15]:
              - link "Experience" [ref=e16] [cursor=pointer]:
                - /url: /experience
            - listitem [ref=e17]:
              - link "Services" [ref=e18] [cursor=pointer]:
                - /url: /services
        - link "Book a session" [ref=e19] [cursor=pointer]:
          - /url: /services#book
  - main [ref=e20]:
    - generic [ref=e22]:
      - heading "404" [level=1] [ref=e23]
      - heading "This page could not be found." [level=2] [ref=e25]
  - contentinfo [ref=e26]:
    - generic [ref=e27]:
      - generic [ref=e28]:
        - generic [ref=e29]:
          - paragraph [ref=e30]: Lourenço Botelho
          - paragraph [ref=e31]: Clinical psychology · Lisbon
        - generic [ref=e32]:
          - paragraph [ref=e33]: Explore
          - list [ref=e34]:
            - listitem [ref=e35]:
              - link "Home" [ref=e36] [cursor=pointer]:
                - /url: /
            - listitem [ref=e37]:
              - link "About" [ref=e38] [cursor=pointer]:
                - /url: /about
            - listitem [ref=e39]:
              - link "Approach" [ref=e40] [cursor=pointer]:
                - /url: /approach
            - listitem [ref=e41]:
              - link "Experience" [ref=e42] [cursor=pointer]:
                - /url: /experience
            - listitem [ref=e43]:
              - link "Services" [ref=e44] [cursor=pointer]:
                - /url: /services
        - generic [ref=e45]:
          - paragraph [ref=e46]: Get started
          - paragraph [ref=e47]: Ready to book an intro call or session? Use the secure booking link.
          - link "Book a session" [ref=e48] [cursor=pointer]:
            - /url: /services#book
      - paragraph [ref=e49]: © 2026 Lourenço Botelho. All rights reserved.
  - button "Open Next.js Dev Tools" [ref=e55] [cursor=pointer]:
    - img [ref=e56]
  - alert [ref=e59]
```

# Test source

```ts
  19  | // ---------------------------------------------------------------------------
  20  | 
  21  | const TEST_SLUG = `e2e-${Date.now()}`;
  22  | const TEST_EMAIL = `e2e-${Date.now()}@courseday-test.invalid`;
  23  | const TEST_PASSWORD = 'E2eTestPass1!';
  24  | const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  25  | 
  26  | export type TestFixtures = {
  27  |   tenantUrl: string;
  28  |   tenantSlug: string;
  29  |   tenantId: string;
  30  |   testEmail: string;
  31  |   testPassword: string;
  32  |   signedInPage: import('@playwright/test').Page;
  33  | };
  34  | 
  35  | // ---------------------------------------------------------------------------
  36  | // Shared setup/teardown (runs once per worker via globalSetup-like approach)
  37  | // ---------------------------------------------------------------------------
  38  | 
  39  | let _tenantId: string | null = null;
  40  | let _userId: string | null = null;
  41  | 
  42  | async function setupTenant() {
  43  |   if (_tenantId) return { tenantId: _tenantId, userId: _userId! };
  44  | 
  45  |   const supabase = getServiceClient();
  46  | 
  47  |   // Create test user
  48  |   const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
  49  |     email: TEST_EMAIL,
  50  |     password: TEST_PASSWORD,
  51  |     email_confirm: true,
  52  |   });
  53  |   if (userErr) throw new Error(`Failed to create test user: ${userErr.message}`);
  54  |   _userId = userData.user.id;
  55  | 
  56  |   // Create test tenant
  57  |   const { data: tenant, error: tenantErr } = await supabase
  58  |     .from('tenants')
  59  |     .insert({ name: 'E2E Test Venue', slug: TEST_SLUG })
  60  |     .select('id')
  61  |     .single();
  62  |   if (tenantErr) throw new Error(`Failed to create test tenant: ${tenantErr.message}`);
  63  |   _tenantId = tenant.id;
  64  | 
  65  |   // Create membership (editor)
  66  |   await supabase.from('memberships').insert({
  67  |     user_id: _userId,
  68  |     tenant_id: _tenantId,
  69  |     role: 'editor',
  70  |   });
  71  | 
  72  |   // Seed tenant into Redis via the app's internal API isn't available here,
  73  |   // so we rely on the middleware's Supabase fallback for the first request.
  74  | 
  75  |   return { tenantId: _tenantId, userId: _userId };
  76  | }
  77  | 
  78  | async function teardownTenant() {
  79  |   if (!_tenantId && !_userId) return;
  80  |   const supabase = getServiceClient();
  81  |   if (_tenantId) await supabase.from('tenants').delete().eq('id', _tenantId);
  82  |   if (_userId) await supabase.auth.admin.deleteUser(_userId);
  83  |   _tenantId = null;
  84  |   _userId = null;
  85  | }
  86  | 
  87  | // ---------------------------------------------------------------------------
  88  | // Extended test fixture
  89  | // ---------------------------------------------------------------------------
  90  | 
  91  | export const test = base.extend<TestFixtures>({
  92  |   tenantSlug: async ({}, use) => {
  93  |     await setupTenant();
  94  |     await use(TEST_SLUG);
  95  |   },
  96  | 
  97  |   tenantId: async ({}, use) => {
  98  |     const { tenantId } = await setupTenant();
  99  |     await use(tenantId as string);
  100 |   },
  101 | 
  102 |   testEmail: async ({}, use) => {
  103 |     await use(TEST_EMAIL);
  104 |   },
  105 | 
  106 |   testPassword: async ({}, use) => {
  107 |     await use(TEST_PASSWORD);
  108 |   },
  109 | 
  110 |   tenantUrl: async ({}, use) => {
  111 |     await setupTenant();
  112 |     await use(`http://${TEST_SLUG}.${ROOT_DOMAIN}`);
  113 |   },
  114 | 
  115 |   signedInPage: async ({ page, tenantUrl }, use) => {
  116 |     await setupTenant();
  117 |     // Navigate to sign-in page
  118 |     await page.goto(`${tenantUrl}/auth/sign-in`);
> 119 |     await page.getByLabel(/email/i).fill(TEST_EMAIL);
      |                                     ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  120 |     await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  121 |     await page.getByRole('button', { name: /sign in/i }).click();
  122 |     // Wait for redirect to home
  123 |     await page.waitForURL(`${tenantUrl}/`);
  124 |     await use(page);
  125 |   },
  126 | });
  127 | 
  128 | export { expect, teardownTenant };
  129 | 
```