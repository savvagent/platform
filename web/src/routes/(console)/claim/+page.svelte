<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  import { api } from '#lib/api.js';
  import { messageFor } from '#lib/errors.js';
  import { CONSOLE_HOME } from '#lib/next.js';
  import { m } from '#lib/paraglide/messages.js';
  import { session } from '#lib/session.svelte.js';
  import * as webauthn from '#lib/webauthn.js';
  import Spinner from '#lib/components/Spinner.svelte';
  import { Alert } from '@savvagent/console-ui/ui/alert';
  import { Button } from '@savvagent/console-ui/ui/button';
  import { Field, FieldLabel } from '@savvagent/console-ui/ui/field';
  import { Input } from '@savvagent/console-ui/ui/input';

  /**
   * Register a new passkey after an admin cleared this account's.
   *
   * The assisted half of recovery, and the reason it exists: an account with no
   * passkeys and no outstanding claim would be claimable by whoever reached
   * registration first. The code is what makes it re-registrable only by
   * whoever the admin handed it to.
   *
   * The code arrives in the URL when someone follows the link an admin sent
   * them, but **nothing is spent on load** — the server consumes it only at
   * `claim/finish`, so a link preview that fetches this page burns nothing, and
   * an abandoned ceremony leaves the code still usable.
   */

  let code = $state(page.url.searchParams.get('code') ?? '');
  const id = $props.id();

  let pending = $state(false);
  let error = $state<string | undefined>(undefined);

  async function claim(event: SubmitEvent) {
    event.preventDefault();
    pending = true;
    error = undefined;
    try {
      const started = await api.claimStart(code.trim());
      const credential = await webauthn.register(started.challenge as never);
      await api.claimFinish(started.ceremonyId, code.trim(), credential, m.claim_device_name());
      await session.refresh();
      // The account's name reaches the vault by the same route on every
      // ceremony. Nothing here is a special case, and that is the point: a
      // signal attached to two of the three registration paths is the one that
      // gets forgotten when a fourth is added.
      if (session.me) await webauthn.signalAccount(session.me);
      await goto(CONSOLE_HOME, { replace: true });
    } catch (e) {
      error = messageFor(e, m.claim_error_fallback());
    } finally {
      pending = false;
    }
  }
</script>

<svelte:head><title>{m.claim_page_title()}</title></svelte:head>

<div class="mx-auto max-w-sm py-8">
  <h1 class="text-lg font-semibold">{m.claim_heading()}</h1>
  <p class="mt-1 text-sm text-muted-foreground">{m.claim_intro()}</p>

  <form class="mt-6 space-y-4" onsubmit={claim}>
    <Field>
      <FieldLabel for="{id}-code">{m.claim_code_label()}</FieldLabel>
      <Input
        id="{id}-code"
        class="sav-mono"
        type="text"
        autocapitalize="off"
        spellcheck="false"
        required
        bind:value={code}
      />
    </Field>

    {#if error}<Alert variant="destructive">{error}</Alert>{/if}

    <Button type="submit" disabled={pending}>
      {#if pending}<Spinner />{/if}
      {m.claim_submit()}
    </Button>
  </form>

  <p class="mt-6 text-xs text-muted-foreground">
    <a class="text-muted-foreground underline hover:text-foreground" href="/login"
      >{m.claim_back_to_sign_in()}</a
    >
  </p>
</div>
