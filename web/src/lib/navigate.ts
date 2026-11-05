import { goto, type BeforeNavigate } from '$app/navigation';

import { baseLocale } from '#lib/paraglide/runtime.js';

/**
 * Go to a same-origin path through the client router, or load it fully if the
 * router cannot.
 *
 * For destinations that come from the URL (`?next=`), which this app does not
 * choose: since SvelteKit 3, `goto` rejects a path with no matching route
 * instead of rendering the error page, so a stale or mistyped `next` would
 * leave someone who just signed in on the sign-in page, told it failed. A full
 * load hands the path to the server, which answers it as it would a typed-in
 * address. The caller must already have checked that `to` is a same-origin
 * path (`safeNext`).
 */
export async function gotoOrLoad(to: string): Promise<void> {
  try {
    await goto(to, { replace: true });
  } catch {
    location.assign(to);
  }
}

/** Which half of the app a route id belongs to, from its route group. */
function half(routeId: string | null): 'console' | 'marketing' | undefined {
  if (routeId?.startsWith('/(console)/')) return 'console';
  if (routeId?.startsWith('/(marketing)/')) return 'marketing';
  return undefined;
}

/**
 * Whether a navigation leaves the console for a marketing page, or the other
 * way round.
 *
 * Such a navigation must be a full document load: the console resolves its
 * locale from the account at boot, and a marketing page pins it to its URL,
 * each with a process-wide getter. A client-side hop would carry the wrong
 * one across. The app's own links say so with `data-sveltekit-reload`; the
 * shared shell's links (the service switcher's connect cards, the footer's
 * home link) cannot, so each layout's `beforeNavigate` asks this and turns a
 * crossing into `location.assign`.
 *
 * An unknown route, or one in neither group, is not a crossing: SvelteKit
 * already loads a path it cannot route in full.
 */
export function crossesHalves(from: string | null, to: string | null): boolean {
  const a = half(from);
  const b = half(to);
  return a !== undefined && b !== undefined && a !== b;
}

/**
 * The `beforeNavigate` both layouts register: a client-side navigation that
 * would carry the wrong locale getter becomes a full document load.
 *
 * Two cases. Crossing between the console and the marketing pages
 * ([`crossesHalves`]). And, between two marketing pages, a change of language:
 * a marketing page pins its locale to its URL once, at the top of its layout,
 * and that layout stays mounted across a client-side navigation, so `/es`
 * followed to `/pricing` would render English URLs in Spanish. The app's own
 * links that change language carry `data-sveltekit-reload`; the shared
 * shell's (the footer's home link, a service's connect card, both unprefixed)
 * cannot, so this catches them.
 *
 * `willUnload` means the browser is already loading a new document, so there
 * is nothing to do. The full load always adds a history entry: `BeforeNavigate`
 * does not say whether the cancelled navigation would have replaced one, so a
 * redirect that crosses (a `?next=` pointing at a marketing page) leaves the
 * redirecting page in the history.
 */
export function fullLoadGuard({ from, to, cancel, willUnload }: BeforeNavigate): void {
  if (willUnload || !from || !to) return;
  const crossing = crossesHalves(from.route.id, to.route.id);
  const relanguage =
    half(from.route.id) === 'marketing' &&
    half(to.route.id) === 'marketing' &&
    (from.params?.lang ?? baseLocale) !== (to.params?.lang ?? baseLocale);
  if (!crossing && !relanguage) return;
  cancel();
  location.assign(to.url.href);
}
