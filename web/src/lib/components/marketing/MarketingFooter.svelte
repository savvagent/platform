<script lang="ts">
  import { page } from '$app/state';
  import { ConsoleFooter } from '@savvagent/console-ui';

  import { LOCALE_NAMES, type Locale } from '#lib/locale.js';
  import { m } from '#lib/paraglide/messages.js';
  import { CONTACT_EMAIL, MARKETING_LOCALES, localizedPath, stripLocale } from '#lib/site.js';
  import { APP_VERSION } from '#lib/version.js';

  /**
   * The marketing pages' footer: the language switcher, then the shared
   * `ConsoleFooter` with the API reference, a contact address and the
   * version.
   *
   * **Each language link is this page in that language**, not that
   * language's home page: the current path is stripped of its prefix and
   * re-localized. Every one carries `data-sveltekit-reload`, because a
   * language change reloads the document (Paraglide's `m.*()` are plain
   * calls, so a client-side navigation would leave the layout speaking the
   * old language).
   *
   * **The language nav is `data-languages`**, and `check-build` finds the
   * page's last localized string by that marker: the shared footer below has
   * links of its own, so "the first nav in the footer" no longer names it.
   *
   * **The API reference is absolute, on `platformUrl`, and must stay so.**
   * The prerender crawler follows every same-origin link it sees, there is
   * no `/api` at build time, and a 404 fails the build. The shared footer
   * cannot carry `rel="external"`, which is how this link used to say so; an
   * absolute URL on the production origin is not the prerender's origin, so
   * the crawler leaves it alone.
   *
   * The contact link reads "Contact: sales@…" rather than the bare address,
   * so it still says what the address is for among the shared footer's
   * other bare labels, without a second copy of the link elsewhere.
   */
  interface Props {
    lang: Locale;
    platformUrl: string;
  }

  let { lang, platformUrl }: Props = $props();

  const basePath = $derived(stripLocale(page.url.pathname).path);
  const links = $derived([
    { label: m.nav_api_reference(), href: `${platformUrl}/api/openapi.json` },
    { label: `${m.marketing_footer_contact()} ${CONTACT_EMAIL}`, href: `mailto:${CONTACT_EMAIL}` },
    {
      label: `v${APP_VERSION}`,
      href: `https://github.com/savvagent/platform/releases/tag/v${APP_VERSION}`
    }
  ]);
</script>

<div class="border-t border-border">
  <div class="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground">
    <nav data-languages aria-label={m.marketing_footer_language()}>
      <ul role="list" class="flex flex-wrap gap-x-3 gap-y-2">
        {#each MARKETING_LOCALES as locale (locale)}
          <li>
            <a
              href={localizedPath(locale, basePath)}
              hreflang={locale}
              lang={locale}
              data-sveltekit-reload
              aria-current={locale === lang ? 'true' : undefined}
              class="hover:text-foreground aria-[current=true]:font-medium aria-[current=true]:text-foreground"
            >
              {LOCALE_NAMES[locale]}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>
  <ConsoleFooter {platformUrl} {links} />
</div>
