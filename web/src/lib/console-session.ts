/**
 * The platform's session, in the shape the shared shell renders.
 *
 * `@savvagent/console-ui`'s header takes a `ConsoleSession`; every console maps
 * its own session into one. Here that is `/api/me`, whose memberships carry the
 * org's id, slug and name, while the current org comes from the `/o/[org]`
 * route. The platform is its own `platformUrl`.
 */

import { checkPlatformUrl, type ConsoleSession } from '@savvagent/console-ui';

import { SITE_ORIGIN } from './site';
import type { Me } from './types';

export function toConsoleSession(
  me: Me,
  orgSlug: string | undefined,
  platformUrl: string
): ConsoleSession {
  const orgs = me.orgs.map((m) => ({
    id: m.orgId,
    slug: m.orgSlug,
    name: m.orgName,
    role: m.role
  }));
  const { id, email, name, label } = me.user;
  return {
    // The shell names a user by name, then email, then id. An account with
    // neither name nor address is known by its generated label everywhere
    // else in the console, so that stands in for the name here too.
    user: { id, email, name: name ?? (email ? null : label) },
    orgs,
    currentOrg: orgs.find((o) => o.slug === orgSlug) ?? null,
    platformUrl
  };
}

/**
 * The origin to hand the shared shell as `platformUrl`: this page's own, or
 * the production origin when the shell would refuse it.
 *
 * The shell accepts https, or http on loopback, and throws on anything else,
 * which would leave a self-hosted copy served over plain http with a blank
 * page rather than a working one. (Such a copy cannot sign anyone in either,
 * since the session cookie and passkeys need a secure context, but it should
 * still render and say so.)
 */
export function shellOrigin(origin: string): string {
  try {
    return checkPlatformUrl(origin).origin;
  } catch {
    return SITE_ORIGIN;
  }
}
