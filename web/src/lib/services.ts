/**
 * The Savvagent products: linked from the console's header, and described on
 * the public marketing pages.
 *
 * Savvagent is split across hostnames: this console owns the account and the
 * organization (sign-in, passkeys, members, teams, SSO, usage, audit), and each
 * product is a service on its own host that signs in here with OAuth.
 *
 * **Not every service has a web console.** Savvagent Tower and Savvagent CXP
 * serve one, so a person never has to know a hostname. Savvagent Flags is
 * agent-only: its origin answers a browser with a JSON 404, and the place a
 * person uses it is their AI assistant, with the service added as a custom
 * connector. So the field is `consoleUrl`, and optional, and
 * a link to a service goes through `serviceLink`, which sends a service with no
 * console to its product page's connect card instead of to its origin.
 *
 * **It is deliberately a plain list.** A new service is one entry here plus its
 * copy in the message catalogs: the marketing pages and the sitemap derive
 * their product pages from it. The one exception is `scripts/check-build.mjs`,
 * which runs in plain Node without `$lib` and so keeps its own copy of the
 * slugs; `check-build.test.mjs` fails until that copy matches. The console
 * itself still knows nothing about what any of them *do* — it reads only
 * `name`, and where `serviceLink` says to go.
 *
 * `consoleUrl` and `mcpUrl` are https only — `servicesIn` drops anything else,
 * so a typo cannot put a plaintext or `javascript:` link in the header.
 *
 * **Other consoles read this list at runtime.** The build writes
 * `serviceDirectory()` to `/services/v1.json`, which every Savvagent console's
 * header (through `@savvagent/console-ui`) fetches cross-origin. It is made
 * from `SERVICES`, the same filtered list this site's own header and product
 * pages render, so the two cannot disagree. The response shape is a contract:
 * see `docs/service-directory.md` before changing `ServiceDirectory`.
 */

import type { Locale } from '#lib/locale.js';
import { m } from '#lib/paraglide/messages.js';
import { localizedPath } from '#lib/site.js';

/**
 * A product's marketing copy, as functions.
 *
 * **Called at render time, never at module load.** Paraglide's `m.*()` read
 * the locale when they are called; this module is evaluated once per build (or
 * once per page load), so a string captured at import would be frozen in
 * whichever language happened to be current then — every prerendered page
 * would say the same thing in the same language.
 */
export interface ServiceCopy {
  /**
   * The product page's `<title>` after the name: a phrase, with no closing
   * punctuation, because it is joined to the name as `{name}: {title}` and a
   * title that ends in a full stop reads as a sentence in a search result.
   */
  title(): string;
  /**
   * The product page's meta description: at most 160 characters in every
   * locale (`services.test.ts` checks), which is roughly what a search result
   * shows before it truncates. `summary` is the longer, on-page version.
   */
  description(): string;
  /** One short line, under the name. */
  tagline(): string;
  /** One or two sentences. */
  summary(): string;
  /** Four to six bullets. */
  features(): string[];
}

export interface Service {
  /** The product page's path segment: `/products/{slug}`. Lowercase, digits and `-`. */
  slug: string;
  /** Product name. A name, so it is never translated. */
  name: string;
  /**
   * Where the service's own web console starts: its origin with no trailing
   * slash when the console is at the root (`https://tower.savvagent.com`), or
   * the full URL of the path it is served under (CXP's is
   * `https://cxp.savvagent.com/console/`) — or absent for a service that has
   * none. Absent is not "unknown": it is what makes every link to the service
   * point at its connect card, so set it only for an origin that answers a
   * browser with a page. An external origin, so a link to it is a full
   * navigation, never a client-side route.
   */
  consoleUrl?: string;
  /**
   * The MCP endpoint an agent is pointed at, if the service has one: the
   * "connector address" a person pastes into their assistant.
   *
   * **This is the service's OAuth resource URI, not just a link.** An MCP
   * client signs in for exactly this URL (RFC 8707 `resource`), and the
   * service's protected-resource metadata must name the same one. Since
   * rebrand phase 3 (#135) that is the service's own host; the retired
   * hosts only redirect, and the platform no longer knows their resource
   * URIs (#148).
   */
  mcpUrl?: string;
  copy: ServiceCopy;
}

