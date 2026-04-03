-- Create memberships table
CREATE TABLE memberships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('editor', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Users can read their own membership rows
CREATE POLICY "Users can view own memberships"
  ON memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Editors of a tenant can add new members to that tenant
CREATE POLICY "Editors can insert memberships"
  ON memberships FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = memberships.tenant_id
        AND m.user_id   = auth.uid()
        AND m.role      = 'editor'
    )
  );

-- Editors of a tenant can update membership roles for that tenant
CREATE POLICY "Editors can update memberships"
  ON memberships FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = memberships.tenant_id
        AND m.user_id   = auth.uid()
        AND m.role      = 'editor'
    )
  );

-- Editors of a tenant can remove members from that tenant
CREATE POLICY "Editors can delete memberships"
  ON memberships FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = memberships.tenant_id
        AND m.user_id   = auth.uid()
        AND m.role      = 'editor'
    )
  );

-- -----------------------------------------------------------------------
-- Tenants SELECT policy (deferred from migration 00001 — requires this table)
-- -----------------------------------------------------------------------
CREATE POLICY "Members can view their tenants"
  ON tenants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = tenants.id
        AND memberships.user_id   = auth.uid()
    )
  );
