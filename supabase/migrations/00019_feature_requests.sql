-- =============================================================================
-- Migration 00019: Feature requests
-- =============================================================================

-- ---------------------------------------------------------------------------
-- feature_requests
-- Submitted by tenant members; status managed by superadmins via service role.
-- ---------------------------------------------------------------------------
CREATE TABLE feature_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description text CHECK (char_length(description) <= 1000),
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected', 'shipped')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Tenant members can read all requests for their tenant.
CREATE POLICY "feature_requests: members can select"
  ON feature_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = feature_requests.tenant_id
        AND memberships.user_id = auth.uid()
    )
  );

-- Members can submit requests for their own tenant.
CREATE POLICY "feature_requests: members can insert"
  ON feature_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = feature_requests.tenant_id
        AND memberships.user_id = auth.uid()
    )
  );

-- UPDATE and DELETE are intentionally not exposed to end users.
-- Superadmin status changes go through the service-role client.