const CONFIGURED: readonly Service[] = [
  {
    slug: 'tower',
    name: 'Savvagent Tower',
    consoleUrl: 'https://tower.savvagent.com',
    // `OF_RESOURCE_URI` in the service's `fly.toml`: the MCP endpoint is
    // `/mcp` on the service's own origin.
    mcpUrl: 'https://tower.savvagent.com/mcp',
    copy: {
      title: () => m.product_tower_title(),
      description: () => m.product_tower_description(),
      tagline: () => m.product_tower_tagline(),
      summary: () => m.product_tower_summary(),
      features: () => [
        m.product_tower_feature_jobs(),
        m.product_tower_feature_visibility(),
        m.product_tower_feature_leases(),
        m.product_tower_feature_trackers(),
        m.product_tower_feature_install()
      ]
    }
  },
  {
    slug: 'flags',
    name: 'Savvagent Flags',
    // No `consoleUrl`: the origin serves the API and `/mcp`, not a page.
    mcpUrl: 'https://flags.savvagent.com/mcp',
    copy: {
      title: () => m.product_flags_title(),
      description: () => m.product_flags_description(),
      tagline: () => m.product_flags_tagline(),
      summary: () => m.product_flags_summary(),
      features: () => [
        m.product_flags_feature_manage(),
        m.product_flags_feature_risk(),
        m.product_flags_feature_rollback(),
        m.product_flags_feature_evaluate(),
        m.product_flags_feature_auto_rollback()
      ]
    }
  },
  {
    slug: 'cxp',
    name: 'Savvagent CXP',
    // The console is served under `/console/` (savvagent/cxp#80); the origin
    // itself is the connector install page and the API.
    consoleUrl: 'https://cxp.savvagent.com/console/',
    mcpUrl: 'https://cxp.savvagent.com/mcp',
    copy: {
      title: () => m.product_cxp_title(),
      description: () => m.product_cxp_description(),
      tagline: () => m.product_cxp_tagline(),
      summary: () => m.product_cxp_summary(),
      features: () => [
        m.product_cxp_feature_profiles(),
        m.product_cxp_feature_support(),
        m.product_cxp_feature_feedback(),
        m.product_cxp_feature_scope()
      ]
    }
  }
];

/** A slug is one path segment and one file name: no case, no separators. */
const SLUG = /^[a-z0-9-]+$/;

