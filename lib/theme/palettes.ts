export type TenantThemeToken =
  | 'background'
  | 'foreground'
  | 'card'
  | 'card-foreground'
  | 'popover'
  | 'popover-foreground'
  | 'primary'
  | 'primary-foreground'
  | 'secondary'
  | 'secondary-foreground'
  | 'muted'
  | 'muted-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'destructive'
  | 'border'
  | 'input'
  | 'ring'
  | 'sidebar'
  | 'sidebar-foreground'
  | 'sidebar-primary'
  | 'sidebar-primary-foreground'
  | 'sidebar-accent'
  | 'sidebar-accent-foreground'
  | 'sidebar-border'
  | 'sidebar-ring'
  | 'success'
  | 'success-foreground'
  | 'warning'
  | 'warning-foreground'
  | 'info'
  | 'info-foreground';

export type TenantThemeTokens = Record<TenantThemeToken, string>;

export type TenantPaletteId =
  | 'evergreen'
  | 'ocean'
  | 'sunset'
  | 'violet'
  | 'charcoal'
  | 'terracotta';

export type TenantPalette = {
  id: TenantPaletteId;
  label: string;
  description: string;
  legacyAccentHex: string;
  light: TenantThemeTokens;
  dark: TenantThemeTokens;
};

export const DEFAULT_TENANT_PALETTE_ID: TenantPaletteId = 'evergreen';

const BASE_LIGHT = {
  background: 'oklch(1 0 0)',
  foreground: 'oklch(0.141 0.005 285.823)',
  card: 'oklch(1 0 0)',
  'card-foreground': 'oklch(0.141 0.005 285.823)',
  popover: 'oklch(1 0 0)',
  'popover-foreground': 'oklch(0.141 0.005 285.823)',
  secondary: 'oklch(0.967 0.001 286.375)',
  'secondary-foreground': 'oklch(0.22 0.01 286)',
  muted: 'oklch(0.97 0.001 286.3)',
  'muted-foreground': 'oklch(0.55 0.016 286)',
  destructive: 'oklch(0.577 0.245 27.325)',
  border: 'oklch(0.92 0.004 286.32)',
  input: 'oklch(0.92 0.004 286.32)',
  sidebar: 'oklch(0.985 0 0)',
  'sidebar-foreground': 'oklch(0.141 0.005 285.823)',
  'sidebar-border': 'oklch(0.92 0.004 286.32)',
  success: 'oklch(0.55 0.14 150)',
  'success-foreground': 'oklch(0.99 0.01 95)',
  warning: 'oklch(0.72 0.14 80)',
  'warning-foreground': 'oklch(0.22 0.03 82)',
  info: 'oklch(0.56 0.12 240)',
  'info-foreground': 'oklch(0.98 0.01 265)',
} satisfies Omit<
  TenantThemeTokens,
  | 'primary'
  | 'primary-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'ring'
  | 'sidebar-primary'
  | 'sidebar-primary-foreground'
  | 'sidebar-accent'
  | 'sidebar-accent-foreground'
  | 'sidebar-ring'
>;

const BASE_DARK = {
  background: 'oklch(0.141 0.005 285.823)',
  foreground: 'oklch(0.985 0 0)',
  card: 'oklch(0.21 0.006 285.885)',
  'card-foreground': 'oklch(0.985 0 0)',
  popover: 'oklch(0.21 0.006 285.885)',
  'popover-foreground': 'oklch(0.985 0 0)',
  secondary: 'oklch(0.274 0.006 286.033)',
  'secondary-foreground': 'oklch(0.985 0 0)',
  muted: 'oklch(0.274 0.006 286.033)',
  'muted-foreground': 'oklch(0.705 0.015 286.067)',
  destructive: 'oklch(0.704 0.191 22.216)',
  border: 'oklch(1 0 0 / 10%)',
  input: 'oklch(1 0 0 / 15%)',
  sidebar: 'oklch(0.21 0.006 285.885)',
  'sidebar-foreground': 'oklch(0.985 0 0)',
  'sidebar-border': 'oklch(1 0 0 / 10%)',
  success: 'oklch(0.72 0.11 154)',
  'success-foreground': 'oklch(0.16 0.03 150)',
  warning: 'oklch(0.82 0.12 82)',
  'warning-foreground': 'oklch(0.22 0.04 84)',
  info: 'oklch(0.77 0.1 244)',
  'info-foreground': 'oklch(0.19 0.03 246)',
} satisfies Omit<
  TenantThemeTokens,
  | 'primary'
  | 'primary-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'ring'
  | 'sidebar-primary'
  | 'sidebar-primary-foreground'
  | 'sidebar-accent'
  | 'sidebar-accent-foreground'
  | 'sidebar-ring'
