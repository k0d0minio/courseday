-- =============================================================================
-- Migration 00017: Pending invitations + membership visibility for editors
-- =============================================================================

-- ---------------------------------------------------------------------------
-- pending_invitations
-- Holds invitations for users who haven't signed up yet (or haven't signed in
-- to accept). On the next sign-in, requireTenantMember auto-accepts and deletes
-- the row.
-- ---------------------------------------------------------------------------
CREATE TABLE pending_invitations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL CHECK (role IN ('editor', 'viewer')) DEFAULT 'viewer',
  token      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_invitations: editors can select"
  ON pending_invitations FOR SELECT TO authenticated
  USING (is_tenant_editor(tenant_id));

CREATE POLICY "pending_invitations: editors can insert"
  ON pending_invitations FOR INSERT TO authenticated
  WITH CHECK (is_tenant_editor(tenant_id));

CREATE POLICY "pending_invitations: editors can delete"
  ON pending_invitations FOR DELETE TO authenticated
  USING (is_tenant_editor(tenant_id));

-- ---------------------------------------------------------------------------
-- Allow editors to see all memberships for their tenant.
-- The original policy only allowed a user to see their own membership row,
-- which prevents editors from listing the team.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;

CREATE POLICY "Users can view own or editor can view tenant memberships"
  ON memberships FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_tenant_editor(tenant_id)
  );

-- ---------------------------------------------------------------------------
-- Helper: resolve a Supabase auth user UUID from an email address.
-- SECURITY DEFINER so it can read auth.users; restricted to service_role so
-- application code cannot enumerate user accounts.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION get_user_id_by_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_id_by_email(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION get_user_id_by_email(text) TO service_role;
