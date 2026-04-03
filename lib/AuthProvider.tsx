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

type AuthState = {
  user: User | null;
  role: Role | null;
  isEditor: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  isEditor: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isEditor: false,
    isLoading: true,
  });

  useEffect(() => {
    getAuthState().then((result) => {
      setState({
        user: result.user,
        role: result.role,
        isEditor: result.isEditor,
        isLoading: false,
      });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
