import { describe, expect, it } from 'vitest';
import { isEditableTarget } from '@/lib/is-editable-target';

describe('isEditableTarget', () => {
  it('returns false for document body', () => {
    expect(isEditableTarget(document.body)).toBe(false);
  });

  it('returns true for text input', () => {
    const input = document.createElement('input');
    input.type = 'text';
    expect(isEditableTarget(input)).toBe(true);
  });

  it('returns false for button input', () => {
    const input = document.createElement('input');
    input.type = 'button';
    expect(isEditableTarget(input)).toBe(false);
  });

  it('returns true for textarea', () => {
    const ta = document.createElement('textarea');
    expect(isEditableTarget(ta)).toBe(true);
  });

  it('returns true inside contenteditable', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    const span = document.createElement('span');
    div.appendChild(span);
    expect(isEditableTarget(span)).toBe(true);
  });

  it('returns true for role=combobox', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'combobox');
    expect(isEditableTarget(el)).toBe(true);
  });
});
