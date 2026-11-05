/**
 * What a button looks like, whether it is a `<button>` (`Button.svelte`) or
 * a link styled as one (`LinkButton.svelte`).
 *
 * One table, so a primary action on a marketing page and a primary action in
 * the console cannot drift apart, and a link that leads somewhere looks
 * exactly like a button that does something there.
 */

export type ButtonTone = 'primary' | 'quiet' | 'danger';

/**
 * `md` is the console's size. `sm` fits a header bar and never wraps (a
 * two-line button in a 360px bar pushes everything else out); `lg` is a
 * marketing call to action.
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

const TONES: Record<ButtonTone, string> = {
  primary: 'bg-primary text-primary-foreground hover:brightness-110',
  quiet: 'border border-border bg-muted/60 text-foreground hover:bg-muted',
  danger: 'border border-destructive/50 bg-transparent text-destructive hover:bg-destructive/10'
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 whitespace-nowrap',
  md: 'px-3 py-2',
  lg: 'px-5 py-2.5'
};

export function buttonClass(tone: ButtonTone = 'primary', size: ButtonSize = 'md'): string {
  return `inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition ${SIZES[size]} ${TONES[tone]}`;
}
