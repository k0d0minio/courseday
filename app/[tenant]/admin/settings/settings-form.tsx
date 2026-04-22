'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { updateTenant } from '@/app/actions/tenants';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CitySearch } from '@/components/city-search';
import { TenantPalettePicker } from '@/components/tenant-palette-picker';
import {
  getTenantPalette,
  getTenantThemeCssVariables,
  resolveTenantPaletteId,
  type TenantPaletteId,
} from '@/lib/theme/palettes';

interface SettingsFormProps {
  tenantId: string;
  initialPaletteId: string | null;
  initialAccentColor: string | null;
  initialLogoUrl: string | null;
  initialLatitude: number | null;
  initialLongitude: number | null;
}

export function SettingsForm({
  tenantId,
  initialPaletteId,
  initialAccentColor,
  initialLogoUrl,
  initialLatitude,
  initialLongitude,
}: SettingsFormProps) {
  const [paletteId, setPaletteId] = useState<TenantPaletteId>(
    resolveTenantPaletteId(initialPaletteId, initialAccentColor)
  );
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? '');
  const [latitude, setLatitude] = useState(initialLatitude != null ? String(initialLatitude) : '');
  const [longitude, setLongitude] = useState(initialLongitude != null ? String(initialLongitude) : '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyPalettePreview(nextPaletteId: TenantPaletteId) {
    const root = document.querySelector('.tenant-themed');
    if (!(root instanceof HTMLElement)) return;

    const palette = getTenantPalette(nextPaletteId);
    const cssVars = getTenantThemeCssVariables(palette);
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  function handlePaletteChange(nextPaletteId: TenantPaletteId) {
    setPaletteId(nextPaletteId);
    applyPalettePreview(nextPaletteId);
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
      const palette = getTenantPalette(paletteId);

      const result = await updateTenant(tenantId, {
        theme_palette: paletteId,
        accent_color: palette.legacyAccentHex,
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
          <CardTitle>Theme palette</CardTitle>
          <CardDescription>
            Pick a curated palette. All non-destructive highlights update to this theme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label className="sr-only">Palette picker</Label>
          <TenantPalettePicker value={paletteId} onChange={handlePaletteChange} />
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
        <CardContent>
          {/* City search replaces manual lat/lon inputs */}
          <CitySearch
            initialLatitude={latitude ? parseFloat(latitude) : null}
            initialLongitude={longitude ? parseFloat(longitude) : null}
            onSelect={(lat, lon) => {
              setLatitude(String(lat));
              setLongitude(String(lon));
            }}
            onClear={() => {
              setLatitude('');
              setLongitude('');
            }}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}
