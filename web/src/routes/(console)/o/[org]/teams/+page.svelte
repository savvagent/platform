<script lang="ts">
  import { api } from '#lib/api.js';
  import { messageFor } from '#lib/errors.js';
  import { m } from '#lib/paraglide/messages.js';
  import { useOrg } from '#lib/org.svelte.js';
  import { slugPreview, person } from '#lib/format.js';
  import type { OrgMember, Team, TeamMember } from '#lib/types.js';
  import Empty from '#lib/components/Empty.svelte';
  import Loading from '#lib/components/Loading.svelte';
  import Spinner from '#lib/components/Spinner.svelte';
  import { Alert } from '@savvagent/console-ui/ui/alert';
  import { Button } from '@savvagent/console-ui/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '@savvagent/console-ui/ui/card';
  import { Field, FieldDescription, FieldLabel } from '@savvagent/console-ui/ui/field';
  import { Input } from '@savvagent/console-ui/ui/input';

  /**
   * Teams — a grouping of members inside an org.
   *
   * The platform only records who is on which team. What a team scopes (a
   * service's repos, queues, projects) belongs to that service, which reads the
   * roster from here.
   */

  const org = useOrg();
  const id = $props.id();

  let teams = $state<Team[]>([]);
  let members = $state<OrgMember[]>([]);
  let rosters = $state<Record<string, TeamMember[]>>({});
  let expanded = $state<string | undefined>(undefined);
  let loading = $state(true);
  let error = $state<string | undefined>(undefined);
  let busy = $state<string | undefined>(undefined);

  let slug = $state('');
  let name = $state('');
  let creating = $state(false);
  let formError = $state<string | undefined>(undefined);

  $effect(() => {
    const org_ = org.slug;
    if (!org_) return;

    loading = true;
    error = undefined;

    void (async () => {
      try {
        const [t, m_] = await Promise.all([api.teams(org_), api.members(org_)]);
        if (org.slug !== org_) return;
        teams = t;
        members = m_;
      } catch (e) {
        error = messageFor(e, m.teams_error_load());
      } finally {
        loading = false;
      }
    })();
  });

  async function openTeam(team: Team) {
    if (expanded === team.slug) {
      expanded = undefined;
      return;
    }
    expanded = team.slug;
    await loadRoster(team.slug);
  }

  async function loadRoster(teamSlug: string) {
    try {
      rosters = { ...rosters, [teamSlug]: await api.teamMembers(org.slug, teamSlug) };
    } catch (e) {
      error = messageFor(e, m.teams_error_read());
    }
  }

  async function create(event: SubmitEvent) {
    event.preventDefault();
    creating = true;
    formError = undefined;
    try {
      await api.createTeam(org.slug, slugPreview(slug), name.trim());
      slug = '';
      name = '';
      teams = await api.teams(org.slug);
    } catch (e) {
      formError = messageFor(e, m.teams_error_create());
    } finally {
      creating = false;
    }
  }

  async function act(key: string, action: () => Promise<unknown>, teamSlug?: string) {
    busy = key;
    error = undefined;
    try {
      await action();
      teams = await api.teams(org.slug);
      if (teamSlug) await loadRoster(teamSlug);
    } catch (e) {
      error = messageFor(e, m.error_that_did_not_work());
    } finally {
      busy = undefined;
    }
  }

  /** Org members not already on the expanded team. */
  const candidates = $derived((teamSlug: string) => {
    const on = new Set((rosters[teamSlug] ?? []).map((m_) => m_.userId));
    return members.filter((m_) => !on.has(m_.id));
  });
</script>

