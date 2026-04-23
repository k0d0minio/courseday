import { generateObject } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { createBreakfastSchema, type CreateBreakfastFormData } from '@/lib/breakfast-schema';
import { activitySchema } from '@/lib/program-item-schema';
import { reservationSchema, type ReservationFormData } from '@/lib/reservation-schema';
import {
  type AllergenCode,
  filterAllergenCodes,
  isAllergenCode,
} from '@/lib/allergens';

import { PROMPT_VERSION, QUICK_ADD_SYSTEM, buildUserPrompt } from './quick-add-prompt';
import type { QuickAddParseData, QuickAddGapId } from '@/lib/quick-add-types';

export const QUICK_ADD_MODEL_ID = 'openai/gpt-5.4' as const;

function hasGatewayAuth(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}
export { PROMPT_VERSION } from './quick-add-prompt';
export type {
  QuickAddActivityFormDefaults,
  QuickAddParseData,
  QuickAddReservationFormDefaults,
  QuickAddBreakfastFormDefaults,
  QuickAddGapId,
} from '@/lib/quick-add-types';
export { QUICK_ADD_GAP_ACTIVITY, QUICK_ADD_GAP_RESERVATION, QUICK_ADD_GAP_BREAKFAST } from '@/lib/quick-add-types';

// ---------------------------------------------------------------------------
// LLM output
// ---------------------------------------------------------------------------

const strNull = z.string().nullable();
const intNull = z.coerce.number().int().nullable();

// OpenAI strict structured output requires root `type: object` AND every key
// in `required`. To express "absent", use nullable fields instead of optional.
const allFields = z.object({
  title: strNull,
  description: strNull,
  guestName: strNull,
  groupName: strNull,
  startTime: strNull,
  endTime: strNull,
  expectedCovers: intNull,
  guestCount: intNull,
  notes: strNull,
  tableBreakdown: z.array(z.number().int().min(1)).max(20).nullable(),
  allergenHints: z.array(z.string()).nullable(),
});

const quickAddLlmSchema = z.object({
  kind: z.enum(['activity', 'reservation', 'breakfast']),
  dateAmbiguous: z.boolean(),
  fields: allFields,
});

// ---------------------------------------------------------------------------
// Time + allergen (exported for tests)
// ---------------------------------------------------------------------------

const DIETARY_UNMAPPED_PREFIX = 'Dietary (unmapped)';

export function normalizeToTimeInput(raw: string | null | undefined): string {
  if (raw == null) return '';
  const t = raw.trim();
  if (!t) return '';
  const m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!m) return '';
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function mapSynonymToCode(s: string): AllergenCode | null {
  const t = s
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (t === 'milk' || t === 'lactose' || t === 'dairy' || t.includes('dairy')) return 'dairy';
  if (t === 'peanut' || t === 'peanuts') return 'peanuts';
  if (
    t === 'treenut' ||
    t === 'tree nuts' ||
    t === 'tree nut' ||
    t === 'no nuts' ||
    t === 'nuts' ||
    t === 'nut' ||
    t.includes(' nut')
  ) {
    return 'nuts';
  }
  if (t === 'wheat' || t === 'gluten' || t === 'cereals containing gluten') return 'gluten';
  if (
    t === 'shellfish' ||
    t === 'shrimp' ||
    t === 'crab' ||
    t === 'lobster' ||
    t === 'prawn' ||
    t === 'prawns' ||
    t === 'crustacean' ||
    t === 'crustaceans' ||
    t.includes('crustacean')
  ) {
    return 'crustaceans';
  }
  if (t === 'mollusc' || t === 'molluscs' || t === 'scallop') {
    return 'molluscs';
  }
  if (t === 'egg' || t === 'eggs') return 'eggs';
  if (t === 'soy' || t === 'soya' || t === 'soybean') return 'soy';
  if (t === 'fish' || t === 'salmon' || t === 'cod' || t.includes('fish')) return 'fish';
  if (t === 'sesame' || t === 'tahini') return 'sesame';
  if (t === 'celery') return 'celery';
  if (t === 'mustard') return 'mustard';
  if (
    t === 'sulphite' ||
    t === 'sulphites' ||
    t === 'sulfite' ||
    t === 'sulfites' ||
    t === 'wine'
  ) {
    return 'sulphites';
  }
  if (t === 'lupin') return 'lupin';
  if (isAllergenCode(t)) return t;
  return null;
}