function isHttps(raw: string): boolean {
  try {
    return new URL(raw).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Keep only entries that are safe to render as an external link and a page path.
 *
 * An entry with neither a console nor an MCP endpoint is dropped too: there is
 * nowhere to send a person, and `serviceLink` would point at a connect card
 * the product page does not render.
 */
export function servicesIn(candidates: readonly Service[]): Service[] {
  return candidates.filter(
    (service) =>
      service.name.trim().length > 0 &&
      SLUG.test(service.slug) &&
      (service.consoleUrl === undefined || isHttps(service.consoleUrl)) &&
      (service.mcpUrl === undefined || isHttps(service.mcpUrl)) &&
      (service.consoleUrl !== undefined || service.mcpUrl !== undefined)
  );
}

export const SERVICES: readonly Service[] = servicesIn(CONFIGURED);

/** The service a product page's slug names, or `undefined` if none does. */
export function serviceBySlug(slug: string): Service | undefined {
  return SERVICES.find((service) => service.slug === slug);
}

/**
 * Where a link to a service goes, from anywhere in this site.
 *
 * `console` is the service's own web console, on its own origin. `connector`
 * is its product page's connect card (`#connect`), in `lang`: the page that
 * says how to add it to an AI assistant, which is where a service without a
 * console is used. The two are told apart in the type, not by sniffing the
 * href, because they want different markup — a `connector` link crosses from
 * the console into the marketing half and needs `data-sveltekit-reload`, and
 * says so with a badge.
 */
export type ServiceDestination =
  { kind: 'console'; href: string } | { kind: 'connector'; href: string };

export function serviceLink(service: Service, lang: Locale): ServiceDestination {
  if (service.consoleUrl) return { kind: 'console', href: service.consoleUrl };
  return { kind: 'connector', href: `${localizedPath(lang, `/products/${service.slug}`)}#connect` };
}

/**
 * The name an MCP client knows the service by: `otto-{slug}`, which is also
 * the first label of its MCP host, the name each service's own docs use, so a
 * person who follows both ends up with one server rather than two, and the
 * service slug its usage is billed under (`serviceName` matches on it).
 *
 * It keeps the old prefix for now: billing slugs are never renamed, and the
 * MCP server names change with each service's resource URI in rebrand phase 3
 * (#135). See `docs/rebrand-allowlist.md`.
 */
export function connectorName(service: Service): string {
  return `otto-${service.slug}`;
}

/**
 * The MCP server name the "Add to Claude Code" command gives the service,
 * matching each service's own docs (`savvagent-tower` and so on). Not the
 * billing slug, which never changes (`connectorName`).
 */
export function mcpServerName(service: Service): string {
  return `savvagent-${service.slug}`;
}

/** The Claude Code command that adds the service, or `undefined` without an MCP endpoint. */
export function claudeCodeCommand(service: Service): string | undefined {
  if (!service.mcpUrl) return undefined;
  return `claude mcp add --transport http ${mcpServerName(service)} ${service.mcpUrl}`;
}

/**
 * The version of the published service list. Part of its path
 * (`SERVICE_DIRECTORY_PATH`) and repeated in its body.
 *
 * Adding a field is not a new version. Removing or renaming one, or changing
 * what one means, is: publish `/services/v2.json` beside v1 and keep v1 until
 * every pinned `@savvagent/console-ui` has moved. See
 * `docs/service-directory.md`.
 */
export const SERVICE_DIRECTORY_VERSION = 1;

/** Where the build writes the service list, on the platform's origin. */
export const SERVICE_DIRECTORY_PATH = `/services/v${SERVICE_DIRECTORY_VERSION}.json`;

/** One service as other consoles see it: where to send a person, and nothing else. */
export interface ServiceDirectoryEntry {
  slug: string;
  name: string;
  /** `null` when the service has no web console (see `Service.consoleUrl`). */
  consoleUrl: string | null;
  /** `null` when the service has no MCP endpoint (see `Service.mcpUrl`). */
  mcpUrl: string | null;
  /**
   * The product page's connect card, as a path on the platform's own origin
   * (`/products/{slug}#connect`), so a console resolves it against the URL it
   * read the list from and a self-hosted platform needs no rebuild. `null`
   * when there is no MCP endpoint to connect to.
   */
  connectPath: string | null;
}

/** The body of `SERVICE_DIRECTORY_PATH`. */
export interface ServiceDirectory {
  version: typeof SERVICE_DIRECTORY_VERSION;
  services: ServiceDirectoryEntry[];
}

/**
 * The service list as it is published for other consoles.
 *
 * Filtered by `servicesIn` here as well, so an unsafe entry is dropped even
 * when a caller passes a list that has not been through it. Each field is
 * picked by name, so the marketing copy (and anything added to `Service`
 * later) never leaks into a public contract by accident. An absent URL is
 * `null` rather than a missing key, so every entry has the same five keys.
 */
export function serviceDirectory(services: readonly Service[] = SERVICES): ServiceDirectory {
  return {
    version: SERVICE_DIRECTORY_VERSION,
    services: servicesIn(services).map((service) => ({
      slug: service.slug,
      name: service.name,
      consoleUrl: service.consoleUrl ?? null,
      mcpUrl: service.mcpUrl ?? null,
      connectPath: service.mcpUrl ? `/products/${service.slug}#connect` : null
    }))
  };
}
