-- =============================================================================
-- Migration 00028: Add allergens TEXT[] column to reservation,
-- breakfast_configuration, and activity. Stores EU-14 allergen codes.
-- =============================================================================

BEGIN;

ALTER TABLE reservation
  ADD COLUMN allergens TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE breakfast_configuration
  ADD COLUMN allergens TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE activity
  ADD COLUMN allergens TEXT[] NOT NULL DEFAULT '{}';

COMMIT;