export function mapAllergenHints(
  hints: string[] | undefined
): { codes: AllergenCode[]; unmapped: string } {
  if (!hints?.length) return { codes: [], unmapped: '' };
  const seen = new Set<AllergenCode>();
  const unknown: string[] = [];
  for (const h of hints) {
    const raw = h.trim();
    if (!raw) continue;
    const s = raw.toLowerCase();
    if (isAllergenCode(s)) {
      const c = s as AllergenCode;
      if (!seen.has(c)) {
        seen.add(c);
      }
      continue;
    }
    const m = mapSynonymToCode(s);
    if (m) {
      seen.add(m);
    } else {
      unknown.push(raw);
    }
  }
  return { codes: filterAllergenCodes([...seen]) as AllergenCode[], unmapped: unknown.join(', ') };
}

function appendUnmappedToNotes(
  baseNotes: string,
  unmapped: string
): { notes: string; modelExtra: string } {
  if (!unmapped) return { notes: baseNotes.trim(), modelExtra: '' };
  const extra = `${DIETARY_UNMAPPED_PREFIX}: ${unmapped}`;
  const n = baseNotes.trim();
  if (!n) return { notes: extra, modelExtra: extra };
  if (n.toLowerCase().includes('dietary (unmapped)')) {
    return { notes: n, modelExtra: extra };
  }
  return { notes: `${n}\n${extra}`, modelExtra: extra };
}

function isFilledString(v: string | undefined): boolean {
  return v != null && v.trim() !== '';
}

function isFilledCountStr(s: string | undefined): boolean {
  if (s == null || s.trim() === '') return false;
  const n = parseInt(s, 10);
  return !Number.isNaN(n) && n > 0;
}

function computeGaps(
  kind: 'activity' | 'reservation' | 'breakfast',
  a: {
    title?: string;
    guestName?: string;
    groupName?: string;
    startTime: string;
    expectedCovers?: string;
    guestCount?: string;
  }
): QuickAddGapId[] {
  if (kind === 'activity') {
    const g: QuickAddGapId[] = [];
    if (!isFilledString(a.title)) g.push('title');
    if (!isFilledString(a.startTime)) g.push('startTime');
    if (!a.expectedCovers || a.expectedCovers.trim() === '' || !/^\d+$/.test(a.expectedCovers)) {
      g.push('expectedCovers');
    }
    return g;
  }
  if (kind === 'reservation') {
    const g: QuickAddGapId[] = [];
    if (!isFilledString(a.guestName)) g.push('guestName');
    if (!isFilledCountStr(a.guestCount)) g.push('guestCount');
    if (!isFilledString(a.startTime)) g.push('startTime');
    return g;
  }
  const g: QuickAddGapId[] = [];
  if (!isFilledString(a.groupName)) g.push('groupName');
  if (!isFilledCountStr(a.guestCount)) g.push('guestCount');
  if (!isFilledString(a.startTime)) g.push('startTime');
  return g;
}

function modelKeysFromLlmFields(fields: Record<string, unknown>): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'allergenHints') {
      if (Array.isArray(v) && v.length) keys.push('allergens');
      continue;
    }
    if (v == null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (k === 'guestCount' && typeof v === 'number' && (v as number) <= 0) continue;
    if (k === 'expectedCovers' && typeof v === 'number' && (v as number) < 0) continue;
    keys.push(k);
  }
  return keys;
}

function clampWithActivitySchema(
  data: {
    dayId: string;
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    expectedCovers?: number;
    notes?: string;
    allergens?: AllergenCode[];
  }
): {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  expectedCovers: string;
  notes: string;
} {
  const row: Record<string, unknown> = {
    dayId: data.dayId,
    title: data.title,
    description: data.description,
    startTime: data.startTime,
    endTime: data.endTime,
    expectedCovers: data.expectedCovers,
    notes: data.notes,
    allergens: data.allergens,
  };
  const p = activitySchema
    .partial()
    .extend({ dayId: z.string().uuid() })
    .safeParse(row);
  const base = (() => {
    if (!p.success) {
      return {
        title: (data.title ?? '') as string,
        description: (data.description ?? '') as string,
        startTime: data.startTime ? normalizeToTimeInput(String(data.startTime)) : '',
        endTime: data.endTime ? normalizeToTimeInput(String(data.endTime)) : '',
        expectedCovers: data.expectedCovers != null ? String(data.expectedCovers) : '',
        notes: (data.notes ?? '') as string,
      };
    }
    const o = p.data;
    return {
      title: (o.title as string) ?? (data.title ?? '') ?? '',
      description: (o.description as string) ?? (data.description ?? '') ?? '',
      startTime: o.startTime
        ? normalizeToTimeInput(String(o.startTime))
        : data.startTime
          ? normalizeToTimeInput(String(data.startTime))
          : '',
      endTime: o.endTime
        ? normalizeToTimeInput(String(o.endTime))
        : data.endTime
          ? normalizeToTimeInput(String(data.endTime))
          : '',
      expectedCovers:
        o.expectedCovers != null ? String(o.expectedCovers) : data.expectedCovers != null ? String(data.expectedCovers) : '',
      notes: (o.notes as string) ?? (data.notes ?? '') ?? '',
    };
  })();
  return base;
}

