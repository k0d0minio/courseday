import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const protocol =
  process.env.NODE_ENV === 'production' ? 'https' : 'http';
export const rootDomain =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
const rootHost = rootDomain.split(':')[0];
const normalizedRootHost = rootHost.replace(/^www\./, '');
const isLocalhostLike =
  normalizedRootHost === 'localhost' ||
  normalizedRootHost === '127.0.0.1' ||
  normalizedRootHost === '::1';
export const sharedCookieDomain = isLocalhostLike
  ? undefined
  : `.${normalizedRootHost}`;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
