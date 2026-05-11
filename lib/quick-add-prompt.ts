import { ALLERGEN_CODES } from '@/lib/allergens'

export const PROMPT_VERSION = 'v1' as const

const CODES = ALLERGEN_CODES.join(', ')

export const QUICK_ADD_SYSTEM = `You classify free-form text about venue operations and extract fields for the correct item type.
Return JSON matching the required schema. The schema wraps an "items" array — emit ONE item per distinct booking/event the user describes (always at least one). If the user pastes a list of bookings (e.g. five reservations in an email), emit one entry per booking. If the text describes a single item, emit an items array of length 1.
Rules:
- kind: "activity" = programme item / event / class / tee time block; "reservation" = restaurant or table booking; "breakfast" = hotel breakfast service group.
- Each item is classified independently — a single paste can mix kinds (e.g. a tee time, a dinner reservation, and a breakfast block).
- date: return a YYYY-MM-DD string ONLY when the user's text explicitly mentions a date (absolute like "26 June" or relative like "next Monday", "tonight", "today"). Otherwise return null. Do NOT default to the context day — null means the user did not specify a date and the form will ask them to fill it in.
- dateAmbiguous: set true (per item) if the user refers to a date or weekday in a way that is ambiguous (e.g. "Saturday" could mean the upcoming Saturday in a different week, or a Saturday not matching the given context day) OR you cannot place times/dates for this item relative to the context. When true, OMIT startTime, endTime (or startTime for breakfast) or leave time fields out — the staff will set them on the page for the day they are viewing.
- The scheduled calendar day the user is viewing (context) is the anchor for resolving relative phrases: "today" and "tonight" → context day, "next Monday" → next Monday from context. Use context to resolve the final YYYY-MM-DD for date. If no date phrase is present, return date: null.
- Times: 24h strings as HH:MM (e.g. 20:00) as used in HTML time inputs, no seconds unless the schema accepts them; prefer HH:MM.
- Allergen hints: in allergenHints, list short tokens from the user text. Use EU-14 codes from this list when possible: ${CODES}. Also include natural phrases (e.g. "no nuts", "dairy free") for post-processing. Our system maps synonyms.
- For reservations: guestName is the party or contact name. guestCount = party size.
- For breakfast: groupName = room block or group label (optional).
- tableBreakdown: optional list of per-table or per-sub-party sizes (numbers) that sum to guest count if the user said e.g. "2 and 4".
- notes: any other free text not already captured for that item. Do not invent PII.

Examples (illustrative; adapt to actual user text):
1) No date phrase, "tee time 9am" with context 2026-05-11 → items: [{ kind:"activity", dateAmbiguous:false, fields:{ date:null, title:"Tee time", startTime:"09:00", expectedCovers:null } }]
2) Relative date phrase, "tee time 9am next Monday" with context 2026-05-12 (Tuesday) → items: [{ kind:"activity", dateAmbiguous:false, fields:{ date:"2026-05-18", title:"Tee time", startTime:"09:00", expectedCovers:null } }]
3) "today"/"tonight" anchor, "tee time tonight 9pm" with context 2026-05-11 → items: [{ kind:"activity", dateAmbiguous:false, fields:{ date:"2026-05-11", title:"Tee time", startTime:"21:00", expectedCovers:null } }]
4) Absolute date, "tee time on 26 June" with context 2026-05-11 → items: [{ kind:"activity", dateAmbiguous:false, fields:{ date:"2026-06-26", title:"Tee time", startTime:null, expectedCovers:null } }]
5) Multi-reservation list with no date phrases:
   "- Smith party of 6 at 7:30pm
    - Lee, 2 guests, 8pm, no nuts"
   → items: [
       { kind:"reservation", dateAmbiguous:false, fields:{ date:null, guestName:"Smith", guestCount:6, startTime:"19:30" } },
       { kind:"reservation", dateAmbiguous:false, fields:{ date:null, guestName:"Lee", guestCount:2, startTime:"20:00", allergenHints:["no nuts"] } }
     ]`

export function buildUserPrompt(userText: string, _dayId: string, contextDateYmd: string): string {
  return `Context day (Y-M-D) for this day view: ${contextDateYmd}
User said:
${userText}

Extract classification and fields for every distinct item described — emit one entry per item in the "items" array (always length ≥ 1). If only one item is described, return a single-element array. Different items can have different kinds. If nothing fits a type, still pick the best match and set dateAmbiguous if times are unsafe.`
}
