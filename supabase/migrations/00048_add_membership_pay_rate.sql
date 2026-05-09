BEGIN;

ALTER TABLE memberships
  ADD COLUMN hourly_rate numeric(10,2),
  ADD COLUMN currency    text;

ALTER TABLE memberships
  ADD CONSTRAINT memberships_currency_format_check
  CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');

COMMIT;
