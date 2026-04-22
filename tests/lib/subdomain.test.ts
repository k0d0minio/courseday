import { describe, it, expect } from 'vitest';
import { extractSubdomain } from '@/lib/subdomain';

describe('extractSubdomain', () => {
  it('extracts tenant from normal root domain', () => {
    expect(extractSubdomain('oak.courseday.com', 'courseday.com')).toBe('oak');
  });

  it('extracts tenant when root domain includes www', () => {
    expect(extractSubdomain('oak.courseday.com', 'www.courseday.com')).toBe('oak');
  });

  it('treats root and www as platform domain', () => {
    expect(extractSubdomain('courseday.com', 'www.courseday.com')).toBeNull();
    expect(extractSubdomain('www.courseday.com', 'www.courseday.com')).toBeNull();
  });
});
