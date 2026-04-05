-- =============================================================================
-- Migration 00016: Superadmins table
-- =============================================================================
-- Stores users with platform-wide administrative access.
-- Access is only via the service client (bypasses RLS); no public policies
-- are defined so the regular anon/authenticated roles cannot query this table.
-- =============================================================================

CREATE TABLE superadmins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policies — all access is through the service role client.
-- This prevents any authenticated user from discovering superadmin UUIDs.
