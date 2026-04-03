import { extractSubdomain } from '@/lib/subdomain';

const ROOT = 'example.com';

describe('extractSubdomain', () => {
  describe('local development', () => {
    it('extracts subdomain from tenant.localhost', () => {
      expect(extractSubdomain('pierpont.localhost', 'localhost:3000')).toBe('pierpont');
    });

    it('returns null for bare localhost', () => {
      expect(extractSubdomain('localhost', 'localhost:3000')).toBeNull();
    });

    it('strips port from root domain before comparing', () => {
      expect(extractSubdomain('club.localhost', 'localhost:3000')).toBe('club');
    });
  });

  describe('Vercel preview deployments', () => {
    it('extracts tenant from tenant---branch.vercel.app', () => {
      expect(extractSubdomain('pierpont---main.vercel.app', ROOT)).toBe('pierpont');
    });

    it('extracts tenant when branch name contains hyphens', () => {
      expect(extractSubdomain('pierpont---feature-auth.vercel.app', ROOT)).toBe('pierpont');
    });
  });

  describe('production', () => {
    it('extracts subdomain from tenant.example.com', () => {
      expect(extractSubdomain('pierpont.example.com', ROOT)).toBe('pierpont');
    });

    it('returns null for the root domain', () => {
      expect(extractSubdomain('example.com', ROOT)).toBeNull();
    });

    it('returns null for www', () => {
      expect(extractSubdomain('www.example.com', ROOT)).toBeNull();
    });

    it('strips port from hostname before comparing', () => {
      expect(extractSubdomain('pierpont.example.com:3000', ROOT)).toBe('pierpont');
    });

    it('returns null when hostname equals root domain with port', () => {
      expect(extractSubdomain('example.com:3000', 'example.com:3000')).toBeNull();
    });
  });
});
