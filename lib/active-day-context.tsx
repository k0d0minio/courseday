'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ActiveDayContextValue = {
  /** Tenant calendar "today" from server (navigation lower bound). */
  tenantTodayYmd: string;
  activeDayYmd: string;
  setActiveDayYmd: (ymd: string) => void;
};

const ActiveDayContext = createContext<ActiveDayContextValue | null>(null);

export function ActiveDayProvider({
  tenantTodayYmd,
  children,
}: {
  tenantTodayYmd: string;
  children: ReactNode;
}) {
  const [activeDayYmd, setState] = useState(tenantTodayYmd);

  const setActiveDayYmd = useCallback((ymd: string) => {
    setState(ymd);
  }, []);

  const value = useMemo(
    () => ({ tenantTodayYmd, activeDayYmd, setActiveDayYmd }),
    [tenantTodayYmd, activeDayYmd, setActiveDayYmd]
  );

  return <ActiveDayContext.Provider value={value}>{children}</ActiveDayContext.Provider>;
}

export function useActiveDay(): ActiveDayContextValue {
  const ctx = useContext(ActiveDayContext);
  if (!ctx) {
    throw new Error('useActiveDay must be used within ActiveDayProvider');
  }
  return ctx;
}
