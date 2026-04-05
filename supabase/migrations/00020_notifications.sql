-- =============================================================================
-- Migration 00020: Notifications
-- =============================================================================

-- ---------------------------------------------------------------------------
-- notifications
-- In-app notifications per user per tenant. Created by server-side helpers
-- (service role); read and marked-read by the owning user.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text,
  link       text,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_tenant_idx
  ON notifications (user_id, tenant_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications for any tenant.
CREATE POLICY "notifications: users can read own"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read.
CREATE POLICY "notifications: users can update own"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications.
CREATE POLICY "notifications: users can delete own"
  ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- INSERT goes through the service-role client (notifyTenantMembers helper).
-- No INSERT policy for authenticated users — prevent direct creation.