>;

const PALETTES: readonly TenantPalette[] = [
  {
    id: 'evergreen',
    label: 'Evergreen',
    description: 'Classic Courseday green',
    legacyAccentHex: '#2f7a55',
    light: {
      ...BASE_LIGHT,
      primary: 'oklch(0.5 0.11 153)',
      'primary-foreground': 'oklch(0.985 0.01 90)',
      accent: 'oklch(0.95 0.03 152)',
      'accent-foreground': 'oklch(0.3 0.07 152)',
      ring: 'oklch(0.57 0.1 152)',
      'sidebar-primary': 'oklch(0.5 0.11 153)',
      'sidebar-primary-foreground': 'oklch(0.985 0.01 90)',
      'sidebar-accent': 'oklch(0.95 0.03 152)',
      'sidebar-accent-foreground': 'oklch(0.3 0.07 152)',
      'sidebar-ring': 'oklch(0.57 0.1 152)',
    },
    dark: {
      ...BASE_DARK,
      primary: 'oklch(0.75 0.1 152)',
      'primary-foreground': 'oklch(0.19 0.03 152)',
      accent: 'oklch(0.3 0.04 152)',
      'accent-foreground': 'oklch(0.88 0.05 152)',
      ring: 'oklch(0.68 0.09 152)',
      'sidebar-primary': 'oklch(0.75 0.1 152)',
      'sidebar-primary-foreground': 'oklch(0.19 0.03 152)',
      'sidebar-accent': 'oklch(0.3 0.04 152)',
      'sidebar-accent-foreground': 'oklch(0.88 0.05 152)',
      'sidebar-ring': 'oklch(0.68 0.09 152)',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Cool blue, high clarity',
    legacyAccentHex: '#2b6cb0',
    light: {
      ...BASE_LIGHT,
      primary: 'oklch(0.52 0.11 250)',
      'primary-foreground': 'oklch(0.98 0.01 260)',
      accent: 'oklch(0.94 0.02 245)',
      'accent-foreground': 'oklch(0.31 0.07 248)',
      ring: 'oklch(0.58 0.1 248)',
      'sidebar-primary': 'oklch(0.52 0.11 250)',
      'sidebar-primary-foreground': 'oklch(0.98 0.01 260)',
      'sidebar-accent': 'oklch(0.94 0.02 245)',
      'sidebar-accent-foreground': 'oklch(0.31 0.07 248)',
      'sidebar-ring': 'oklch(0.58 0.1 248)',
    },
    dark: {
      ...BASE_DARK,
      primary: 'oklch(0.74 0.1 249)',
      'primary-foreground': 'oklch(0.2 0.04 248)',
      accent: 'oklch(0.29 0.04 247)',
      'accent-foreground': 'oklch(0.89 0.04 246)',
      ring: 'oklch(0.67 0.09 248)',
      'sidebar-primary': 'oklch(0.74 0.1 249)',
      'sidebar-primary-foreground': 'oklch(0.2 0.04 248)',
      'sidebar-accent': 'oklch(0.29 0.04 247)',
      'sidebar-accent-foreground': 'oklch(0.89 0.04 246)',
      'sidebar-ring': 'oklch(0.67 0.09 248)',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Warm coral and amber',
    legacyAccentHex: '#c1563e',
    light: {
      ...BASE_LIGHT,
      primary: 'oklch(0.58 0.14 38)',
      'primary-foreground': 'oklch(0.99 0.01 60)',
      accent: 'oklch(0.95 0.03 42)',
      'accent-foreground': 'oklch(0.35 0.08 38)',
      ring: 'oklch(0.63 0.12 38)',
      'sidebar-primary': 'oklch(0.58 0.14 38)',
      'sidebar-primary-foreground': 'oklch(0.99 0.01 60)',
      'sidebar-accent': 'oklch(0.95 0.03 42)',
      'sidebar-accent-foreground': 'oklch(0.35 0.08 38)',
      'sidebar-ring': 'oklch(0.63 0.12 38)',
      warning: 'oklch(0.75 0.15 75)',
      'warning-foreground': 'oklch(0.24 0.04 75)',
    },
    dark: {
      ...BASE_DARK,
      primary: 'oklch(0.77 0.11 46)',
      'primary-foreground': 'oklch(0.24 0.05 40)',
      accent: 'oklch(0.32 0.05 44)',
      'accent-foreground': 'oklch(0.9 0.05 50)',
      ring: 'oklch(0.71 0.09 45)',
      'sidebar-primary': 'oklch(0.77 0.11 46)',
      'sidebar-primary-foreground': 'oklch(0.24 0.05 40)',
      'sidebar-accent': 'oklch(0.32 0.05 44)',
      'sidebar-accent-foreground': 'oklch(0.9 0.05 50)',
      'sidebar-ring': 'oklch(0.71 0.09 45)',
      warning: 'oklch(0.84 0.11 77)',
      'warning-foreground': 'oklch(0.28 0.05 78)',
    },
  },
  {
    id: 'violet',
    label: 'Violet',
    description: 'Calm purple with depth',
    legacyAccentHex: '#7257b8',
    light: {
      ...BASE_LIGHT,
      primary: 'oklch(0.53 0.11 304)',
      'primary-foreground': 'oklch(0.985 0.01 300)',
      accent: 'oklch(0.95 0.02 304)',
      'accent-foreground': 'oklch(0.33 0.07 304)',
      ring: 'oklch(0.6 0.1 304)',
      'sidebar-primary': 'oklch(0.53 0.11 304)',
      'sidebar-primary-foreground': 'oklch(0.985 0.01 300)',
      'sidebar-accent': 'oklch(0.95 0.02 304)',
      'sidebar-accent-foreground': 'oklch(0.33 0.07 304)',
      'sidebar-ring': 'oklch(0.6 0.1 304)',
      info: 'oklch(0.58 0.1 275)',
      'info-foreground': 'oklch(0.98 0.01 280)',
    },
    dark: {
      ...BASE_DARK,
      primary: 'oklch(0.75 0.1 304)',
      'primary-foreground': 'oklch(0.2 0.04 300)',
      accent: 'oklch(0.31 0.04 304)',
      'accent-foreground': 'oklch(0.9 0.04 304)',
      ring: 'oklch(0.68 0.09 304)',
      'sidebar-primary': 'oklch(0.75 0.1 304)',
      'sidebar-primary-foreground': 'oklch(0.2 0.04 300)',
      'sidebar-accent': 'oklch(0.31 0.04 304)',
      'sidebar-accent-foreground': 'oklch(0.9 0.04 304)',
      'sidebar-ring': 'oklch(0.68 0.09 304)',
      info: 'oklch(0.76 0.09 274)',
      'info-foreground': 'oklch(0.2 0.04 274)',
    },
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    description: 'Neutral graphite with blue tint',
    legacyAccentHex: '#3f4e63',
    light: {
      ...BASE_LIGHT,
      primary: 'oklch(0.42 0.03 257)',
      'primary-foreground': 'oklch(0.99 0.01 260)',
      accent: 'oklch(0.94 0.01 252)',
      'accent-foreground': 'oklch(0.32 0.03 257)',
      ring: 'oklch(0.5 0.03 257)',
      'sidebar-primary': 'oklch(0.42 0.03 257)',
      'sidebar-primary-foreground': 'oklch(0.99 0.01 260)',
      'sidebar-accent': 'oklch(0.94 0.01 252)',
      'sidebar-accent-foreground': 'oklch(0.32 0.03 257)',
      'sidebar-ring': 'oklch(0.5 0.03 257)',
    },
    dark: {
      ...BASE_DARK,
      primary: 'oklch(0.72 0.03 255)',
      'primary-foreground': 'oklch(0.21 0.02 255)',
      accent: 'oklch(0.3 0.01 252)',
      'accent-foreground': 'oklch(0.9 0.02 252)',
      ring: 'oklch(0.65 0.03 255)',
      'sidebar-primary': 'oklch(0.72 0.03 255)',
      'sidebar-primary-foreground': 'oklch(0.21 0.02 255)',
      'sidebar-accent': 'oklch(0.3 0.01 252)',
      'sidebar-accent-foreground': 'oklch(0.9 0.02 252)',
      'sidebar-ring': 'oklch(0.65 0.03 255)',
    },
  },
  {
    id: 'terracotta',
    label: 'Terracotta',
    description: 'Earthy clay and sand',
    legacyAccentHex: '#9d4f3f',
    light: {
      ...BASE_LIGHT,
      primary: 'oklch(0.5 0.1 32)',
      'primary-foreground': 'oklch(0.99 0.01 80)',
      accent: 'oklch(0.95 0.02 40)',
      'accent-foreground': 'oklch(0.32 0.07 32)',
      ring: 'oklch(0.56 0.09 32)',
      'sidebar-primary': 'oklch(0.5 0.1 32)',
      'sidebar-primary-foreground': 'oklch(0.99 0.01 80)',
      'sidebar-accent': 'oklch(0.95 0.02 40)',
      'sidebar-accent-foreground': 'oklch(0.32 0.07 32)',
      'sidebar-ring': 'oklch(0.56 0.09 32)',
      success: 'oklch(0.52 0.1 155)',
      'success-foreground': 'oklch(0.98 0.01 95)',
    },
    dark: {
      ...BASE_DARK,
      primary: 'oklch(0.72 0.09 34)',
      'primary-foreground': 'oklch(0.21 0.04 34)',
      accent: 'oklch(0.31 0.04 34)',
      'accent-foreground': 'oklch(0.9 0.04 40)',
      ring: 'oklch(0.65 0.08 34)',
      'sidebar-primary': 'oklch(0.72 0.09 34)',
      'sidebar-primary-foreground': 'oklch(0.21 0.04 34)',
      'sidebar-accent': 'oklch(0.31 0.04 34)',
      'sidebar-accent-foreground': 'oklch(0.9 0.04 40)',
      'sidebar-ring': 'oklch(0.65 0.08 34)',
      success: 'oklch(0.7 0.1 154)',
      'success-foreground': 'oklch(0.18 0.03 154)',
    },
  },
] as const;

const PALETTE_BY_ID: Record<TenantPaletteId, TenantPalette> = {
  evergreen: PALETTES[0],
  ocean: PALETTES[1],
  sunset: PALETTES[2],
  violet: PALETTES[3],
  charcoal: PALETTES[4],
  terracotta: PALETTES[5],
};

const LEGACY_ACCENT_TO_ID: Record<string, TenantPaletteId> = Object.values(PALETTE_BY_ID).reduce<Record<string, TenantPaletteId>>(
  (acc, palette) => {
    acc[palette.legacyAccentHex.toLowerCase()] = palette.id;
    return acc;
  },
  {}
);

export const TENANT_PALETTES = PALETTES;

export function isTenantPaletteId(value: string | null | undefined): value is TenantPaletteId {
  if (!value) return false;
  return value in PALETTE_BY_ID;
}

export function resolveTenantPaletteId(
  paletteId: string | null | undefined,
  legacyAccentColor?: string | null
): TenantPaletteId {
  if (isTenantPaletteId(paletteId)) return paletteId;

  const normalizedAccent = legacyAccentColor?.trim().toLowerCase();
  if (normalizedAccent && normalizedAccent in LEGACY_ACCENT_TO_ID) {
    return LEGACY_ACCENT_TO_ID[normalizedAccent];
  }

  return DEFAULT_TENANT_PALETTE_ID;
}

export function getTenantPalette(
  paletteId: string | null | undefined,
  legacyAccentColor?: string | null
): TenantPalette {
  const resolvedId = resolveTenantPaletteId(paletteId, legacyAccentColor);
  return PALETTE_BY_ID[resolvedId];
}

function mapTokenVars(prefix: string, tokens: TenantThemeTokens): Record<string, string> {
  return Object.entries(tokens).reduce<Record<string, string>>((acc, [token, value]) => {
    acc[`--tenant-${prefix}-${token}`] = value;
    return acc;
  }, {});
}

export function getTenantThemeCssVariables(palette: TenantPalette): Record<string, string> {
  return {
    ...mapTokenVars('light', palette.light),
    ...mapTokenVars('dark', palette.dark),
  };
}
