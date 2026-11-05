<script lang="ts">
  import type { Locale } from '#lib/locale.js';
  import { m } from '#lib/paraglide/messages.js';
  import { localizedPath } from '#lib/site.js';
  import { Button } from '@savvagent/console-ui/ui/button';
  import ConsoleLink from './ConsoleLink.svelte';

  /**
   * The landing page's pair of calls to action: the way into the console
   * (see `ConsoleLink` for how it follows the session), and pricing.
   *
   * Pricing is a marketing page in this page's language, so it is an
   * ordinary client-side link.
   */
  interface Props {
    lang: Locale;
  }

  let { lang }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-3">
  <ConsoleLink />
  <Button href={localizedPath(lang, '/pricing')} variant="outline" size="lg" class="h-10 px-5">
    {m.landing_see_pricing()}
  </Button>
</div>
