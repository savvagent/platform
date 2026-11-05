/**
 * What the platform hands `@savvagent/console-ui`'s shell beyond a session:
 * its own origin, and its own service list.
 */

import {
  checkPlatformUrl,
  parseServiceDirectory,
  type ServiceDirectory as ShellServiceDirectory
} from '@savvagent/console-ui';

import { SERVICE_DIRECTORY_PATH, serviceDirectory } from './services';
import { SITE_ORIGIN } from './site';

/**
 * The origin to hand the shared shell as `platformUrl`: this page's own, or
 * the production origin when the shell would refuse it.
 *
 * The shell accepts https, or http on loopback, and throws on anything else,
 * which would leave a self-hosted copy served over plain http with a blank
 * page rather than a working one. Such a copy cannot sign anyone in (the
 * session cookie and passkeys need a secure context), so its header then
 * links to the production site; it says so once in the console.
 */
export function shellOrigin(origin: string): string {
  try {
    return checkPlatformUrl(origin).origin;
  } catch {
    console.warn('console-ui needs https (or http on localhost); the header links to', SITE_ORIGIN);
    return SITE_ORIGIN;
  }
}

/**
 * The service list for the shell's switcher, built from `SERVICES`.
 *
 * Other consoles fetch it from `/services/v1.json`; the platform builds that
 * file from the same list, so it hands the header the list directly. That
 * means no request, and a prerendered marketing page carries the real
 * switcher rather than a loading skeleton. It goes through the package's own
 * parser, so it meets the same checks a fetched list would.
 */
export function shellServices(platformUrl: string): ShellServiceDirectory {
  return {
    services: parseServiceDirectory(serviceDirectory()),
    listUrl: new URL(SERVICE_DIRECTORY_PATH, platformUrl)
  };
}
