'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { getAuthState } from '@/app/actions/auth';
import type { Role } from '@/lib/membership';
import type { SuperadminRole } from '@/lib/superadmin-impersonation';

type AuthState = {
  user: User | null;
  role: Role | null;
  isEditor: boolean;
  impersonationRole: SuperadminRole | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  isEditor: false,
  impersonationRole: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isEditor: false,
    impersonationRole: null,
    isLoading: true,
  });

  useEffect(() => {
    getAuthState().then((result) => {
      setState({
        user: result.user,
        role: result.role,
        isEditor: result.isEditor,
        impersonationRole: result.impersonationRole,
        isLoading: false,
      });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
