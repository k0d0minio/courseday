BEGIN;

ALTER TABLE memberships
  ADD COLUMN ical_token             text,
  ADD COLUMN ical_token_created_at  timestamptz;

CREATE UNIQUE INDEX memberships_ical_token_unique
  ON memberships (ical_token) WHERE ical_token IS NOT NULL;

COMMIT;
