-- Add curated palette selection as tenant theming source of truth.
-- Keep accent_color for backwards compatibility (legacy/PWA fallback).
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS theme_palette TEXT;

UPDATE tenants
SET theme_palette = 'evergreen'
WHERE theme_palette IS NULL;

ALTER TABLE tenants
  ALTER COLUMN theme_palette SET DEFAULT 'evergreen',
  ALTER COLUMN theme_palette SET NOT NULL;

ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_theme_palette_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_theme_palette_check CHECK (
    theme_palette IN (
      'evergreen',
      'ocean',
      'sunset',
      'violet',
      'charcoal',
      'terracotta'
    )
  );
