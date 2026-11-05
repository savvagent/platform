<script lang="ts">
  import { page } from '$app/state';
  import { ConsoleHeader } from '@savvagent/console-ui';

  import { writeCached, type Locale } from '#lib/locale.js';
  import { m } from '#lib/paraglide/messages.js';
  import { SERVICES } from '#lib/services.js';
  import { session } from '#lib/session.svelte.js';
  import { shellServices } from '#lib/shell.js';
  import { localizedPath, stripLocale } from '#lib/site.js';
  import Logo from '#lib/components/Logo.svelte';
  import ConsoleLink from './ConsoleLink.svelte';

  /**
   * The marketing pages' header: the logo, the products and pricing, and a
   * way into the console, in the slots of the shared `ConsoleHeader`.
   *
   * **No `session` is passed, ever.** Without one the shell renders no org
   * switcher or account menu, whose links lead into the console; this
   * header's own `signedOut` slot is shown instead, and it decides between
   * "Create account" and "Open console" itself.
   *
   * `platformUrl` is where the shell fetches the service list from and where
   * its default links point. The layout owns it (see there for why it starts
   * as the production origin).
   *
   * **The console links are unprefixed and carry `data-sveltekit-reload`.**
   * The console has one URL per page whatever the language (it reads the
   * language from the account, not the path), and crossing from a
   * prerendered marketing page into the browser-only console as a full load
   * means the console boots exactly as it would from a typed URL — its
   * `resolveAtBoot` runs, and nothing from this layout's locale override is
   * still in place.
   *
   * The signed-in variant is decided in the browser only: the file a crawler
   * gets is the signed-out one, and `session` is filled in after mount by the
   * layout.
   */
  interface Props {
    lang: Locale;
    platformUrl: string;
  }

  let { lang, platformUrl }: Props = $props();

  /**
   * The shell's language picker. A marketing page's language is its URL, so
   * a pick is this page under the other prefix, loaded in full: the shell's
   * strings and this app's change only with a new document. The cache is
   * written first, so the console opens in the same language later.
   */
  function changeLocale(next: Locale) {
    writeCached(next);
    location.assign(localizedPath(next, stripLocale(page.url.pathname).path));
  }

  const products = $derived(
    SERVICES.map((service) => ({
      href: localizedPath(lang, `/products/${service.slug}`),
      label: service.name
    }))
  );
  const pricing = $derived(localizedPath(lang, '/pricing'));
  const cli = $derived(localizedPath(lang, '/cli'));

  /**
   * The small-screen menu's state, owned here rather than left to the
   * `<details>` alone.
   *
   * Its links are client-side navigations, and a `<details>` has no idea a
   * route changed: without this the next page would load under a menu still
   * open over it. Reading `page.url` is what makes the effect re-run on every
   * navigation; the value itself is not needed.
   */
  let menuOpen = $state(false);
  let menuToggle = $state<HTMLElement>();

  $effect(() => {
    void page.url;
    menuOpen = false;
  });

  /**
   * Escape closes the menu, and focus goes back to the toggle that opened it.
   *
   * Listened for on the window rather than on the `<details>`: a key handler
   * on a non-interactive element is invisible to assistive technology, and an
   * open menu is the only thing on these pages Escape could mean.
   */
  function onMenuKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !menuOpen) return;
    event.preventDefault();
    menuOpen = false;
    menuToggle?.focus();
  }

  function current(href: string): 'page' | undefined {
    return page.url.pathname === href ? 'page' : undefined;
  }

  // The current page is underlined as well as brighter: colour alone is not
  // a cue everyone can see (WCAG 1.4.1).
  const link =
    'rounded-md px-2.5 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:underline-offset-4';
  // The platform's own list, handed over rather than fetched (see `shellServices`).
  const services = $derived(shellServices(platformUrl));
</script>

<svelte:window onkeydown={onMenuKeydown} />

<ConsoleHeader {platformUrl} {services} service="platform" onLocaleChange={changeLocale}>
  {#snippet brand()}
    <a href={localizedPath(lang, '/')} class="flex items-center gap-2 px-2" aria-label="Savvagent">
      <Logo class="size-6 text-primary" />
      <span class="text-sm font-semibold tracking-tight text-foreground">Savvagent</span>
    </a>
  {/snippet}

  {#snippet nav()}
    <nav
      class="ml-2 hidden items-center gap-1 text-sm md:flex"
      aria-label={m.marketing_nav_label()}
    >
      {#each products as item (item.href)}
        <a href={item.href} class={link} aria-current={current(item.href)}>{item.label}</a>
      {/each}
      <a href={pricing} class={link} aria-current={current(pricing)}>{m.marketing_nav_pricing()}</a>
      <a href={cli} class={link} aria-current={current(cli)}>{m.marketing_nav_cli()}</a>
    </nav>

    <!--
      The small-screen menu. A `<details>` rather than a scripted toggle, so
      it opens and closes without JavaScript and announces its state for
      free. "Sign in" lives in here below `sm`, so the bar never has to fit
      three buttons in 360px.
    -->
    <details class="relative text-sm md:hidden" bind:open={menuOpen}>
      <summary
        bind:this={menuToggle}
        class="cursor-pointer list-none rounded-md border border-border px-2.5 py-1.5 text-muted-foreground transition select-none hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
      >
        {m.marketing_nav_menu()}
      </summary>
      <nav
        class="absolute left-0 z-10 mt-2 flex w-56 flex-col gap-1 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
        aria-label={m.marketing_nav_label()}
      >
        <span class="sav-kicker px-2.5 pt-1">{m.marketing_nav_products()}</span>
        {#each products as item (item.href)}
          <a href={item.href} class={link} aria-current={current(item.href)}>{item.label}</a>
        {/each}
        <hr class="my-1 border-border" />
        <a href={pricing} class={link} aria-current={current(pricing)}>
          {m.marketing_nav_pricing()}
        </a>
        <a href={cli} class={link} aria-current={current(cli)}>{m.marketing_nav_cli()}</a>
        {#if !session.signedIn}
          <a href="/login" data-sveltekit-reload class="sm:hidden {link}">{m.nav_sign_in()}</a>
        {/if}
      </nav>
    </details>
  {/snippet}

  {#snippet signedOut()}
    <div class="flex items-center gap-2 text-sm">
      {#if !session.signedIn}
        <a href="/login" data-sveltekit-reload class="hidden sm:inline-block {link}">
          {m.nav_sign_in()}
        </a>
      {/if}
      <ConsoleLink size="sm" />
    </div>
  {/snippet}
</ConsoleHeader>
