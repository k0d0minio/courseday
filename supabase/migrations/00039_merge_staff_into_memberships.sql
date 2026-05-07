-- =============================================================================
-- Migration 00038: Merge staff_member into memberships; rename viewer → staff
-- =============================================================================
-- Collapses the parallel staff_member CRUD into the existing memberships table
-- and renames the legacy "viewer" role to "staff". A shift now points at a
-- tenant member directly via user_id → auth.users(id).
--
-- Migration safety:
--   - Existing memberships with role='viewer' are renamed to 'staff'.
--   - shift.staff_member_id is best-effort matched to a tenant member by
--     case/whitespace-insensitive comparison of staff_member.name to the
--     local-part of auth.users.email. Unmatched shifts are deleted.
--   - staff_member and staff_role tables are dropped.
-- =============================================================================

BEGIN;

-- 1. Allow 'staff' alongside legacy 'viewer' during the rename.
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships
  ADD CONSTRAINT memberships_role_check
  CHECK (role IN ('editor', 'viewer', 'staff'));

UPDATE memberships SET role = 'staff' WHERE role = 'viewer';

-- Lock to the final two roles.
ALTER TABLE memberships DROP CONSTRAINT memberships_role_check;
ALTER TABLE memberships
  ADD CONSTRAINT memberships_role_check CHECK (role IN ('editor', 'staff'));
ALTER TABLE memberships ALTER COLUMN role SET DEFAULT 'staff';

-- 2. Re-point shift.staff_member_id → memberships.user_id.
ALTER TABLE shift ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

-- Best-effort match: staff_member.name vs auth.users.email local-part, scoped
-- to members of the same tenant. Where multiple members match the same name,
-- pick the lexicographically smallest user_id for determinism.
WITH match AS (
  SELECT DISTINCT ON (sm.id)
    sm.id           AS staff_member_id,
    m.user_id       AS user_id
  FROM staff_member sm
  JOIN memberships m ON m.tenant_id = sm.tenant_id
  JOIN auth.users  u ON u.id = m.user_id
  WHERE LOWER(TRIM(sm.name)) = LOWER(TRIM(SPLIT_PART(u.email, '@', 1)))
     OR LOWER(TRIM(sm.name)) = LOWER(TRIM(u.email))
  ORDER BY sm.id, m.user_id
)
UPDATE shift s
   SET user_id = match.user_id
  FROM match
 WHERE s.staff_member_id = match.staff_member_id;

-- Drop shifts that could not be matched. Operational rosters must be rebuilt
-- using the new picker (which now lists tenant members).
DELETE FROM shift WHERE user_id IS NULL;

ALTER TABLE shift ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE shift DROP COLUMN staff_member_id;

CREATE INDEX shift_user_id_idx ON shift (user_id);

-- 3. Drop the now-unreferenced legacy tables.
DROP TABLE IF EXISTS staff_member CASCADE;
DROP TABLE IF EXISTS staff_role CASCADE;

COMMIT;
