<script lang="ts">
  import { api } from '#lib/api.js';
  import { messageFor } from '#lib/errors.js';
  import { m } from '#lib/paraglide/messages.js';
  import { relative } from '#lib/format.js';
  import { LOCALE_NAMES, SUPPORTED, applyLocale, type Locale } from '#lib/locale.js';
  import { session } from '#lib/session.svelte.js';
  import * as webauthn from '#lib/webauthn.js';
  import type { Passkey } from '#lib/types.js';
  import Loading from '#lib/components/Loading.svelte';
  import Spinner from '#lib/components/Spinner.svelte';
  import { Alert } from '@savvagent/console-ui/ui/alert';
  import { Button } from '@savvagent/console-ui/ui/button';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '@savvagent/console-ui/ui/card';
  import { Field, FieldDescription, FieldLabel } from '@savvagent/console-ui/ui/field';
  import { Input } from '@savvagent/console-ui/ui/input';

  /**
   * The account: its passkeys, and its profile.
   *
   * **The second passkey is the recovery story**, so this page leads with it
   * rather than burying it. There is no email, so an account with one passkey
   * is one lost device away from needing an admin — and the owner of a
   * single-person org has no admin above them.
   */

  const id = $props.id();

  let keys = $state<Passkey[]>([]);
  let loading = $state(true);
  let error = $state<string | undefined>(undefined);
  let busy = $state<string | undefined>(undefined);

  let email = $state('');
  let name = $state('');
  let savingProfile = $state(false);
  let profileError = $state<string | undefined>(undefined);
  let profileSaved = $state(false);

  /**
   * Link this account to whatever identity an org's SSO ceremony resolves
   * to. The authenticated counterpart to the login page's "Sign in with
   * SSO" — `POST /api/me/sso/link/start`, then a redirect just like it,
   * never a session opened here directly.
   */
  let ssoBusy = $state(false);
  let ssoError = $state<string | undefined>(undefined);

  async function linkSso() {
    ssoBusy = true;
    ssoError = undefined;
    try {
      const started = await api.ssoLinkStart();
      window.location.assign(started.redirectUrl);
    } catch (e) {
      ssoError = messageFor(e, m.error_that_did_not_work());
    } finally {
      ssoBusy = false;
    }
  }

  /**
   * The language picker.
   *
   * `''` is "match my browser" — the account stores no choice and detection
   * stays in charge. It is a distinct option rather than the absence of one,
   * because going back to following the browser is a real thing to want after
   * having chosen Spanish once.
   *
   * The picker is the only way somebody whose machine is configured in English
   * but who reads Spanish gets a Spanish console.
   */
  let locale = $state<Locale | ''>('');
  let savingLocale = $state(false);
  let localeError = $state<string | undefined>(undefined);

  async function changeLanguage(next: Locale | '') {
    if (savingLocale) return;
    const previous = locale;
    // Set optimistically so the <select> — bound to `locale` — reflects the
    // pick immediately rather than snapping back to the old value for the
    // moment the request is in flight; a failure below restores `previous`.
    locale = next;
    savingLocale = true;
    localeError = undefined;
    try {
      // `null` clears the stored choice; `undefined` would mean "leave alone"
      // and is not what an explicit pick of "match my browser" means.
      await api.setProfile({ locale: next === '' ? null : next });
      // Only now. Applying optimistically would leave the console speaking a
      // language the account does not actually have if the server refused.
      applyLocale(next === '' ? undefined : next);
    } catch (e) {
      localeError = messageFor(e, m.settings_language_failed());
      locale = previous;
      savingLocale = false;
    }
  }

  $effect(() => {
    void load();
  });

  $effect(() => {
    const stored = session.me?.user.locale;
    locale = stored && (SUPPORTED as readonly string[]).includes(stored) ? (stored as Locale) : '';
  });

  $effect(() => {
    const me = session.me?.user;
    if (me) {
      email = me.email ?? '';
      name = me.name ?? '';
    }
  });

  async function load() {
    try {
      keys = await api.passkeys();
    } catch (e) {
      error = messageFor(e, m.error_could_not_load_passkeys());
    } finally {
      loading = false;
    }
  }

  async function addPasskey() {
    busy = 'add';
    error = undefined;
    try {
      const started = await api.addPasskeyStart();
      const credential = await webauthn.register(started.challenge as never);
      await api.addPasskeyFinish(started.ceremonyId, credential, m.settings_new_passkey_name());
      keys = await api.passkeys();
      await session.refresh();
      await acceptedCredentials();
    } catch (e) {
      error = messageFor(e, m.error_could_not_add_passkey());
    } finally {
      busy = undefined;
    }
  }

  async function act(id: string, fn: () => Promise<unknown>) {
    busy = id;
    error = undefined;
    try {
      await fn();
      keys = await api.passkeys();
      await session.refresh();
      await acceptedCredentials();
    } catch (e) {
      error = messageFor(e, m.error_that_did_not_work());
    } finally {
      busy = undefined;
    }
  }

  /**
   * Tell the vault which keys the server still has.
   *
   * Attached to every refresh of the list rather than to the remove button
   * alone: after an add or a rename it is a no-op the vault already agrees
   * with, and after a remove it is the only thing that stops the deleted key
   * being offered in the picker forever. One call site per outcome would be
   * one call site to forget.
   */
  async function acceptedCredentials() {
    if (session.me) await webauthn.signalAcceptedCredentials(session.me, keys);
  }

  async function saveProfile(event: SubmitEvent) {
    event.preventDefault();
    savingProfile = true;
    profileError = undefined;
    profileSaved = false;
    try {
      await api.setProfile({ email: email.trim(), name: name.trim() });
      await session.refresh();
      // The address just changed, so what a fresh registration would file this
      // account under changed with it. Nothing but a signal can move the name
      // on the keys already in somebody's vault.
      if (session.me) await webauthn.signalAccount(session.me);
      profileSaved = true;
    } catch (e) {
      profileError = messageFor(e, m.error_could_not_save());
    } finally {
      savingProfile = false;
    }
  }
