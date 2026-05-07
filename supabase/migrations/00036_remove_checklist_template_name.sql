-- =============================================================================
-- Migration 00036: Drop redundant name column from checklist_template
-- =============================================================================
--
-- Templates are uniquely identified by their scope (venue_type_id or
-- activity_tag_id), so the free-text name has no purpose. Drop it.
--
-- Destructive: existing names are lost. No FKs / indexes / RLS reference name.
-- Item snapshots on activity_checklist_item carry their own labels and are
-- unaffected.

ALTER TABLE checklist_template DROP COLUMN name;
