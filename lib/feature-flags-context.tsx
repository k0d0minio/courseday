'use client';

import { createContext, useContext } from 'react';
import type { FlagKey, FlagMap } from '@/lib/feature-flags';
import { KNOWN_FLAGS } from '@/lib/feature-flags';

const defaultFlags: FlagMap = Object.fromEntries(
  KNOWN_FLAGS.map((k) => [k, true])
) as FlagMap;

const FeatureFlagContext = createContext<FlagMap>(defaultFlags);

export function FeatureFlagProvider({
  flags,
  children,
}: {
  flags: FlagMap;
  children: React.ReactNode;
}) {
  const merged: FlagMap = { ...defaultFlags, ...flags };
  return (
    <FeatureFlagContext.Provider value={merged}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(key: FlagKey): boolean {
  const flags = useContext(FeatureFlagContext);
  return flags[key] ?? true;
}
