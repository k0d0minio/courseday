-- =============================================================================
-- Migration 00050: ai_call_log — per-call LLM telemetry
-- =============================================================================
-- One row per LLM invocation (success or failure). Used by the superadmin AI
-- usage panel to surface call volume, error rate, and latency per tenant /
-- feature. No prompt or completion content is stored — token tallies only.
--
-- Access model: service-role only. RLS is enabled with no authenticated /
-- anon policies, so non-service callers cannot read or write the table.
-- =============================================================================

BEGIN;

CREATE TABLE ai_call_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid REFERENCES tenants(id) ON DELETE SET NULL,
  feature            text NOT NULL CHECK (feature IN ('quick_add', 'daily_brief')),
  model              text NOT NULL,
  prompt_tokens      integer,
  completion_tokens  integer,
  duration_ms        integer,
  status             text NOT NULL CHECK (status IN ('ok', 'error')),
  error_message      text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_call_log_tenant_created_idx
  ON ai_call_log (tenant_id, created_at DESC);

CREATE INDEX ai_call_log_feature_created_idx
  ON ai_call_log (feature, created_at DESC);

ALTER TABLE ai_call_log ENABLE ROW LEVEL SECURITY;

-- No policies for `authenticated` or `anon`: service_role bypasses RLS, so
-- only the service role key can insert or read rows. Application code that
-- needs telemetry access must use createSupabaseServiceClient().

COMMIT;