function clampReservation(
  o: { dayId: string } & Partial<ReservationFormData>
): {
  guestName: string;
  guestCount: string;
  startTime: string;
  endTime: string;
  notes: string;
  tableBreakdown: number[];
} {
  const parsed = reservationSchema
    .partial()
    .extend({ dayId: z.string().uuid() })
    .safeParse(o);
  if (!parsed.success) {
    return {
      guestName: o.guestName ?? '',
      guestCount: o.guestCount != null ? String(o.guestCount) : '',
      startTime: o.startTime ? normalizeToTimeInput(String(o.startTime)) : '',
      endTime: o.endTime ? normalizeToTimeInput(String(o.endTime)) : '',
      notes: o.notes ?? '',
      tableBreakdown: Array.isArray(o.tableBreakdown) ? o.tableBreakdown : [],
    };
  }
  const d = parsed.data;
  return {
    guestName: (d.guestName as string) ?? o.guestName ?? '',
    guestCount: d.guestCount != null ? String(d.guestCount) : o.guestCount != null ? String(o.guestCount) : '',
    startTime: d.startTime != null && String(d.startTime) !== '' ? normalizeToTimeInput(String(d.startTime)) : o.startTime ? normalizeToTimeInput(String(o.startTime)) : '',
    endTime: d.endTime != null && String(d.endTime) !== '' ? normalizeToTimeInput(String(d.endTime)) : o.endTime ? normalizeToTimeInput(String(o.endTime)) : '',
    notes: (d.notes as string) ?? o.notes ?? '',
    tableBreakdown: Array.isArray(d.tableBreakdown) ? d.tableBreakdown : Array.isArray(o.tableBreakdown) ? o.tableBreakdown : [],
  };
}

function clampBreakfast(
  o: { dayId: string } & Partial<CreateBreakfastFormData>
): {
  groupName: string;
  guestCount: string;
  startTime: string;
  notes: string;
  tableBreakdown: number[];
} {
  const parsed = createBreakfastSchema
    .partial()
    .extend({ dayId: z.string().uuid() })
    .safeParse(o);
  if (!parsed.success) {
    return {
      groupName: o.groupName ?? '',
      guestCount: o.guestCount != null ? String(o.guestCount) : '',
      startTime: o.startTime ? normalizeToTimeInput(String(o.startTime)) : '',
      notes: o.notes ?? '',
      tableBreakdown: Array.isArray(o.tableBreakdown) ? o.tableBreakdown : [],
    };
  }
  const d = parsed.data;
  return {
    groupName: (d.groupName as string) ?? o.groupName ?? '',
    guestCount: d.guestCount != null ? String(d.guestCount) : o.guestCount != null ? String(o.guestCount) : '',
    startTime: d.startTime != null && String(d.startTime) !== '' ? normalizeToTimeInput(String(d.startTime)) : o.startTime ? normalizeToTimeInput(String(o.startTime)) : '',
    notes: (d.notes as string) ?? o.notes ?? '',
    tableBreakdown: Array.isArray(d.tableBreakdown) ? d.tableBreakdown : Array.isArray(o.tableBreakdown) ? o.tableBreakdown : [],
  };
}

function nu<T>(v: T | null | undefined): T | undefined {
  return v ?? undefined;
}

