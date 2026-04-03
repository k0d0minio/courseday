/**
 * Seeds a "test" tenant into both Supabase and Redis.
 * Run once: node scripts/seed-test-tenant.mjs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^"|"$/g, '');
    process.env[key] = value;
  }
}

const TENANT_ID   = '11111111-1111-1111-1111-111111111111';
const TENANT_NAME = 'Test Golf Club';
const TENANT_SLUG = 'test';

// ── Supabase ──────────────────────────────────────────────────────────────
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { error } = await supabase.from('tenants').upsert(
  { id: TENANT_ID, name: TENANT_NAME, slug: TENANT_SLUG, timezone: 'Europe/Brussels' },
  { onConflict: 'slug' }
);

if (error) {
  console.error('Supabase insert failed:', error.message);
  process.exit(1);
}
console.log('✓ Tenant inserted into Supabase');

// ── Redis ─────────────────────────────────────────────────────────────────
const { default: Redis } = await import('ioredis');
const redis = new Redis(process.env.REDIS_URL);

await redis.set(
  `subdomain:${TENANT_SLUG}`,
  JSON.stringify({ id: TENANT_ID, name: TENANT_NAME, slug: TENANT_SLUG })
);
console.log('✓ Tenant inserted into Redis');

await redis.quit();
console.log('\nDone. Visit test.localhost:3000 (dev) or test.<your-domain> (prod).');
