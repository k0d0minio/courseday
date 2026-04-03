'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';

export async function signIn(_prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect('/');
}

export async function signUp(_prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
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
export async function getAuthState() {
  const user = await getUser();
  if (!user) return { user: null, role: null, isEditor: false };

  const tenantId = await getTenantId().catch(() => null);
  if (!tenantId) return { user, role: null, isEditor: false };

  const role = await getUserRole(tenantId);
  return { user, role, isEditor: role === 'editor' };
}
