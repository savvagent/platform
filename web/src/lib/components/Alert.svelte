<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * How every failure reaches the user.
   *
   * `role="alert"` so a screen reader announces it without the user hunting for
   * what changed — an error that only exists visually is an error a blind user
   * has to guess at.
   */
  interface Props {
    tone?: 'error' | 'warn' | 'ok' | 'info';
    children: Snippet;
  }

  let { tone = 'error', children }: Props = $props();

  const tones = {
    error: 'border-destructive/50 bg-destructive/10 text-destructive',
    warn: 'border-warning/50 bg-warning/10 text-warning',
    ok: 'border-success/50 bg-success/10 text-success',
    info: 'border-border bg-muted/50 text-muted-foreground'
  } as const;
</script>

<div
  role={tone === 'error' ? 'alert' : 'status'}
  class="rounded-md border px-3 py-2 text-sm {tones[tone]}"
>
  {@render children()}
</div>
