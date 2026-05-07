import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('@/lib/redis', () => ({
  getRedisClient: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T>(fn: T) => fn,
}))
