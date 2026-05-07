-- =============================================================================
-- Migration 00040: Fix role check constraints after 00039 failed to apply
-- =============================================================================
-- Migration 00039 (merge_staff_into_memberships) was never pushed to production.
-- Production still has CHECK (role IN ('editor', 'viewer')) on both tables and
-- one existing 'viewer' membership row. This migration brings production in line
-- with the intended state: role is 'editor' | 'staff'.
-- =============================================================================

BEGIN;

-- 1. memberships: drop old constraint first, rename rows, add new constraint.
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
UPDATE memberships SET role = 'staff' WHERE role = 'viewer';
ALTER TABLE memberships
  ADD CONSTRAINT memberships_role_check CHECK (role IN ('editor', 'staff'));
ALTER TABLE memberships ALTER COLUMN role SET DEFAULT 'staff';

-- 2. pending_invitations: same pattern.
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check;
UPDATE pending_invitations SET role = 'staff' WHERE role = 'viewer';
ALTER TABLE pending_invitations
  ADD CONSTRAINT pending_invitations_role_check CHECK (role IN ('editor', 'staff'));
ALTER TABLE pending_invitations ALTER COLUMN role SET DEFAULT 'staff';

COMMIT;