<div class="space-y-5">
  <div>
    <h1 class="text-lg font-semibold">{m.teams_title()}</h1>
    <p class="mt-0.5 text-sm text-muted-foreground">
      {m.teams_subtitle()}
    </p>
  </div>

  {#if error}<Alert variant="destructive">{error}</Alert>{/if}

  {#if org.isAdmin}
    <Card>
      <CardHeader class="border-b">
        <CardTitle><h2 class="text-sm font-semibold">{m.teams_new_title()}</h2></CardTitle>
      </CardHeader>
      <CardContent>
        <form class="flex flex-wrap items-end gap-3" onsubmit={create}>
          <div class="w-44">
            <Field>
              <FieldLabel for="{id}-slug">{m.teams_field_slug()}</FieldLabel>
              <Input id="{id}-slug" class="sav-mono" required bind:value={slug} />
            </Field>
          </div>
          <div class="min-w-48 flex-1">
            <Field>
              <FieldLabel for="{id}-name">{m.teams_field_name()}</FieldLabel>
              <Input id="{id}-name" aria-describedby="{id}-name-hint" bind:value={name} />
              <FieldDescription id="{id}-name-hint">{m.teams_field_name_hint()}</FieldDescription>
            </Field>
          </div>
          <div class="pb-0.5">
            <Button type="submit" disabled={creating}>
              {#if creating}<Spinner />{/if}
              {m.teams_create()}
            </Button>
          </div>
        </form>
        {#if formError}<div class="mt-3"><Alert variant="destructive">{formError}</Alert></div>{/if}
      </CardContent>
    </Card>
  {/if}

  {#if loading && teams.length === 0}
    <Loading what={m.teams_loading()} />
  {:else if teams.length === 0}
    <Empty title={m.teams_empty_title()}>
      {m.teams_empty_body()}
    </Empty>
  {:else}
    <ul class="space-y-2">
      {#each teams as team (team.id)}
        <li>
          <Card class="gap-0 py-0">
            <div class="flex flex-wrap items-center gap-3 px-4 py-3">
              <div class="min-w-0 flex-1">
                <span class="sav-mono text-sm text-foreground">{team.slug}</span>
                <p class="text-xs text-muted-foreground">{team.name}</p>
              </div>

              <button
                class="text-xs text-muted-foreground underline hover:text-foreground"
                onclick={() => openTeam(team)}
                aria-expanded={expanded === team.slug}
              >
                {expanded === team.slug ? m.teams_hide_members() : m.teams_show_members()}
              </button>

              {#if org.isAdmin}
                <Button
                  variant="destructive"
                  disabled={busy === `${team.id}:delete`}
                  onclick={() =>
                    act(`${team.id}:delete`, () => api.deleteTeam(org.slug, team.slug))}
                >
                  {#if busy === `${team.id}:delete`}<Spinner />{/if}
                  {m.teams_delete()}
                </Button>
              {/if}
            </div>

            {#if expanded === team.slug}
              {@const roster = rosters[team.slug]}
              <div class="space-y-3 border-t border-border/60 px-4 py-3">
                {#if !roster}
                  <Loading what={m.teams_roster_loading()} />
                {:else if roster.length === 0}
                  <p class="text-xs text-muted-foreground">{m.teams_roster_empty()}</p>
                {:else}
                  <ul class="divide-y divide-border/40">
                    {#each roster as member (member.userId)}
                      <li class="flex items-center gap-3 py-2 text-sm">
                        <span class="min-w-0 flex-1 truncate text-muted-foreground">
                          {person(member.name, member.email, member.label)}
                        </span>
                        {#if org.isAdmin}
                          <Button
                            variant="outline"
                            disabled={busy === `${team.id}:${member.userId}`}
                            onclick={() =>
                              act(
                                `${team.id}:${member.userId}`,
                                () => api.removeTeamMember(org.slug, team.slug, member.userId),
                                team.slug
                              )}
                          >
                            {#if busy === `${team.id}:${member.userId}`}<Spinner />{/if}
                            {m.teams_remove_member()}
                          </Button>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}

                {#if org.isAdmin && candidates(team.slug).length > 0}
                  <label class="flex items-end gap-2">
                    <span class="sr-only">{m.teams_add_member_label({ team: team.slug })}</span>
                    <select
                      class="sav-select w-64"
                      value=""
                      onchange={(e) => {
                        const user = e.currentTarget.value;
                        e.currentTarget.value = '';
                        if (user) {
                          void act(
                            `${team.id}:add`,
                            () => api.addTeamMember(org.slug, team.slug, user),
                            team.slug
                          );
                        }
                      }}
                    >
                      <option value="">{m.teams_add_member_option()}</option>
                      {#each candidates(team.slug) as member (member.id)}
                        <option value={member.id}
                          >{person(member.name, member.email, member.label)}</option
                        >
                      {/each}
                    </select>
                  </label>
                {/if}
              </div>
            {/if}
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</div>
