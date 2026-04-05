-- Add status column to tenants for lifecycle management
-- Possible values: 'active' (default), 'suspended', 'archived'

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CONSTRAINT tenants_status_check CHECK (status IN ('active', 'suspended', 'archived'));

CREATE INDEX IF NOT EXISTS tenants_status_idx ON tenants (status);
