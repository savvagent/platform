<script lang="ts">
  import { goto } from '$app/navigation';

  import { api } from '#lib/api.js';
  import { messageFor } from '#lib/errors.js';
  import { m } from '#lib/paraglide/messages.js';
  import { session } from '#lib/session.svelte.js';
  import { slugPreview } from '#lib/format.js';
  import Spinner from '#lib/components/Spinner.svelte';
  import { Alert } from '@savvagent/console-ui/ui/alert';
  import { Button } from '@savvagent/console-ui/ui/button';
  import { Field, FieldDescription, FieldLabel } from '@savvagent/console-ui/ui/field';
  import { Input } from '@savvagent/console-ui/ui/input';

  /**
   * Create an organization. The creator becomes its owner — an org with no
   * owner cannot be administered at all.
   *
   * A slug is a public identifier and is refused to an unverified address, so
   * the `403` case here is worth naming rather than dropping into the generic
   * error box: the reader has an action to take (confirm your email), and the
   * server's message says so.
   */

  const id = $props.id();

  let name = $state('');
  let slug = $state('');
  let touchedSlug = $state(false);
  let pending = $state(false);
  let error = $state<string | undefined>(undefined);

  // Suggested from the name until the user edits it themselves, and then left
  // alone — a slug that keeps re-deriving under a typing hand is unusable.
  const suggested = $derived(touchedSlug ? slug : slugPreview(name));

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    pending = true;
    error = undefined;
    try {
      const org = await api.createOrg(suggested, name.trim() || suggested);
      await session.refresh();
      session.lastOrg = org.slug;
      await goto(`/o/${org.slug}`, { replace: true });
    } catch (e) {
      error = messageFor(e, m.orgnew_error_fallback());
    } finally {
      pending = false;
    }
  }
</script>

<svelte:head><title>{m.orgnew_page_title()}</title></svelte:head>

<div class="mx-auto max-w-sm py-8">
  <h1 class="text-lg font-semibold">{m.orgnew_heading()}</h1>
  <p class="mt-1 text-sm text-muted-foreground">
    {#if session.orgs.length === 0}
      {m.orgnew_intro_first()}
    {:else}
      {m.orgnew_intro_owner()}
    {/if}
  </p>

  <form class="mt-6 space-y-4" onsubmit={submit}>
    <Field>
      <FieldLabel for="{id}-name">{m.orgnew_name_label()}</FieldLabel>
      <Input id="{id}-name" type="text" required bind:value={name} />
    </Field>

    <Field>
      <FieldLabel for="{id}-slug">{m.orgnew_slug_label()}</FieldLabel>
      <Input
        id="{id}-slug"
        aria-describedby="{id}-slug-hint"
        class="sav-mono"
        type="text"
        value={suggested}
        oninput={(event) => {
          touchedSlug = true;
          slug = event.currentTarget.value;
        }}
        required
      />
      <FieldDescription id="{id}-slug-hint">{m.orgnew_slug_hint()}</FieldDescription>
    </Field>

    {#if error}<Alert variant="destructive">{error}</Alert>{/if}

    <Button type="submit" disabled={pending || !suggested}>
      {#if pending}<Spinner />{/if}
      {m.orgnew_submit()}
    </Button>
  </form>
</div>
