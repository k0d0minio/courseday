import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  authRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/lib/auth-email-redirect', () => ({
  buildAuthConfirmRedirectUrl: vi.fn().mockReturnValue('https://example.com/auth/confirm'),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import {
  sendPasswordResetEmail,
  sendSignInMagicLink,
  signIn,
  signOut,
} from '@/app/actions/auth';

function makeAuthClient(signInResult: { error: { message: string } | null }) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: signInResult.error }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

// ── signIn ────────────────────────────────────────────────────────────────────

describe('signIn', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when credentials are invalid', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeAuthClient({ error: { message: 'Invalid login credentials' } }) as never
    );

    const formData = new FormData();
    formData.set('email', 'wrong@example.com');
    formData.set('password', 'badpassword');

    const result = await signIn(null, formData);
    expect(result).toEqual({
      error: 'Invalid credentials. If account is new, complete email confirmation first.',
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns clear error when email is not confirmed', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeAuthClient({ error: { message: 'Email not confirmed' } }) as never
    );

    const formData = new FormData();
    formData.set('email', 'new@example.com');
    formData.set('password', 'somepass');

    const result = await signIn(null, formData);
    expect(result).toEqual({
      error: 'Email not confirmed yet. Check inbox and click confirmation link, then sign in.',
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to / on successful sign-in (no redirectTo)', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeAuthClient({ error: null }) as never
    );

    const formData = new FormData();
    formData.set('email', 'user@example.com');
    formData.set('password', 'correct');

    await signIn(null, formData);
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('redirects to the given redirectTo path after sign-in', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeAuthClient({ error: null }) as never
    );

    const formData = new FormData();
    formData.set('email', 'user@example.com');
    formData.set('password', 'correct');
    formData.set('redirectTo', '/day/2024-06-15');

    await signIn(null, formData);
    expect(redirect).toHaveBeenCalledWith('/day/2024-06-15');
  });
});

// ── signOut ───────────────────────────────────────────────────────────────────

describe('signOut', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls signOut on the Supabase client and redirects to sign-in', async () => {
    const client = makeAuthClient({ error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never);

    await signOut();

    expect(client.auth.signOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/auth/sign-in');
  });
});

describe('sendSignInMagicLink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a magic link without creating users', async () => {
    const client = makeAuthClient({ error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never);

    const formData = new FormData();
    formData.set('email', 'user@example.com');
    formData.set('slug', 'venue-slug');

    const result = await sendSignInMagicLink(null, formData);
    expect(result).toEqual({ success: 'Check your email for a sign-in link.' });
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://example.com/auth/confirm',
      },
    });
  });
});

describe('sendPasswordResetEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends reset-password email with redirect URL', async () => {
    const client = makeAuthClient({ error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never);

    const formData = new FormData();
    formData.set('email', 'user@example.com');
    formData.set('slug', 'venue-slug');

    const result = await sendPasswordResetEmail(null, formData);
    expect(result).toEqual({
      success: 'If an account exists for that email, we sent a reset link.',
    });
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      { redirectTo: 'https://example.com/auth/confirm' }
    );
  });
});
