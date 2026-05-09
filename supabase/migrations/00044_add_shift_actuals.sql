BEGIN;

ALTER TABLE shift
  ADD COLUMN actual_start timestamptz,
  ADD COLUMN actual_end   timestamptz;

COMMIT;
