<script lang="ts">
  import type { Locale } from '#lib/locale.js';
  import { m } from '#lib/paraglide/messages.js';
  import { Card, CardContent, CardHeader, CardTitle } from '@savvagent/console-ui/ui/card';
  import { meterTiers, type ServiceUsageGroup, type TierRange } from '#lib/pricing.js';

  /**
   * One service's usage prices, as the pricing page shows them: the service's
   * name, then a graduated tier table per priced value meter — or, for a
   * service with no meter priced yet, one line saying so.
   *
   * The meter's `displayName` and `unit` are written by the service, in
   * English, and are shown as given, like a plan's name; everything around
   * them is a message, and every number is formatted in the page's `lang`
   * (see `#lib/pricing.js`).
   *
   * A table rather than a list because a tier has two facts that read across
   * (which units, at what price), and a screen reader announces each price
   * with its column header. The free allowance, when the first tier is free,
   * is also said in words above the table: "first 1,000 free" is what a reader
   * is looking for, and a "Free" cell alone makes them work it out.
   *
   * The table scrolls sideways inside its own box on a narrow screen, as the
   * console's tables do, rather than widening the page.
   *
   * `level` is the service name's heading level: one under the usage
   * section's `<h2>` is an `h3`.
   */
  interface Props {
    usage: ServiceUsageGroup;
    lang: Locale;
    level?: 2 | 3;
  }

  let { usage, lang, level = 3 }: Props = $props();

  const meters = $derived(usage.meters.map((meter) => ({ meter, tiers: meterTiers(meter, lang) })));
</script>

{#snippet range(r: TierRange)}
  {#if r.kind === 'upTo'}
    {m.pricing_tier_up_to({ to: r.to })}
  {:else if r.kind === 'between'}
    {m.pricing_tier_between({ from: r.from, to: r.to })}
  {:else if r.kind === 'above'}
    {m.pricing_tier_above({ from: r.from })}
  {:else}
    {m.pricing_tier_all()}
  {/if}
{/snippet}

<Card class="gap-5 py-5">
  <CardHeader>
    <CardTitle>
      <svelte:element
        this={`h${level}`}
        class="text-lg font-semibold tracking-tight text-foreground"
      >
        {usage.name}
      </svelte:element>
    </CardTitle>
  </CardHeader>
  <CardContent class="flex flex-col gap-5">
    {#if meters.length === 0}
      <p class="text-sm text-muted-foreground">{m.pricing_usage_service_none()}</p>
    {:else}
      {#each meters as { meter, tiers } (meter.meter)}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <caption class="pb-2 text-left">
              <span class="block font-medium text-foreground">{meter.displayName}</span>
              <span class="block text-muted-foreground"
                >{m.pricing_usage_unit({ unit: meter.unit })}</span
              >
              {#if tiers.freeAllowance}
                <span class="block text-muted-foreground">
                  {m.pricing_usage_free_allowance(tiers.freeAllowance)}
                </span>
              {/if}
            </caption>
            <thead>
              <tr class="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th scope="col" class="py-1.5 pr-3 font-medium">{m.pricing_usage_col_units()}</th>
                <th scope="col" class="py-1.5 text-right font-medium"
                  >{m.pricing_usage_col_price()}</th
                >
              </tr>
            </thead>
            <tbody>
              {#each tiers.rows as row, i (i)}
                <tr class="border-b border-border/40 last:border-b-0">
                  <td class="py-1.5 pr-3 text-muted-foreground">{@render range(row.range)}</td>
                  <td class="py-1.5 text-right font-medium text-foreground tabular-nums">
                    {row.price.kind === 'free' ? m.pricing_free() : row.price.amount}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/each}
    {/if}
  </CardContent>
</Card>
