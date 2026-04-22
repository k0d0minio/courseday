import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tenant-validation', () => ({
  isValidSlug: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/auth-email-redirect', () => ({
  buildAuthConfirmRedirectUrl: vi.fn().mockReturnValue('https://example.com/auth/confirm'),
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
}));

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
}));

import { createCourse } from '@/app/actions/courses';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server';

function makeServiceClient() {
  const membershipsInsert = vi.fn().mockResolvedValue({ error: null });
  const tenantSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: 'tenant-1', name: 'Demo', slug: 'demo' }, error: null });
  const tenantInsertSelect = vi.fn().mockReturnValue({ single: tenantSingle });
  const tenantInsert = vi.fn().mockReturnValue({ select: tenantInsertSelect });
  const tenantMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const tenantEq = vi.fn().mockReturnValue({ maybeSingle: tenantMaybeSingle });
  const tenantSelect = vi.fn().mockReturnValue({ eq: tenantEq });

  const from = vi.fn((table: string) => {
    if (table === 'tenants') {
      return {
        select: tenantSelect,
        insert: tenantInsert,
      };
    }
    if (table === 'memberships') {
      return {
        insert: membershipsInsert,
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { from, membershipsInsert };
}

describe('createCourse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns clear error when signup is repeated', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: {
        user: { id: 'obfuscated-user', identities: [] },
        session: null,
      },
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signUp },
    } as never);
    vi.mocked(createSupabaseServiceClient).mockReturnValue(makeServiceClient() as never);

    const result = await createCourse({
      email: 'user@example.com',
      password: 'correct-password',
      name: 'Demo',
      slug: 'demo',
    });

    expect(result).toEqual({
      success: false,
      error:
        'Email already registered. Sign in to existing account. If email is unconfirmed, open confirmation email first.',
    });
  });

  it('creates new course for new user signup', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: {
        user: { id: 'new-user', identities: [{ id: 'identity-1' }] },
        session: null,
      },
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signUp },
    } as never);
    vi.mocked(createSupabaseServiceClient).mockReturnValue(makeServiceClient() as never);

    const result = await createCourse({
      email: 'user@example.com',
      password: 'wrong-password',
      name: 'Demo',
      slug: 'demo',
    });

    expect(result).toEqual({
      success: true,
      data: { slug: 'demo', requiresConfirmation: true },
    });
  });
});
