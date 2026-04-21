-- Allow tenant editors to update their own tenant row (name, slug, branding, etc.)
-- so server actions can use the authenticated Supabase client instead of service role.

CREATE POLICY "Editors can update their tenant"
  ON tenants
  FOR UPDATE
  TO authenticated
  USING (is_tenant_editor(tenants.id))
  WITH CHECK (is_tenant_editor(tenants.id));