function buildDataFromLlm(
  out: z.infer<typeof quickAddLlmSchema>,
  dayId: string,
  contextDate: string
): QuickAddParseData {
  if (out.kind === 'activity') {
    const a = mapAllergenHints(nu(out.fields.allergenHints));
    const n = appendUnmappedToNotes(out.fields.notes ?? '', a.unmapped);
    const strip = out.dateAmbiguous;
    const st = strip ? undefined : out.fields.startTime ? normalizeToTimeInput(out.fields.startTime) : undefined;
    const en = strip ? undefined : out.fields.endTime ? normalizeToTimeInput(out.fields.endTime) : undefined;
    const defaultsRaw = clampWithActivitySchema({
      dayId,
      title: nu(out.fields.title),
      description: nu(out.fields.description),
      startTime: st,
      endTime: en,
      expectedCovers: nu(out.fields.expectedCovers),
      notes: n.notes,
      allergens: a.codes,
    });
    if (strip) {
      defaultsRaw.startTime = '';
      defaultsRaw.endTime = '';
    }
    return {
      kind: 'activity',
      dayId,
      contextDate,
      dateAmbiguous: out.dateAmbiguous,
      defaults: defaultsRaw,
      allergens: filterAllergenCodes(a.codes) as AllergenCode[],
      gapFieldKeys: computeGaps('activity', {
        title: defaultsRaw.title,
        startTime: defaultsRaw.startTime,
        expectedCovers: defaultsRaw.expectedCovers,
      }),
      modelFilledFieldKeys: modelKeysFromLlmFields(out.fields as unknown as Record<string, unknown>),
    };
  }
  if (out.kind === 'reservation') {
    const a = mapAllergenHints(nu(out.fields.allergenHints));
    const n = appendUnmappedToNotes(out.fields.notes ?? '', a.unmapped);
    const strip = out.dateAmbiguous;
    const merged = {
      dayId,
      guestName: nu(out.fields.guestName),
      guestCount: nu(out.fields.guestCount),
      startTime: strip
        ? undefined
        : out.fields.startTime
          ? normalizeToTimeInput(out.fields.startTime)
          : undefined,
      endTime: strip
        ? undefined
        : out.fields.endTime
          ? normalizeToTimeInput(out.fields.endTime)
          : undefined,
      notes: n.notes,
      tableBreakdown: nu(out.fields.tableBreakdown),
      allergens: a.codes,
    };
    const d = clampReservation(merged);
    if (strip) {
      d.startTime = '';
      d.endTime = '';
    }
    return {
      kind: 'reservation',
      dayId,
      contextDate,
      dateAmbiguous: out.dateAmbiguous,
      defaults: {
        guestName: d.guestName,
        guestCount: d.guestCount,
        startTime: d.startTime,
        endTime: d.endTime,
        notes: d.notes,
      },
      tableBreakdown: d.tableBreakdown,
      allergens: filterAllergenCodes(a.codes) as AllergenCode[],
      gapFieldKeys: computeGaps('reservation', {
        guestName: d.guestName,
        guestCount: d.guestCount,
        startTime: d.startTime,
      }),
      modelFilledFieldKeys: modelKeysFromLlmFields(out.fields as unknown as Record<string, unknown>),
    };
  }
  if (out.kind === 'breakfast') {
    const f = out.fields;
    const a = mapAllergenHints(nu(f.allergenHints));
    const n = appendUnmappedToNotes(f.notes ?? '', a.unmapped);
    const strip = out.dateAmbiguous;
    const merged: { dayId: string } & Partial<CreateBreakfastFormData> = {
      dayId,
      groupName: nu(f.groupName),
      guestCount: nu(f.guestCount),
      startTime: strip
        ? undefined
        : f.startTime
          ? normalizeToTimeInput(f.startTime)
          : undefined,
      notes: n.notes,
      tableBreakdown: nu(f.tableBreakdown),
      allergens: a.codes,
    };
    const d = clampBreakfast(merged);
    if (strip) {
      d.startTime = '';
    }
    return {
      kind: 'breakfast',
      dayId,
      contextDate,
      dateAmbiguous: out.dateAmbiguous,
      defaults: {
        groupName: d.groupName,
        guestCount: d.guestCount,
        startTime: d.startTime,
        notes: d.notes,
      },
      tableBreakdown: d.tableBreakdown,
      allergens: filterAllergenCodes(a.codes) as AllergenCode[],
      gapFieldKeys: computeGaps('breakfast', {
        groupName: d.groupName,
        guestCount: d.guestCount,
        startTime: d.startTime,
      }),
      modelFilledFieldKeys: modelKeysFromLlmFields(f as unknown as Record<string, unknown>),
    };
  }
  throw new Error('quick add: unhandled kind');
}

export type GenerateQuickAddError = { success: false; error: string };
export type GenerateQuickAddResult =
  | { success: true; data: QuickAddParseData; promptVersion: string }
  | GenerateQuickAddError;

export async function generateQuickAddParse(
  userText: string,
  dayId: string,
  contextDate: string
): Promise<GenerateQuickAddResult> {
  const t = userText.trim();
  if (t.length < 2) {
    return { success: false, error: 'Text too short.' };
  }

  if (!hasGatewayAuth()) {
    return {
      success: false,
      error: 'AI is not configured (set AI_GATEWAY_API_KEY or run `vercel env pull`).',
    };
  }

  const prompt = buildUserPrompt(t, dayId, contextDate);

  let out: z.infer<typeof quickAddLlmSchema>;
  try {
    const res = await generateObject({
      model: gateway(QUICK_ADD_MODEL_ID),
      schema: quickAddLlmSchema,
      system: QUICK_ADD_SYSTEM,
      prompt,
      maxOutputTokens: 2048,
    });
    out = res.object;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Generation failed.';
    console.error('[quick-add] generateObject failed:', e);
    const short = msg.length > 200 ? msg.slice(0, 200) : msg;
    return { success: false, error: `Quick add AI error: ${short}` };
  }

  const data = buildDataFromLlm(out, dayId, contextDate);
  return { success: true, data, promptVersion: PROMPT_VERSION };
}
