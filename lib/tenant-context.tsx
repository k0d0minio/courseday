'use client'

import { createContext, useContext, type ReactNode } from 'react'

type TenantContextValue = {
  tenantId: string
  tenantSlug: string
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({
  tenantId,
  tenantSlug,
  children,
}: TenantContextValue & { children: ReactNode }) {
  return (
    <TenantContext.Provider value={{ tenantId, tenantSlug }}>{children}</TenantContext.Provider>
  )
}

/**
 * Returns the current tenant's ID and slug.
 * Must be used inside a component rendered within app/[tenant]/ routes.
 */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) {
    throw new Error('useTenant() must be used within a TenantProvider')
  }
  return ctx
}

/**
 * Returns just the tenant ID for client components that need it for queries.
 */
export function getTenantIdClient(): string {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useTenant().tenantId
}
