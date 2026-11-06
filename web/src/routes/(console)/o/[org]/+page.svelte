<script lang="ts">
  import { api } from '#lib/api.js';
  import { messageFor } from '#lib/errors.js';
  import { m } from '#lib/paraglide/messages.js';
  import { currentLocale } from '#lib/locale.js';
  import { useOrg } from '#lib/org.svelte.js';
  import { roleLabel } from '#lib/labels.js';
  import { SERVICES } from '#lib/services.js';
  import type { BudgetsResponse, OrgMember, Team, UsageStatus } from '#lib/types.js';
  import BudgetAlerts from '#lib/components/BudgetAlerts.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Loading from '#lib/components/Loading.svelte';
  import Meter from '#lib/components/Meter.svelte';
  import PaymentRequiredNotices from '#lib/components/PaymentRequiredNotices.svelte';
  import ServiceLink from '#lib/components/ServiceLink.svelte';
  import { Alert } from '@savvagent/console-ui/ui/alert';
  import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '@savvagent/console-ui/ui/card';

  /**
   * The organization overview: who is in it, what plan it is on, what each
   * metered service has cost this month against any budget (with any budget
   * alerts this month has fired, and a notice for any service whose paid usage
   * is paused until a card is on file), and where to go to use the services it
   * has.
   *
   * It owns identity and billing only. What an org *does* with a service (queues,
   * repositories, trackers) lives in that service's own console, or, for a
   * service with none, in the person's AI assistant; this page links to each
   * from `SERVICES` through `ServiceLink`, which knows which is which.
   *
   * The four reads land as one value so a render never pairs one request's
   * member count with another's meter. They are plain `GET`s, not polled: nothing
   * here changes while nobody is touching the browser.
   */

  const org = useOrg();

  interface Overview {
    members: OrgMember[];
    teams: Team[];
    usage: UsageStatus;
    /** `undefined` when the budgets read failed: alerts are optional here. */
    budgets: BudgetsResponse | undefined;
  }

  let overview = $state<Overview | undefined>(undefined);
  let error = $state<string | undefined>(undefined);

  $effect(() => {
    const slug = org.slug;
    if (!slug) return;

    overview = undefined;
    error = undefined;

    void (async () => {
      try {
        // Budgets only feed the alerts, so a failed budgets read leaves them
        // out (with a quiet note) instead of blanking the overview.
        const [members, teams, usage, budgets] = await Promise.allSettled([
          api.members(slug),
          api.teams(slug),
          api.usage(slug),
          api.budgets(slug)
        ]);
        if (members.status === 'rejected') throw members.reason;
        if (teams.status === 'rejected') throw teams.reason;
        if (usage.status === 'rejected') throw usage.reason;
        // A fast navigation between two orgs can land the first fetch after the
        // second; applying it would show one org's numbers under the other's name.
        if (org.slug !== slug) return;
        overview = {
          members: members.value,
          teams: teams.value,
          usage: usage.value,
          budgets: budgets.status === 'fulfilled' ? budgets.value : undefined
        };
      } catch (e) {
        if (org.slug === slug) error = messageFor(e, m.overview_load_failed());
      }
    })();
  });

  const tiles = $derived(
    overview
      ? [
          { label: m.overview_tile_members(), value: overview.members.length, href: 'members' },
          { label: m.overview_tile_teams(), value: overview.teams.length, href: 'teams' }
        ]
      : []
  );
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-lg font-semibold">{org.title}</h1>
    <p class="mt-0.5 text-sm text-muted-foreground">
      <code class="sav-mono">{org.slug}</code> · {m.overview_role_and_plan({
        role: org.role ? roleLabel(org.role) : '—',
        plan: org.org?.plan ?? '—'
      })}
    </p>
  </div>

  {#if error}
    <Alert variant="destructive">{error}</Alert>
  {:else if !overview}
    <Loading what={m.overview_loading()} />
  {:else}
    <PaymentRequiredNotices
      services={overview.usage.services}
      owner={org.isOwner}
      billingHref="/o/{org.slug}/billing"
    />

    {#if overview.budgets}
      <BudgetAlerts services={overview.budgets.services} />
    {:else}
      <p class="text-xs text-muted-foreground">{m.usage_alerts_unavailable()}</p>
    {/if}

    <div class="grid grid-cols-2 gap-3">
      {#each tiles as tile (tile.href)}
        <a
          class="rounded-xl bg-card px-4 py-3 text-card-foreground ring-1 ring-foreground/10 transition hover:bg-muted"
          href="/o/{org.slug}/{tile.href}"
        >
          <div class="text-2xl font-semibold text-foreground">
            {tile.value.toLocaleString(currentLocale())}
          </div>
          <div class="mt-0.5 text-xs text-muted-foreground">{tile.label}</div>
        </a>
      {/each}
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader class="border-b">
          <CardTitle level={2} class="text-sm font-semibold">{m.overview_period_title()}</CardTitle>
          <CardDescription>{m.overview_period_description()}</CardDescription>
          <CardAction>
            <a
              class="text-xs text-muted-foreground underline hover:text-foreground"
              href="/o/{org.slug}/usage"
            >
              {m.overview_period_details()}
            </a>
          </CardAction>
        </CardHeader>
        <CardContent>
          {#if overview.usage.services.length === 0}
            <p class="text-sm text-muted-foreground">{m.overview_spend_empty()}</p>
          {:else}
            <ul class="space-y-3">
              {#each overview.usage.services as service (service.service)}
                <li><Meter usage={service} compact /></li>
              {/each}
            </ul>
          {/if}
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="border-b">
          <CardTitle level={2} class="text-sm font-semibold"
            >{m.overview_services_title()}</CardTitle
          >
          <CardDescription>{m.overview_services_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          {#if SERVICES.length === 0}
            <Empty title={m.overview_services_empty_title()}>
              {m.overview_services_empty_hint()}
            </Empty>
          {:else}
            <ul class="flex flex-wrap gap-2">
              {#each SERVICES as service (service.slug)}
                <li><ServiceLink {service} /></li>
              {/each}
            </ul>
          {/if}
        </CardContent>
      </Card>
    </div>
  {/if}
</div>
