<script lang="ts">
  import { cn } from '@savvagent/console-ui';

  /** A busy indicator for inside a button or a status line. Decorative: the text beside it says what is happening. */
  let { class: className }: { class?: string } = $props();
</script>

<span
  class={cn(
    'size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent',
    className
  )}
  aria-hidden="true"
></span>
