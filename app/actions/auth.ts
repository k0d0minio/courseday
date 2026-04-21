'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';
import { protocol, rootDomain } from '@/lib/utils';
import { authRateLimit } from '@/lib/rate-limit';

export async function signIn(_prevState: unknown, formData: FormData) {
  const rl = await authRateLimit();
  if (!rl.success) return { error: 'Too many attempts. Please wait and try again.' };

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirectTo') as string) || '/';

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/auth/sign-in');
}

export async function getUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect('/auth/sign-in');
  }
  return user;
}

/**
 * Returns the current user + their role for the active tenant.
 * Safe to call from client components via useEffect — returns null values
 * rather than throwing when outside tenant context.
 */
/**
 * Platform-level sign in. After authentication, looks up the user's tenant
 * and redirects to their course subdomain.
 */
export async function platformSignIn(_prevState: unknown, formData: FormData) {
  const rl = await authRateLimit();
  if (!rl.success) return { error: 'Too many attempts. Please wait and try again.' };

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  // Look up the user's tenant via service client (bypasses RLS timing issues)
  const serviceClient = createSupabaseServiceClient();
  const { data: membership } = await serviceClient
    .from('memberships')
    .select('tenants(slug)')
    .eq('user_id', data.user.id)
    .maybeSingle();

  const slug = (membership?.tenants as unknown as { slug: string } | null)?.slug;
  if (!slug) return { error: 'No course found for this account.' };

  redirect(`${protocol}://${slug}.${rootDomain}/`);
}

export async function getAuthState() {
  const user = await getUser();
  if (!user) return { user: null, role: null, isEditor: false };

  const tenantId = await getTenantId().catch(() => null);
  if (!tenantId) return { user, role: null, isEditor: false };

  const role = await getUserRole(tenantId);
  return { user, role, isEditor: role === 'editor' };
}
