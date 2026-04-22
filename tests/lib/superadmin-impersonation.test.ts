import { describe, expect, it } from 'vitest';
import {
  buildSuperadminRoleCookie,
  parseSuperadminRoleCookie,
} from '@/lib/superadmin-impersonation';

describe('superadmin impersonation cookie', () => {
  it('builds and parses valid cookie values', () => {
    const value = buildSuperadminRoleCookie('user-1', 'tenant-1', 'editor');
    expect(parseSuperadminRoleCookie(value)).toEqual({
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'editor',
    });
  });

  it('returns null for malformed values', () => {
    expect(parseSuperadminRoleCookie(undefined)).toBeNull();
    expect(parseSuperadminRoleCookie('bad-value')).toBeNull();
    expect(parseSuperadminRoleCookie('u:t:owner')).toBeNull();
  });
});
