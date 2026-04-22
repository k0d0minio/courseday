import type { User } from '@supabase/supabase-js';
import type { Role } from '@/lib/membership';
import type { SuperadminRole } from '@/lib/superadmin-impersonation';

export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type AuthState = {
  user: User | null;
  role: Role | null;
  isEditor: boolean;
  /** Set when superadmin uses role preview cookie for this tenant. */
  impersonationRole: SuperadminRole | null;
};
