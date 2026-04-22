-- Morning brief email log + optional system-generated_by on daily_brief
BEGIN;

ALTER TABLE daily_brief
  ALTER COLUMN generated_by DROP NOT NULL;

CREATE TABLE morning_brief_email_sent (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_id     uuid NOT NULL REFERENCES day(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, day_id)
);

CREATE INDEX morning_brief_email_sent_tenant_day_idx
  ON morning_brief_email_sent (tenant_id, day_id);

ALTER TABLE morning_brief_email_sent ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (cron) writes; no direct member access.
COMMIT;
