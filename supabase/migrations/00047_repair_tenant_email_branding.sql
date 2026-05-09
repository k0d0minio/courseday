-- Repair: migration 00042 was recorded in history but its DDL never executed.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS email_from_name TEXT,
  ADD COLUMN IF NOT EXISTS email_reply_to TEXT;