</script>

<svelte:head><title>{m.settings_page_title()}</title></svelte:head>

<div class="space-y-5">
  <div>
    <h1 class="text-lg font-semibold">{m.settings_heading()}</h1>
    <p class="mt-0.5 text-sm text-muted-foreground">{m.settings_subtitle()}</p>
  </div>

  {#if error}<Alert variant="destructive">{error}</Alert>{/if}

  {#if keys.length === 1 && !loading}
    <Alert variant="warning">{m.settings_one_passkey_warning()}</Alert>
  {/if}

  <Card>
    <CardHeader class="border-b">
      <CardTitle><h2 class="text-sm font-semibold">{m.settings_passkeys_title()}</h2></CardTitle>
      <CardDescription>{m.settings_passkeys_description()}</CardDescription>
    </CardHeader>
    <CardContent>
      {#if loading}
        <Loading what={m.settings_loading_passkeys()} />
      {:else}
        <ul class="divide-y divide-border/50">
          {#each keys as key (key.id)}
            <li class="flex items-center gap-3 py-2.5">
              <div class="min-w-0 flex-1">
                <div class="text-sm text-foreground">
                  {key.nickname ?? m.settings_unnamed_passkey()}
                </div>
                <p class="text-xs text-muted-foreground">
                  {m.settings_passkey_added({ when: relative(key.createdAt) })}
                  {#if key.lastUsedAt}·
                    {m.settings_passkey_last_used({ when: relative(key.lastUsedAt) })}
                  {:else}·
                    {m.settings_passkey_never_used()}
                  {/if}
                </p>
              </div>

              <Button
                variant="outline"
                disabled={busy === `${key.id}:rename`}
                onclick={() => {
                  const nickname = prompt(m.settings_rename_prompt(), key.nickname ?? '');
                  if (nickname) act(`${key.id}:rename`, () => api.renamePasskey(key.id, nickname));
                }}
              >
                {#if busy === `${key.id}:rename`}<Spinner />{/if}
                {m.settings_rename()}
              </Button>

              <!-- The server refuses to remove the last one; hiding the button
                 too means a person is not offered a click that would lock them
                 out and then be told no. -->
              {#if keys.length > 1}
                <Button
                  variant="destructive"
                  disabled={busy === `${key.id}:remove`}
                  onclick={() => act(`${key.id}:remove`, () => api.removePasskey(key.id))}
                >
                  {#if busy === `${key.id}:remove`}<Spinner />{/if}
                  {m.settings_remove()}
                </Button>
              {/if}
            </li>
          {/each}
        </ul>

        <div class="mt-4 border-t border-border/50 pt-3">
          <Button disabled={busy === 'add'} onclick={addPasskey}>
            {#if busy === 'add'}<Spinner />{/if}
            {m.settings_add_passkey()}
          </Button>
        </div>
      {/if}
    </CardContent>
  </Card>

  <Card>
    <CardHeader class="border-b">
      <CardTitle><h2 class="text-sm font-semibold">{m.settings_activity_title()}</h2></CardTitle>
      <CardDescription>{m.settings_activity_description()}</CardDescription>
    </CardHeader>
    <CardContent>
      <a
        class="text-sm text-muted-foreground underline hover:text-foreground"
        href="/settings/activity">{m.settings_activity_link()}</a
      >
    </CardContent>
  </Card>

  <Card>
    <CardHeader class="border-b">
      <CardTitle><h2 class="text-sm font-semibold">{m.settings_sso_title()}</h2></CardTitle>
      <CardDescription>{m.settings_sso_description()}</CardDescription>
    </CardHeader>
    <CardContent>
      {#if ssoError}<div class="mb-3"><Alert variant="destructive">{ssoError}</Alert></div>{/if}
      <Button disabled={ssoBusy} onclick={linkSso}>
        {#if ssoBusy}<Spinner />{/if}
        {m.settings_sso_link_button()}
      </Button>
    </CardContent>
  </Card>

  <Card>
    <CardHeader class="border-b">
      <CardTitle><h2 class="text-sm font-semibold">{m.settings_profile_title()}</h2></CardTitle>
      <CardDescription>{m.settings_profile_description()}</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="max-w-sm space-y-4" onsubmit={saveProfile}>
        <Field>
          <FieldLabel for="{id}-email">{m.settings_email_label()}</FieldLabel>
          <Input
            id="{id}-email"
            aria-describedby="{id}-email-hint"
            type="email"
            autocomplete="username"
            required
            bind:value={email}
          />
          <FieldDescription id="{id}-email-hint">{m.settings_email_hint()}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel for="{id}-name">{m.settings_name_label()}</FieldLabel>
          <Input id="{id}-name" type="text" autocomplete="name" bind:value={name} />
        </Field>

        {#if profileError}<Alert variant="destructive">{profileError}</Alert>{/if}
        {#if profileSaved}<Alert variant="success">{m.settings_saved()}</Alert>{/if}

        <Button type="submit" disabled={savingProfile}>
          {#if savingProfile}<Spinner />{/if}
          {m.settings_save()}
        </Button>
      </form>
    </CardContent>
  </Card>

  <Card>
    <CardHeader class="border-b">
      <CardTitle><h2 class="text-sm font-semibold">{m.settings_language_title()}</h2></CardTitle>
      <CardDescription>{m.settings_language_description()}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="max-w-sm space-y-2">
        <label class="block">
          <span class="sr-only">{m.settings_language_title()}</span>
          <!--
          Every language names itself. Somebody who cannot read the language the
          console is currently in has to be able to find their own in this list,
          which they cannot do if the options say "German" rather than "Deutsch".
        -->
          <select
            class="sav-select w-full"
            value={locale}
            disabled={savingLocale}
            onchange={(e) => changeLanguage(e.currentTarget.value as Locale | '')}
          >
            <option value="">{m.settings_language_match_browser()}</option>
            {#each SUPPORTED as option (option)}
              <option value={option}>{LOCALE_NAMES[option]}</option>
            {/each}
          </select>
        </label>

        {#if localeError}<Alert variant="destructive">{localeError}</Alert>{/if}
        <p class="text-xs text-muted-foreground">{m.settings_language_reload_note()}</p>
      </div>
    </CardContent>
  </Card>
</div>
