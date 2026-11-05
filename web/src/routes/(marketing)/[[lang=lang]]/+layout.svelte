<script lang="ts">
  import { onMount, untrack, type Snippet } from 'svelte';

  import { beforeNavigate } from '$app/navigation';
  import { page } from '$app/state';

  import {
    LOCALE_NAMES,
    appRuntime,
    detect,
    readCached,
    useLocale,
    type Locale
  } from '#lib/locale.js';
  import { shellOrigin } from '#lib/shell.js';
  import { fullLoadGuard } from '#lib/navigate.js';
  import { m } from '#lib/paraglide/messages.js';
  import { session } from '#lib/session.svelte.js';
  import { SITE_ORIGIN, localizedPath, stripLocale } from '#lib/site.js';
  import MarketingFooter from '#lib/components/marketing/MarketingFooter.svelte';
  import MarketingHeader from '#lib/components/marketing/MarketingHeader.svelte';

  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  /**
   * Every `m.*()` below this layout, and every string the shared shell
   * renders, speaks the URL's language.
   *
   * `useLocale` pins the locale of both Paraglide runtimes: this app's
   * (`appRuntime`) and `@savvagent/console-ui`'s own, which the header's
   * language picker and the footer's copyright read.
   *
   * Top-level, so it is in place before any child renders. The pinned locale
   * is a process-wide global, which is safe at build time because Svelte 5
   * renders a page synchronously from top to bottom: no other page's render
   * can start between this line and the last message call of this one, so
   * every message in this page reads this page's `lang`. That is also why no
   * `load` may call a message (see `+layout.ts`) — loads are async and can
   * interleave — and why Svelte's experimental async server rendering must
   * stay off (see `vite.config.ts`): with it, an `await` in one page's render
   * would let another page pin its own locale part-way through.
   *
   * In the browser a language change is a full document load: the picker
   * assigns the new URL, the app's own links that change it carry
   * `data-sveltekit-reload`, and the `beforeNavigate` guard below turns any
   * other one (the shell's unprefixed links) into a full load. So the pinned
   * value is always this page's, and `data.lang` is read once, untracked,
   * because no language change happens under a mounted layout.
   *
   * **This replaces the getter `resolveAtBoot` installed, and never puts it
   * back.** That is safe only because nothing crosses between the console and
   * these pages without a full document load: every console link here, and
   * every marketing link in the console, carries `data-sveltekit-reload`, and
   * the `beforeNavigate` guard below catches the shell's own links, so each
   * side boots with its own getter. A client-side hop from one to the other
   * would leave the console speaking this page's URL language (or these
   * pages the account's).
   */
  useLocale(
    untrack(() => data.lang),
    appRuntime
  );

  /**
   * The platform's origin, for the shared header and footer.
   *
   * The prerendered file can only name the production origin. A self-hosted
   * copy is repointed at its own origin once mounted; it has to be state set
   * in `onMount`, not a `browser ? … : …` expression, because Svelte keeps a
   * server-rendered `href` through hydration and the expression would never
   * be re-read.
   */
  let platformUrl = $state(SITE_ORIGIN);

  /**
   * Arriving at the console from here is a full load, as leaving it is, and
   * so is any change of language.
   *
   * The shell's own links (a service's connect card, the footer's home link)
   * are rendered by the package, unprefixed, and cannot carry
   * `data-sveltekit-reload`; `fullLoadGuard` says why it matters.
   */
  beforeNavigate(fullLoadGuard);

  /** A language this visitor seems to prefer over English, if any. */
  let hint = $state<Locale | undefined>(undefined);

  onMount(() => {
    platformUrl = shellOrigin(location.origin);

    /**
     * Signed in? Asked only in the browser, after the prerendered page is
     * showing. A signed-out visitor is not a failure (`refresh` resolves on a
     * `401`), so what reaches the catch is a real fault: a `5xx`, a network
     * error, no server in `vite dev`, a bug. It is logged, and the page keeps
     * the signed-out links, which still work.
     *
     * `#lib/session.svelte.js` and `#lib/api.js` are imported statically: neither
     * touches a browser global at module scope (one builds a `$state` object,
     * the other defines functions), so both are safe in the build's render.
     */
    session.refresh().catch((error: unknown) => {
      console.warn('could not check the session; showing the signed-out links', error);
    });

    // English pages only, and only an offer: nothing is stored, and the next
    // page asks again. The visitor's own choice of URL wins. It appears after
    // mount, so it is pinned to the bottom of the viewport rather than put in
    // the flow: in the flow it would push the page down under a reader who had
    // already started reading.
    if (data.lang === 'en') {
      const preferred = readCached() ?? detect();
      if (preferred !== 'en') hint = preferred;
    }
  });

  const basePath = $derived(stripLocale(page.url.pathname).path);
</script>

<div class="flex min-h-full flex-col" class:pb-14={hint !== undefined}>
  <a
    href="#main"
    class="sr-only z-20 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
  >
    {m.marketing_skip_to_content()}
  </a>

  {#if hint}
    <!-- In the suggested language, since it is addressed to someone who reads it. -->
    <div
      class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-muted px-4 py-3 text-sm shadow-lg"
      lang={hint}
    >
      <div class="mx-auto flex w-full max-w-6xl items-center gap-3">
        <a
          href={localizedPath(hint, basePath)}
          hreflang={hint}
          data-sveltekit-reload
          class="text-primary underline underline-offset-4"
        >
          {m.marketing_locale_hint({ language: LOCALE_NAMES[hint] }, { locale: hint })}
        </a>
        <button
          type="button"
          class="ml-auto text-muted-foreground hover:text-foreground"
          onclick={() => (hint = undefined)}
        >
          {m.marketing_locale_hint_dismiss({}, { locale: hint })}
        </button>
      </div>
    </div>
  {/if}

  <MarketingHeader lang={data.lang} {platformUrl} />

  <main id="main" tabindex="-1" class="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
    {@render children()}
  </main>

  <MarketingFooter lang={data.lang} {platformUrl} />
</div>
