import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const pendingInviteState = vi.hoisted(() => ({
  row: null as { id: string; role: string } | null,
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/app/actions/auth', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/membership', () => ({
  getUserRole: vi.fn(),
}));

vi.mock('@/lib/tenant', () => ({
  getTenantFromHeaders: vi.fn().mockResolvedValue({ id: 'tenant-1', slug: 'test' }),
}));

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(() => ({
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: { email: 'test@example.com' } },
        }),
      },
    },
    from(table: string) {
      if (table === 'pending_invitations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: pendingInviteState.row }),
              }),
            }),
          }),
          delete: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'memberships') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    },
  })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { getUser } from '@/app/actions/auth';
import { getUserRole } from '@/lib/membership';
import { redirect, notFound } from 'next/navigation';
import { requireAuth, requireTenantMember, requireTenantEditor } from '@/lib/guards';

const MOCK_USER = { id: 'user-1', email: 'test@example.com' };

// ── requireAuth ───────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  it('calls redirect to sign-in when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('returns the user when authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(MOCK_USER as never);
    const user = await requireAuth();
    expect(user).toBe(MOCK_USER);
    expect(redirect).not.toHaveBeenCalled();
  });
});

// ── requireTenantMember ───────────────────────────────────────────────────────

describe('requireTenantMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pendingInviteState.row = null;
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('calls redirect to sign-in when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    await expect(requireTenantMember()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('calls notFound when user is not a member of the tenant', async () => {
    vi.mocked(getUser).mockResolvedValue(MOCK_USER as never);
    vi.mocked(getUserRole).mockResolvedValue(null);
    await expect(requireTenantMember()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('returns { user, role } for a viewer member', async () => {
    vi.mocked(getUser).mockResolvedValue(MOCK_USER as never);
    vi.mocked(getUserRole).mockResolvedValue('viewer');
    const result = await requireTenantMember();
    expect(result.user).toBe(MOCK_USER);
    expect(result.role).toBe('viewer');
    expect(redirect).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('returns { user, role } for an editor member', async () => {
    vi.mocked(getUser).mockResolvedValue(MOCK_USER as never);
    vi.mocked(getUserRole).mockResolvedValue('editor');
    const result = await requireTenantMember();
    expect(result.role).toBe('editor');
  });
});

// ── requireTenantEditor ───────────────────────────────────────────────────────

describe('requireTenantEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  it('calls redirect to / when user is a viewer', async () => {
    vi.mocked(getUser).mockResolvedValue(MOCK_USER as never);
    vi.mocked(getUserRole).mockResolvedValue('viewer');
    await expect(requireTenantEditor()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('returns { user, role: editor } for an editor', async () => {
    vi.mocked(getUser).mockResolvedValue(MOCK_USER as never);
    vi.mocked(getUserRole).mockResolvedValue('editor');
    const result = await requireTenantEditor();
    expect(result.role).toBe('editor');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('calls redirect to sign-in when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    await expect(requireTenantEditor()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/auth/sign-in');
  });
});
