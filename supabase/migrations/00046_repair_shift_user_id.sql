-- Repair: migration 00039 was recorded in history but its shift DDL never executed.
-- Memberships role constraint (editor/staff) already applied; this picks up the rest.

BEGIN;

ALTER TABLE shift ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

-- Best-effort match: staff_member.name vs auth.users.email, scoped to same tenant.
WITH match AS (
  SELECT DISTINCT ON (sm.id)
    sm.id      AS staff_member_id,
    m.user_id  AS user_id
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

DELETE FROM shift WHERE user_id IS NULL;

ALTER TABLE shift ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE shift DROP COLUMN IF EXISTS staff_member_id;

CREATE INDEX IF NOT EXISTS shift_user_id_idx ON shift (user_id);

DROP TABLE IF EXISTS staff_member CASCADE;
DROP TABLE IF EXISTS staff_role CASCADE;

COMMIT;
