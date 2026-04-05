-- =============================================================================
-- Migration 00018: Feature flags per tenant
-- =============================================================================

-- ---------------------------------------------------------------------------
-- feature_flags
-- Stores per-tenant feature toggles. When no row exists for a (tenant, key)
-- pair the application defaults to enabled=true.
-- ---------------------------------------------------------------------------
CREATE TABLE feature_flags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  flag_key   text NOT NULL,
  enabled    boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, flag_key)
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own tenant's flags.
CREATE POLICY "feature_flags: members can read"
  ON feature_flags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = feature_flags.tenant_id
        AND memberships.user_id = auth.uid()
    )
  );

-- INSERT / UPDATE / DELETE are intentionally not exposed to end users.
-- Superadmin writes go through the service-role client.
