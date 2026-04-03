import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

vi.mock('@/app/actions/auth', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { getUser } from '@/app/actions/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

function makeChain(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}

// ── Tests ────────────────────────────────────────────────────────────────────

import { getUserRole, isEditor, requireEditor } from '@/lib/membership';

describe('getUserRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect(await getUserRole('tenant-1')).toBeNull();
  });

  it('returns null when user has no membership', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain({ data: null }) as never
    );
    expect(await getUserRole('tenant-1')).toBeNull();
  });

  it('returns editor role', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain({ data: { role: 'editor' } }) as never
    );
    expect(await getUserRole('tenant-1')).toBe('editor');
  });

  it('returns viewer role', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain({ data: { role: 'viewer' } }) as never
    );
    expect(await getUserRole('tenant-1')).toBe('viewer');
  });
});

describe('isEditor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true for editor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain({ data: { role: 'editor' } }) as never
    );
    expect(await isEditor('tenant-1')).toBe(true);
  });

  it('returns false for viewer', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain({ data: { role: 'viewer' } }) as never
    );
    expect(await isEditor('tenant-1')).toBe(false);
  });

  it('returns false when not a member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain({ data: null }) as never
    );
    expect(await isEditor('tenant-1')).toBe(false);
  });
});

describe('requireEditor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to sign-in when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    await requireEditor('tenant-1');
    expect(redirect).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('redirects to / when viewer', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain({ data: { role: 'viewer' } }) as never
    );
    await requireEditor('tenant-1');
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('returns the user when editor', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' };
    vi.mocked(getUser).mockResolvedValue(mockUser as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain({ data: { role: 'editor' } }) as never
    );
    const user = await requireEditor('tenant-1');
    expect(user).toBe(mockUser);
    expect(redirect).not.toHaveBeenCalled();
  });
});
