<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { consoleEntry, session } from '#lib/session.svelte.js';
  import LinkButton from '#lib/components/LinkButton.svelte';
  import type { ButtonSize, ButtonTone } from '#lib/components/button.js';

  /**
   * The way into the console from a marketing page: "Create account" for a
   * visitor, "Open console" for someone signed in.
   *
   * **Signed out in the file, signed in after hydration.** The prerendered
   * HTML is built once for everyone, so it can only ever say "Create
   * account"; the marketing layout resolves `session` after mount, and this
   * swaps the moment it does. A visitor whose session check fails keeps the
   * sign-up link, which still works. Where it goes is `consoleEntry`, the
   * one rule every such link shares.
   *
   * **Always `data-sveltekit-reload`.** The console is browser-only and must
   * boot from a full load — its `resolveAtBoot` runs, and nothing of the
   * marketing layout's locale override survives — and the console has one URL
   * per page whatever the language, so the link is never localized.
   *
   * **`named` says whose console it is.** On a product page it sits beside
   * "Open the {name} console", and two buttons that both say "Open console"
   * leave a person guessing which one goes where (#155), so there it reads
   * "Open Savvagent console". Elsewhere, where it is the only console in
   * sight, the short form is enough.
   */
  interface Props {
    tone?: ButtonTone;
    size?: ButtonSize;
    named?: boolean;
  }

  let { tone = 'primary', size = 'lg', named = false }: Props = $props();

  const entry = $derived(consoleEntry(session));
</script>

<LinkButton href={entry.href} {tone} {size} data-sveltekit-reload>
  {#if entry.kind === 'signup'}
    {m.marketing_create_account()}
  {:else if named}
    {m.marketing_open_savvagent_console()}
  {:else}
    {m.marketing_open_console()}
  {/if}
</LinkButton>
