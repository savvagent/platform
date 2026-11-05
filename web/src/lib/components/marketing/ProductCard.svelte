<script lang="ts">
  import type { Locale } from '#lib/locale.js';
  import { m } from '#lib/paraglide/messages.js';
  import type { Service } from '#lib/services.js';
  import { localizedPath } from '#lib/site.js';
  import { Card, CardContent, CardHeader, CardTitle } from '@savvagent/console-ui/ui/card';

  /**
   * One product, as a card that links to its page in the current language.
   *
   * The link text names the product ("More about Savvagent Flags") rather than a
   * bare "Learn more", so a screen reader's list of links is not five
   * identical entries.
   *
   * `level` is the name's heading level, which depends on where the card is
   * placed: one under the page's `<h1>` is an `h2`, one inside a section
   * with its own `<h2>` is an `h3`. A fixed level would skip one somewhere,
   * and a screen reader's heading list would show a gap.
   */
  interface Props {
    service: Service;
    lang: Locale;
    level?: 2 | 3;
  }

  let { service, lang, level = 3 }: Props = $props();
</script>

<Card class="gap-3 py-5">
  <CardHeader>
    <CardTitle {level} class="text-lg font-semibold tracking-tight text-foreground"
      >{service.name}</CardTitle
    >
  </CardHeader>
  <CardContent class="flex flex-1 flex-col gap-3">
    <p class="flex-1 text-sm text-muted-foreground">{service.copy.tagline()}</p>
    <a
      href={localizedPath(lang, `/products/${service.slug}`)}
      class="text-sm font-medium text-primary hover:underline"
    >
      {m.marketing_product_more({ name: service.name })}
      <span aria-hidden="true">→</span>
    </a>
  </CardContent>
</Card>
