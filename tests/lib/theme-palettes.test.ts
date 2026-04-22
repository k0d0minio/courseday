import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TENANT_PALETTE_ID,
  getTenantPalette,
  getTenantThemeCssVariables,
  resolveTenantPaletteId,
} from '@/lib/theme/palettes';

describe('tenant theme palettes', () => {
  it('falls back to default palette for unknown values', () => {
    expect(resolveTenantPaletteId('not-a-palette')).toBe(DEFAULT_TENANT_PALETTE_ID);
  });

  it('maps known legacy accent values to curated palette ids', () => {
    expect(resolveTenantPaletteId(null, '#2b6cb0')).toBe('ocean');
  });

  it('exposes light and dark css variable maps', () => {
    const palette = getTenantPalette('sunset');
    const cssVars = getTenantThemeCssVariables(palette);

    expect(cssVars['--tenant-light-primary']).toBe(palette.light.primary);
    expect(cssVars['--tenant-dark-primary']).toBe(palette.dark.primary);
    expect(cssVars['--tenant-light-destructive']).toBe(palette.light.destructive);
    expect(cssVars['--tenant-dark-destructive']).toBe(palette.dark.destructive);
  });
});
