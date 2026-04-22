'use client';

export function isMacOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

/** Label for primary modifier in shortcuts UI (⌘ vs Ctrl). */
export function modKeyLabel(): string {
  return isMacOS() ? '⌘' : 'Ctrl';
}
