import { NextResponse } from 'next/server';
import { getTenantFromHeaders } from '@/lib/tenant';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTenantPalette } from '@/lib/theme/palettes';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function isLightHex(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function buildSvg(initials: string, bg: string, fg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${bg}"/>
  <text x="256" y="256" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui,-apple-system,sans-serif" font-size="${initials.length > 1 ? 196 : 240}"
    font-weight="700" fill="${fg}">${initials}</text>
</svg>`;
}

export async function GET() {
  try {
    const tenant = await getTenantFromHeaders();
    const supabase = await createSupabaseServerClient();

    const { data } = await supabase
      .from('tenants')
      .select('name, theme_palette, accent_color, logo_url')
      .eq('id', tenant.id)
      .single();

    const logoUrl = data?.logo_url as string | null;
    if (logoUrl) {
      return NextResponse.redirect(logoUrl, { status: 302 });
    }

    const name = (data?.name as string | null) ?? 'C';
    const palette = getTenantPalette(
      (data?.theme_palette as string | null) ?? null,
      (data?.accent_color as string | null) ?? null
    );
    const bg = palette.legacyAccentHex;
    const fg = isLightHex(bg) ? '#1a1a1a' : '#ffffff';
    const initials = getInitials(name) || name[0].toUpperCase();

    return new NextResponse(buildSvg(initials, bg, fg), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch {
    const fallback = buildSvg('C', '#e5e7eb', '#1a1a1a');
    return new NextResponse(fallback, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }
}
