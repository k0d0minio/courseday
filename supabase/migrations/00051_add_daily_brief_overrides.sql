-- =============================================================================
-- Migration 00050: Editor overrides for daily_brief headline + summary
-- =============================================================================
-- Editors can manually edit the brief's headline / summary to fix typos,
-- clarify phrasing, or soften tone without throwing away the rest of the
-- LLM-generated content. Overrides are stored alongside the original
-- `content` jsonb so the AI output is preserved (for diffing / restoring)
-- and so a future Regenerate cleanly clears the human edits.
--
-- Existing RLS policies on daily_brief already restrict UPDATE to tenant
-- editors, so no new policies are needed.
-- =============================================================================

BEGIN;

ALTER TABLE daily_brief
  ADD COLUMN headline_override text,
  ADD COLUMN summary_override  text,
  ADD COLUMN overridden_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN overridden_at     timestamptz;

COMMIT;
