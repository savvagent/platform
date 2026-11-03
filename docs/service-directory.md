# The service list: `GET /services/v1.json`

Every Savvagent web console's header has a service switcher. The platform publishes the
list of services it shows, so adding a service or moving a console changes one file in
this repository and no other console needs a rebuild. `@savvagent/console-ui` is the
intended reader.

```
GET https://savvagent.com/services/v1.json
```

On a self-hosted platform it is `/services/v1.json` on that platform's origin: the
`platformUrl` every console already gets from its own session.

## Response

```json
{
  "version": 1,
  "services": [
    {
      "slug": "tower",
      "name": "Savvagent Tower",
      "consoleUrl": "https://tower.savvagent.com",
      "mcpUrl": "https://tower.savvagent.com/mcp",
      "connectPath": "/products/tower#connect"
    },
    {
      "slug": "flags",
      "name": "Savvagent Flags",
      "consoleUrl": null,
      "mcpUrl": "https://flags.savvagent.com/mcp",
      "connectPath": "/products/flags#connect"
    },
    {
      "slug": "cxp",
      "name": "Savvagent CXP",
      "consoleUrl": "https://cxp.savvagent.com/console/",
      "mcpUrl": "https://cxp.savvagent.com/mcp",
      "connectPath": "/products/cxp#connect"
    }
  ]
}
```

| Field                    | Type             | Meaning                                                                                                                                                                                                                                                 |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`                | `1`              | The shape below. Always equal to the `v1` in the path.                                                                                                                                                                                                  |
| `services`               | array            | In the order the header shows them.                                                                                                                                                                                                                     |
| `services[].slug`        | string           | `^[a-z0-9-]+$`. Stable: use it as a key, and to tell which entry is the current console.                                                                                                                                                                |
| `services[].name`        | string           | Product name. Never translated, so render it as is.                                                                                                                                                                                                     |
| `services[].consoleUrl`  | string \| `null` | Where the service's web console starts: an origin with no trailing slash (`https://tower.savvagent.com`) or a full URL under a path (`https://cxp.savvagent.com/console/`). Use it as given. `null` when the service has no web console.                |
| `services[].mcpUrl`      | string \| `null` | The MCP endpoint an assistant is pointed at; also the service's OAuth resource URI. `null` when the service has none.                                                                                                                                   |
| `services[].connectPath` | string \| `null` | The product page's connect card, which says how to add the service to an AI assistant: a path on the platform's origin, so resolve it against the list's own URL (`new URL(connectPath, listUrl)`). The default-language page. `null` when `mcpUrl` is. |

Every entry has all five keys. Every URL is `https://`. Every entry has at least one of
`consoleUrl` and `mcpUrl`. The platform enforces all of this (`servicesIn` in
`web/src/lib/services.ts`) before it writes the file, so a reader does not have to,
though a header should still only render `https:` links.

**A service with no console** (`consoleUrl: null`) is linked to its `connectPath`,
resolved against the list's URL. That is the platform's own header's rule (`serviceLink`
in `web/src/lib/services.ts`); a console never builds the platform's page paths itself.

## Headers

| Header                        | Value                 | Why                                                                                                                                                                                                                                                      |
| ----------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Type`                | `application/json`    |                                                                                                                                                                                                                                                          |
| `Access-Control-Allow-Origin` | `*`                   | Public data with no credential. `*` is the one value a browser refuses to combine with credentials, so it cannot become a cookie-bearing read, and it needs no second list of console origins to keep in step (nor `Vary: Origin`, which splits caches). |
| `Cache-Control`               | `public, max-age=300` | A change reaches every console within five minutes of a platform deploy. Same lifetime as `GET /api/plans`.                                                                                                                                              |
| `Last-Modified`               | the build's file time | From the Rust server, so revalidation can be a `304`.                                                                                                                                                                                                    |
| `X-Content-Type-Options`      | `nosniff`             |                                                                                                                                                                                                                                                          |

Fetch it with a plain `GET` and no credentials and no custom request headers:

```ts
const res = await fetch(new URL("/services/v1.json", platformUrl));
```

That is a CORS simple request, so there is no preflight. The endpoint answers `GET` and
`HEAD` only; a preflight `OPTIONS` is not served. Do not send `credentials: 'include'`:
with `Access-Control-Allow-Origin: *` the browser refuses the response.

A header should not fail to render because the list did not load: keep the last list it
had, or show the switcher without other services.

## Versioning

- **Adding a field is not a new version.** Ignore keys you do not know.
- **Removing or renaming a field, or changing what one means, is.** The platform then
  publishes `/services/v2.json` beside v1, and keeps v1 until every pinned
  `@savvagent/console-ui` has moved.

## Where it comes from

The file is prerendered at build time (`web/src/routes/services/v1.json/+server.ts`) from
`SERVICES` in `web/src/lib/services.ts`: the same list the platform's own header and
marketing pages render, so there is one list. The build fails if the file is missing, is
not JSON, or lists different products (`web/scripts/check-build.mjs`).

The CORS and cache headers are added by whatever serves the bundle: the Rust server
(`PUBLIC_DATA` in `crates/savvagent-platform-server/src/lib.rs`), which is how
savvagent.com runs on Fly, and the optional Cloudflare Worker (`PUBLIC_DATA` in
`web/worker/index.ts`). The two lists must match.
