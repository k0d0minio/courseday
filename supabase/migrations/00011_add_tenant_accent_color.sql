-- Add optional accent color to tenants for future per-tenant theming
ALTER TABLE tenants ADD COLUMN accent_color TEXT;
