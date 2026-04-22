// EU-14 standard food allergens. Codes are stable identifiers stored in the DB.
export const ALLERGEN_CODES = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'dairy',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const;

export type AllergenCode = (typeof ALLERGEN_CODES)[number];

export type AllergenDescriptor = {
  code: AllergenCode;
  emoji: string;
  labelKey: string;
};

export const ALLERGENS: ReadonlyArray<AllergenDescriptor> = [
  { code: 'gluten',      emoji: '\u{1F33E}', labelKey: 'gluten' },      // 🌾
  { code: 'crustaceans', emoji: '\u{1F990}', labelKey: 'crustaceans' }, // 🦐
  { code: 'eggs',        emoji: '\u{1F95A}', labelKey: 'eggs' },        // 🥚
  { code: 'fish',        emoji: '\u{1F41F}', labelKey: 'fish' },        // 🐟
  { code: 'peanuts',     emoji: '\u{1F95C}', labelKey: 'peanuts' },     // 🥜
  { code: 'soy',         emoji: '\u{1FAD8}', labelKey: 'soy' },         // 🫘
  { code: 'dairy',       emoji: '\u{1F95B}', labelKey: 'dairy' },       // 🥛
  { code: 'nuts',        emoji: '\u{1F330}', labelKey: 'nuts' },        // 🌰
  { code: 'celery',      emoji: '\u{1F96C}', labelKey: 'celery' },      // 🥬
  { code: 'mustard',     emoji: '\u{1F7E1}', labelKey: 'mustard' },     // 🟡
  { code: 'sesame',      emoji: '\u{26AA}',  labelKey: 'sesame' },      // ⚪
  { code: 'sulphites',   emoji: '\u{1F377}', labelKey: 'sulphites' },   // 🍷
  { code: 'lupin',       emoji: '\u{1F33C}', labelKey: 'lupin' },       // 🌼
  { code: 'molluscs',    emoji: '\u{1F41A}', labelKey: 'molluscs' },    // 🐚
];

const ALLERGEN_CODE_SET = new Set<string>(ALLERGEN_CODES);

export function isAllergenCode(x: unknown): x is AllergenCode {
  return typeof x === 'string' && ALLERGEN_CODE_SET.has(x);
}

export function filterAllergenCodes(values: readonly string[] | null | undefined): AllergenCode[] {
  if (!values) return [];
  const out: AllergenCode[] = [];
  for (const v of values) {
    if (isAllergenCode(v)) out.push(v);
  }
  return out;
}

const ALLERGEN_BY_CODE: Record<AllergenCode, AllergenDescriptor> = ALLERGENS.reduce(
  (acc, a) => {
    acc[a.code] = a;
    return acc;
  },
  {} as Record<AllergenCode, AllergenDescriptor>
);

export function getAllergen(code: AllergenCode): AllergenDescriptor {
  return ALLERGEN_BY_CODE[code];
}
