-- Add language preference to tenants.
-- Supported values: 'en', 'fr'. Defaults to English.
ALTER TABLE tenants ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
