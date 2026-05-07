-- Remove unused `code` column from venue_type.
-- The column is not referenced in business logic; `name` already provides
-- per-tenant uniqueness via venue_type_tenant_name_unique.

DROP INDEX IF EXISTS venue_type_tenant_code_unique;

ALTER TABLE venue_type DROP COLUMN IF EXISTS code;
