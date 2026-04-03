-- Create tenants table
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  timezone    TEXT NOT NULL DEFAULT 'Europe/Brussels',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security.
-- No SELECT policy is defined here because it must reference the memberships
-- table, which is created in migration 00002. The SELECT policy is added there.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
