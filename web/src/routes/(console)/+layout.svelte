<script lang="ts">
  import { beforeNavigate, goto } from '$app/navigation';
  import { page } from '$app/state';
  import { ConsoleFooter, ConsoleHeader } from '@savvagent/console-ui';
  import { Alert } from '@savvagent/console-ui/ui/alert';
  import { Button } from '@savvagent/console-ui/ui/button';
  import type { Snippet } from 'svelte';

  import { api } from '#lib/api.js';
  import { toConsoleSession } from '#lib/console-session.js';
  import { shellOrigin, shellServices } from '#lib/shell.js';
  import { messageFor } from '#lib/errors.js';
  import { fullLoadGuard, gotoOrLoad } from '#lib/navigate.js';
  import { m } from '#lib/paraglide/messages.js';
  import { appRuntime, applyLocale, reconcile, resolveAtBoot, type Locale } from '#lib/locale.js';
  import { guard } from '#lib/routing.js';
  import { session } from '#lib/session.svelte.js';
  import { APP_VERSION } from '#lib/version.js';
  import Loading from '#lib/components/Loading.svelte';
  import Logo from '#lib/components/Logo.svelte';

  /**
   * Decide the language before anything renders.
   *
   * Top-level in this script rather than in `+layout.ts`, because `ssr = false`
   * makes this file browser-only while a universal load module is also
   * evaluated by the static build — where `document` and `localStorage` do not
   * exist. It runs once, synchronously, ahead of the first paint, so no page
   * ever renders English and then snaps to Spanish.
   */
  resolveAtBoot(appRuntime);

  /** The platform's origin for the shell; `shellOrigin` says why it is checked. */
  const origin = shellOrigin(location.origin);
  const services = shellServices(origin);

  let { children }: { children: Snippet } = $props();

  /** A failure resolving the session that is *not* "signed out". */
  let fatal = $state<string | undefined>(undefined);
  let signingOut = $state(false);
  /** A language pick the account refused to store. */
  let localeError = $state<string | undefined>(undefined);

  const releaseUrl = `https://github.com/savvagent/platform/releases/tag/v${APP_VERSION}`;

  /**
   * The session in the shell's shape. Derived, so one object is shared and
   * rebuilt only when `session.me` or the route's org changes.
   */
  const shellSession = $derived(
    session.me ? toConsoleSession(session.me, page.params.org, origin) : undefined
  );

  /**
   * Pages reachable without a session.
   *
   * Just the doors. `/signup` carries the whole account-creation flow now —
   * address, recovery codes, and authenticator enrollment in one visit — because
   * there is no email and so no second visit to come back from.
   *
   * `/invite/…` is deliberately *not* here: redeeming an invitation requires a
   * session whose address matches the one invited, so it sends the visitor to
   * sign in first. That check is what keeps a code that goes astray from being
   * a free seat.
   */
  const PUBLIC = ['/login', '/signup', '/claim'];

  const isPublic = $derived(PUBLIC.some((p) => page.url.pathname === p));

  $effect(() => {
    void resolve();
  });

  async function resolve() {
    if (session.ready) return;
    try {
      await session.refresh();
    } catch (error) {
      fatal = messageFor(error, m.error_session_resolve_failed());
    }
  }

  /**
   * Apply the account's stored language whenever the session resolves.
   *
   * **An effect over `session.me`, not a line inside `resolve()`.** `resolve()`
   * runs exactly once, on mount, and returns early forever after; every other
   * path that establishes a session — signing in, signing up, redeeming a
   * claim code or an invitation, and the settings page — calls
   * `session.refresh()` directly and would never reach it. Reading
   * `session.me` here makes this re-run for all of them.
   *
   * That is not a tidiness point: the case this whole mechanism exists for is
   * **the first sign-in on a new device**, where the cache is empty and the
   * browser's language differs from the account's. That is precisely the path
   * `resolve()` cannot see, because the session became ready while the visitor
   * was still signed out.
   *
   * `reconcile` no-ops unless the stored choice differs from what is rendering,
   * so running it on every change is free — and it reloads at most once when
   * they do differ, for the reason its own comment gives.
   */
  $effect(() => {
    reconcile(session.me?.user.locale);
  });

  /**
   * The routing guard, in one place.
   *
   * Written as an effect over `session.ready` and the current path rather than
   * as a check in each page: a page that forgets is a page that renders a
   * skeleton to a signed-out visitor and then flashes it away, and the
   * enrollment gate in particular has to hold everywhere at once — an account
   * with no confirmed authenticator can reach the API, so leaving one route
   * ungated would leave a usable console behind a half-finished login.
   */
  $effect(() => {
    // `signingOut` suppresses the guard for the moment between clearing the
    // session and arriving at `/login`. Without it the guard fires first, from
    // whatever org page the button was pressed on, and rewrites the destination
    // to `/login?next=/o/acme` — so someone who deliberately signed out is told
    // to "sign in to continue" and sent back where they left.
    if (!session.ready || fatal || signingOut) return;

    // No enrollment gate any more: a session only exists for an account that
    // already registered a passkey, because the passkey is what creates the
    // account. The rules themselves, and why, are in `#lib/routing.js`.
    const move = guard({
      signedIn: session.signedIn,
      needsProfile: session.me != null && session.me.user.email == null,
      isPublic,
      path: page.url.pathname + page.url.search,
      next: page.url.searchParams.get('next')
    });
    if (move?.kind === 'assign') location.assign(move.to);
    else if (move) void gotoOrLoad(move.to);
  });

  /**
   * Leaving for a marketing page, or arriving from one, is a full load.
   *
   * The shell's own links (a service's connect card, the footer's home link)
   * are rendered by the package and cannot carry `data-sveltekit-reload`, so
   * the crossing is caught here instead; `fullLoadGuard` says why it matters.
   */
  beforeNavigate(fullLoadGuard);

  /**
   * The header's language picker.
   *
   * Signed in, the pick is saved to the account first and applied only once
   * the server has it, as the settings page does: applied unsaved, `reconcile`
   * would put the stored language back on the next load. A refusal is shown
   * and rethrown, so the picker keeps its previous value and nothing reloads.
   */
  async function changeLocale(next: Locale) {
    if (session.signedIn) {
      localeError = undefined;
      try {
        await api.setProfile({ locale: next });
      } catch (error) {
        localeError = messageFor(error, m.settings_language_failed());
        throw error;
      }
    }
    applyLocale(next);
  }

  async function signOut() {
    signingOut = true;
    try {
      await api.logout();
    } finally {
      // Cleared even if the request failed. The server clears the cookie on
      // success and treats an unknown one as already gone, so the only way to
      // reach here with a live session is a network error — and leaving the
      // console looking signed in after someone pressed "sign out" is the worse
      // of the two wrong answers.
      session.clear();
      await goto('/login', { replace: true });
      signingOut = false;
    }
  }
