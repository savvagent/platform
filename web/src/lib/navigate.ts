import { goto } from '$app/navigation';

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
