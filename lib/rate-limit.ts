import { headers } from 'next/headers';
import { redis } from './redis';

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * Fixed-window rate limiter backed by ioredis.
 * On Redis failure, allows the request through (fail-open).
 */
async function checkLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean }> {
  const windowSlot = Math.floor(Date.now() / (windowSeconds * 1000));
  const redisKey = `rl:${key}:${windowSlot}`;

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return { success: count <= limit };
  } catch {
    // Redis unavailable — fail open so the app stays usable
    return { success: true };
  }
}

async function getClientIP(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown'
  );
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/**
 * Auth actions (sign-in, sign-up): 10 attempts per 15 minutes per IP.
 */
export async function authRateLimit(): Promise<{ success: boolean }> {
  const ip = await getClientIP();
  return checkLimit(`auth:${ip}`, 10, 900);
}

/**
 * Mutation actions (create/update/delete): 120 per minute per user.
 */
export async function mutationRateLimit(userId: string): Promise<{ success: boolean }> {
  return checkLimit(`mutation:${userId}`, 120, 60);
}

/** Daily brief regeneration: 5 per calendar day per tenant (UTC window from rate-limit slot). */
const DAILY_BRIEF_LIMIT = 5;
const DAILY_BRIEF_WINDOW_SEC = 86400;

export async function dailyBriefRateLimit(
  tenantId: string,
  dateIso: string
): Promise<{ success: boolean }> {
  return checkLimit(`daily-brief:${tenantId}:${dateIso}`, DAILY_BRIEF_LIMIT, DAILY_BRIEF_WINDOW_SEC);
}

/** LLM quick-add parse: 30 per minute per user (separate from mutation cap). */
const QUICK_ADD_LIMIT = 30;
const QUICK_ADD_WINDOW_SEC = 60;

export async function quickAddRateLimit(userId: string): Promise<{ success: boolean }> {
  return checkLimit(`quick-add:${userId}`, QUICK_ADD_LIMIT, QUICK_ADD_WINDOW_SEC);
}