</script>

<!--
  Every console page is behind a session, so none of it belongs in a search
  index. Emitted per page rather than in `app.html` because the same template
  now also renders the public marketing pages, which must be indexable. The
  fallback shell (`200.html`) is rendered before this layout mounts, so the
  server and the Worker add an `X-Robots-Tag` header to it instead.
-->
<svelte:head><meta name="robots" content="noindex, nofollow" /></svelte:head>

<div class="flex min-h-full flex-col">
  <ConsoleHeader
    session={shellSession}
    platformUrl={origin}
    {services}
    service="platform"
    onSignOut={signOut}
    onLocaleChange={changeLocale}
  >
    {#snippet brand()}
      <!-- Overridden for its target: inside the console the logo means "my
           org" (`/home`), while the package's default goes to `/`, the public
           marketing page. -->
      <a href="/home" class="flex items-center gap-2 px-2 text-sm font-semibold">
        <Logo class="size-5 text-primary" />
        <span>Savvagent</span>
      </a>
    {/snippet}
    {#snippet nav()}
      {#if session.signedIn}
        <Button
          href="/orgs/new"
          variant="ghost"
          size="sm"
          title={m.nav_create_org()}
          aria-label={m.nav_create_org()}>+</Button
        >
      {/if}
    {/snippet}
    {#snippet signedOut()}
      {#if session.ready}
        <Button href="/login" variant="ghost" size="sm">{m.nav_sign_in()}</Button>
      {/if}
    {/snippet}
  </ConsoleHeader>

  <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
    {#if localeError}
      <Alert variant="destructive" class="mb-4">{localeError}</Alert>
    {/if}
    {#if fatal}
      <Alert variant="destructive">
        {fatal}
        <button class="ml-2 underline" onclick={() => location.reload()}>{m.nav_try_again()}</button
        >
      </Alert>
    {:else if !session.ready}
      <Loading what={m.nav_checking_session()} />
    {:else}
      {@render children()}
    {/if}
  </main>

  <ConsoleFooter
    platformUrl={origin}
    links={[
      { label: m.nav_api_reference(), href: '/api/openapi.json' },
      { label: `v${APP_VERSION}`, href: releaseUrl }
    ]}
  />
</div>
