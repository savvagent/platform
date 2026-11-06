/**
 * Test helpers for the shared shell's header triggers (service, org and
 * language switchers, account menu).
 *
 * Since `@savvagent/console-ui@0.3.0` a trigger has no `aria-label`. Its
 * accessible name is its own text, the visible part and then a visually
 * hidden label ("English Language", "Acme Organization"), so the name starts
 * with what a sighted user sees (WCAG 2.5.3, label in name).
 */

/** The header trigger whose visually hidden label is `label`, or null. */
export function headerTrigger(root: ParentNode, label: string): HTMLButtonElement | null {
  return (
    Array.from(root.querySelectorAll<HTMLButtonElement>('header button')).find(
      (button) => button.querySelector('.sr-only')?.textContent?.trim() === label
    ) ?? null
  );
}

/** An element's text with whitespace collapsed: a trigger's accessible name. */
export function nameOf(el: Element | null): string | undefined {
  return el?.textContent?.replace(/\s+/g, ' ').trim();
}
