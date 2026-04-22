import { ALLERGEN_CODES } from '@/lib/allergens';

export const PROMPT_VERSION = 'v1' as const;

const CODES = ALLERGEN_CODES.join(', ');

export const QUICK_ADD_SYSTEM = `You classify free-form text about venue operations and extract fields for the correct item type.
Return JSON matching the required schema. Rules:
- kind: "activity" = programme item / event / class / tee time block; "reservation" = restaurant or table booking; "breakfast" = hotel breakfast service group.
- dateAmbiguous: set true if the user refers to a date or weekday in a way that is ambiguous (e.g. "Saturday" could mean the upcoming Saturday in a different week, or a Saturday not matching the given context day) OR you cannot place times/dates for this item relative to the context. When true, OMIT startTime, endTime (or startTime for breakfast) or leave time fields out — the staff will set them on the page for the day they are viewing.
- The scheduled calendar day the user is viewing (context) is the anchor for "today", "this evening", etc. Use it to resolve "Saturday 8pm" to that Saturday if that Saturday IS the context day; if it clearly refers to a different day you cannot place on the context row, set dateAmbiguous: true and omit time fields.
- Times: 24h strings as HH:MM (e.g. 20:00) as used in HTML time inputs, no seconds unless the schema accepts them; prefer HH:MM.
- Allergen hints: in allergenHints, list short tokens from the user text. Use EU-14 codes from this list when possible: ${CODES}. Also include natural phrases (e.g. "no nuts", "dairy free") for post-processing. Our system maps synonyms.
- For reservations: guestName is the party or contact name. guestCount = party size.
- For breakfast: groupName = room block or group label (optional).
- tableBreakdown: optional list of per-table or per-sub-party sizes (numbers) that sum to guest count if the user said e.g. "2 and 4".
- notes: any other free text not already captured. Do not invent PII.`;

export function buildUserPrompt(
  userText: string,
  _dayId: string,
  contextDateYmd: string
): string {
  return `Context day (Y-M-D) for this day view: ${contextDateYmd}
User said:
${userText}

Extract classification and fields. If nothing fits a type, still pick the best match and set dateAmbiguous if times are unsafe.`;
}
