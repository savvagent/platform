<script lang="ts">
  import { currentLocale } from '#lib/locale.js';
  import { m } from '#lib/paraglide/messages.js';
  import { serviceLink, type Service } from '#lib/services.js';

  /**
   * A link to a Savvagent service from inside the console: the org home's Services card.
   *
   * **Where it goes is `serviceLink`'s call, not this component's.** A service
   * with a web console is a plain external link to it, as it always was. One
   * without — Savvagent Flags — has nothing at its origin but a JSON 404,
   * so the link goes to its product page's connect card instead, which says
   * how to add it to an AI assistant.
   *
   * **That second link crosses into the marketing half, so it carries
   * `data-sveltekit-reload`**, for the reason the web README gives and
   * `ConsoleLink` follows the other way: a client-side route would carry the
   * console's locale getter onto a page whose language is its URL. It is
   * spelled in the console's current language, so a person reading the
   * console in Spanish lands on the Spanish page.
   *
   * **The difference shows before the click.** A connector gets a small
   * "Connector" badge, and an accessible name ("Savvagent Flags, connector") that
   * reads as a phrase rather than the two words run together; the badge is
   * hidden from assistive technology, which already hears it in the name.
   * The name starts with the visible text, so a voice-control user can say
   * what they see. The badge is `text-muted-foreground`, the shared theme's
   * secondary text colour, which holds 4.5:1 on the card and on the hover
   * background: it is small text that carries meaning.
   */
  interface Props {
    service: Service;
  }

  let { service }: Props = $props();

  const link = $derived(serviceLink(service, currentLocale()));
</script>

<a
  href={link.href}
  class="group flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
  aria-label={link.kind === 'connector'
    ? m.service_connector_label({ name: service.name })
    : undefined}
  data-sveltekit-reload={link.kind === 'connector' ? '' : undefined}
>
  {service.name}
  {#if link.kind === 'connector'}
    <span
      aria-hidden="true"
      class="rounded border border-border px-1 text-[0.6875rem] leading-4 font-medium text-muted-foreground group-hover:text-foreground"
    >
      {m.service_connector_badge()}
    </span>
  {/if}
</a>
