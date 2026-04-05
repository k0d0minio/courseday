import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

/**
 * Returns true if the currently authenticated user has a row in superadmins.
 * Uses the service client so it works regardless of RLS policies.
 */
export async function getSuperadminStatus(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient
    .from('superadmins')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  return !!data;
}

/**
 * Redirects to /auth/sign-in unless the current user is a superadmin.
 * Call at the top of any platform admin page.tsx.
 */
export async function requireSuperadmin(): Promise<void> {
  const ok = await getSuperadminStatus();
  if (!ok) redirect('/auth/sign-in');
}
