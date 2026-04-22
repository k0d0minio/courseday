/** True when the user is likely typing in a control; day hotkeys should not fire. */
export function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Element)) return false;
  const node = el.closest(
    'input, textarea, select, [contenteditable="true"], [contenteditable=""]'
  );
  if (node) {
    if (node instanceof HTMLInputElement) {
      const type = node.type;
      if (
        type === 'button' ||
        type === 'submit' ||
        type === 'reset' ||
        type === 'image' ||
        type === 'checkbox' ||
        type === 'radio' ||
        type === 'file'
      ) {
        return false;
      }
    }
    return true;
  }
  const role = el instanceof Element ? el.closest('[role="combobox"]') : null;
  return !!role;
}
