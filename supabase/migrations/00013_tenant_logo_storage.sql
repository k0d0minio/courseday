-- Create storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-logos',
  'tenant-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access for logos
CREATE POLICY "public_can_read_logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tenant-logos');

-- Editors can upload logos for their tenant (path must start with tenant UUID)
CREATE POLICY "tenant_editors_can_upload_logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text
    FROM tenants t
    JOIN memberships m ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid() AND m.role = 'editor'
  )
);

-- Editors can replace (update) logos for their tenant
CREATE POLICY "tenant_editors_can_update_logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text
    FROM tenants t
    JOIN memberships m ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid() AND m.role = 'editor'
  )
);

-- Editors can delete logos for their tenant
CREATE POLICY "tenant_editors_can_delete_logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text
    FROM tenants t
    JOIN memberships m ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid() AND m.role = 'editor'
  )
);
