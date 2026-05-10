import { ALLERGEN_CODES } from '@/lib/allergens'

export const PROMPT_VERSION = 'v1' as const

const CODES = ALLERGEN_CODES.join(', ')

export const QUICK_ADD_SYSTEM = `You classify free-form text about venue operations and extract fields for the correct item type.
Return JSON matching the required schema. The schema wraps an "items" array — emit ONE item per distinct booking/event the user describes (always at least one). If the user pastes a list of bookings (e.g. five reservations in an email), emit one entry per booking. If the text describes a single item, emit an items array of length 1.
Rules:
- kind: "activity" = programme item / event / class / tee time block; "reservation" = restaurant or table booking; "breakfast" = hotel breakfast service group.
- Each item is classified independently — a single paste can mix kinds (e.g. a tee time, a dinner reservation, and a breakfast block).
- dateAmbiguous: set true (per item) if the user refers to a date or weekday in a way that is ambiguous (e.g. "Saturday" could mean the upcoming Saturday in a different week, or a Saturday not matching the given context day) OR you cannot place times/dates for this item relative to the context. When true, OMIT startTime, endTime (or startTime for breakfast) or leave time fields out — the staff will set them on the page for the day they are viewing.
- The scheduled calendar day the user is viewing (context) is the anchor for "today", "this evening", etc. Use it to resolve "Saturday 8pm" to that Saturday if that Saturday IS the context day; if it clearly refers to a different day you cannot place on the context row, set dateAmbiguous: true and omit time fields.
- Times: 24h strings as HH:MM (e.g. 20:00) as used in HTML time inputs, no seconds unless the schema accepts them; prefer HH:MM.
- Allergen hints: in allergenHints, list short tokens from the user text. Use EU-14 codes from this list when possible: ${CODES}. Also include natural phrases (e.g. "no nuts", "dairy free") for post-processing. Our system maps synonyms.
- For reservations: guestName is the party or contact name. guestCount = party size.
- For breakfast: groupName = room block or group label (optional).
- tableBreakdown: optional list of per-table or per-sub-party sizes (numbers) that sum to guest count if the user said e.g. "2 and 4".
- notes: any other free text not already captured for that item. Do not invent PII.

Examples (illustrative; adapt to actual user text):
1) Single item, "Member golf 8am, 24 players" → items: [{ kind:"activity", fields:{ title:"Member golf", startTime:"08:00", expectedCovers:24 } }]
2) Multi-reservation list:
   "- Smith party of 6 at 7:30pm
    - Lee, 2 guests, 8pm, no nuts
    - Patel 4 at 8:15pm"
   → items: [
       { kind:"reservation", fields:{ guestName:"Smith", guestCount:6, startTime:"19:30" } },
       { kind:"reservation", fields:{ guestName:"Lee", guestCount:2, startTime:"20:00", allergenHints:["no nuts"] } },
       { kind:"reservation", fields:{ guestName:"Patel", guestCount:4, startTime:"20:15" } }
     ]
3) Mixed kinds in one paste:
   "Tee time 9am, 16 players. Breakfast for room block A, 30 guests at 7am. Reservation: Garcia, 4, 8pm."
   → items: [
       { kind:"activity", fields:{ title:"Tee time", startTime:"09:00", expectedCovers:16 } },
       { kind:"breakfast", fields:{ groupName:"Room block A", guestCount:30, startTime:"07:00" } },
       { kind:"reservation", fields:{ guestName:"Garcia", guestCount:4, startTime:"20:00" } }
     ]`

export function buildUserPrompt(userText: string, _dayId: string, contextDateYmd: string): string {
  return `Context day (Y-M-D) for this day view: ${contextDateYmd}
User said:
${userText}

Extract classification and fields for every distinct item described — emit one entry per item in the "items" array (always length ≥ 1). If only one item is described, return a single-element array. Different items can have different kinds. If nothing fits a type, still pick the best match and set dateAmbiguous if times are unsafe.`
}
