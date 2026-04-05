'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { updateTenant } from '@/app/actions/tenants';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface SettingsFormProps {
  tenantId: string;
  initialAccentColor: string | null;
  initialLogoUrl: string | null;
  initialLatitude: number | null;
  initialLongitude: number | null;
}

export function SettingsForm({ tenantId, initialAccentColor, initialLogoUrl, initialLatitude, initialLongitude }: SettingsFormProps) {
  const [accentColor, setAccentColor] = useState(initialAccentColor ?? '#1a1a1a');
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? '');
  const [latitude, setLatitude] = useState(initialLatitude != null ? String(initialLatitude) : '');
  const [longitude, setLongitude] = useState(initialLongitude != null ? String(initialLongitude) : '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleColorChange(value: string) {
    setAccentColor(value);
    // Live preview: update the CSS variable on the page
    document.documentElement.style.setProperty('--tenant-accent', value);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${tenantId}/logo.${ext}`;

      const { error } = await supabase.storage
        .from('tenant-logos')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-logos')
        .getPublicUrl(path);

      setLogoUrl(publicUrl);
      toast.success('Logo uploaded');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    setLogoUrl('');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const lat = latitude.trim() ? parseFloat(latitude) : null;
      const lon = longitude.trim() ? parseFloat(longitude) : null;

      const result = await updateTenant(tenantId, {
        accent_color: accentColor || null,
        logo_url: logoUrl || null,
        latitude: lat != null && !isNaN(lat) ? lat : null,
        longitude: lon != null && !isNaN(lon) ? lon : null,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Settings saved');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Color</CardTitle>
          <CardDescription>
            Applied as the primary accent color across your tenant's interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              id="accent-color-picker"
              type="color"
              value={accentColor.startsWith('#') ? accentColor : '#1a1a1a'}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="accent-color-input" className="sr-only">Hex color</Label>
              <Input
                id="accent-color-input"
                value={accentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-36 font-mono"
                placeholder="#1a1a1a"
              />
            </div>
          </div>
          <div
            className="h-8 w-full rounded-md border"
            style={{ backgroundColor: accentColor }}
            aria-label="Color preview"
          />
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Shown in the header. Recommended: PNG or SVG, max 5 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            <div className="flex items-center gap-4 rounded-md border p-3">
              <Image
                src={logoUrl}
                alt="Logo preview"
                width={160}
                height={48}
                className="max-h-12 w-auto object-contain"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
              >
                Remove
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Used to show weather forecasts on the day view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                placeholder="51.5074"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                placeholder="-0.1278"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Decimal degrees. Find your coordinates at{' '}
            <span className="font-mono">maps.google.com</span> → right-click → &ldquo;What&rsquo;s here?&rdquo;
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}
