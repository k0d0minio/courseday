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
