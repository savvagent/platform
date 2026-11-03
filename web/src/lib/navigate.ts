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
