-- Seed: test tenant
-- Slug: test  →  accessible at test.localhost:3000 in dev
--                or test.[your-production-domain] in prod
-- Fixed UUID so Redis and Supabase stay in sync across environments.

INSERT INTO tenants (id, name, slug, timezone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test Golf Club',
  'test',
  'Europe/Brussels'
)
ON CONFLICT (slug) DO NOTHING;
