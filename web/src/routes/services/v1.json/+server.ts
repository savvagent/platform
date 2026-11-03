import { serviceDirectory } from '#lib/services.js';

import type { RequestHandler } from './$types';

/**
 * `/services/v1.json`: the list of Savvagent services, for every console's
 * header. The contract is `docs/service-directory.md`.
 *
 * Prerendered, like `/sitemap.xml`: the file is written at build time from the
 * same `SERVICES` this site's header and product pages render, so there is one
 * list and nothing at runtime to keep in step with it. The `Cache-Control` and
 * CORS headers that let other origins read it are not set here, because a
 * prerendered response's headers are thrown away with the response: the Rust
 * server (`public_data` in `crates/savvagent-platform-server/src/lib.rs`) and
 * the Worker (`PUBLIC_DATA` in `worker/index.ts`) add them when they serve the
 * file.
 */
export const prerender = true;

export const GET: RequestHandler = () =>
  new Response(`${JSON.stringify(serviceDirectory(), null, 2)}\n`, {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
