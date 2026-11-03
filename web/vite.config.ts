import { paraglideVitePlugin } from '@inlang/paraglide-js';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * In production the console and the API are one origin: `savvagent-platform-server` serves
 * the built bundle beside `/api`, `/oauth`, `/sso` and `/.well-known`, and in the
 * Cloudflare deployment a Worker does the same job (`worker/index.ts`).
 *
 * Development has to reproduce that, not merely approximate it. The session
 * cookie carries the `__Host-` prefix, which browsers refuse to store unless
 * the cookie has `Path=/` and **no `Domain`** — so it is bound to whatever
 * origin set it and cannot be sent to a different port. A dev server that
 * pointed `fetch` at `http://localhost:8080` would never send the session, and
 * CORS could not rescue it. Proxying instead keeps every request on the Vite
 * origin, where the cookie lives.
 *
 * `secure: false` only tells the proxy not to verify an upstream TLS
 * certificate; it has nothing to do with the cookie's `Secure` attribute, which
 * browsers honour on `localhost` regardless.
 */
const api = process.env.SAVVAGENT_API_ORIGIN ?? 'http://127.0.0.1:8080';

const proxied = {
  target: api,
  changeOrigin: false,
  secure: false
};

/**
 * Messages are compiled, not looked up at runtime.
 *
 * `emitTsDeclarations` is not optional. Without it Paraglide emits no `.d.ts`
 * at all and a misspelled key type-checks clean, then renders the base locale's
 * string in every language — which is exactly the failure `npm run check` is
 * supposed to catch before a customer does. With it, `m.no_such_key()` is a
 * `TS2339`.
 *
 * The output is generated and git-ignored, so it is also in `.prettierignore`;
 * a fresh compile would otherwise fail `npm run lint` on code no human wrote.
 */
const paraglide = paraglideVitePlugin({
  project: './project.inlang',
  outdir: './src/lib/paraglide',
  emitTsDeclarations: true
});

/**
 * SvelteKit's own options. Since SvelteKit 3 they are passed to the
 * `sveltekit()` plugin here; there is no `svelte.config.js` any more.
 *
 * The console is a single-page app, and that is a security decision before it
 * is an architectural one.
 *
 * The session is an `HttpOnly`, `__Host-`-prefixed cookie bound to one origin.
 * A SvelteKit server rendering these pages would have to hold that credential
 * to fetch on the user's behalf — a second process with the keys to every
 * console session, for pages that are behind a login and cannot be cached
 * anyway. Building to static files that `savvagent-platform-server` serves on the same origin
 * as `/api` keeps the cookie in exactly one place: the browser.
 *
 * The public marketing pages are the exception, and a safe one: they read no
 * session, so they are prerendered to `.html` files at build time
 * (`src/routes/(marketing)`), while the console stays browser-only
 * (`src/routes/(console)`).
 *
 * `fallback` is what makes deep links into the console work. Its routes are
 * resolved by the client router, so the server answers any path with no
 * prerendered file with the same shell — `/o/acme/members` typed into the
 * address bar has to load the app, not a 404 from a static file server.
 *
 * The shell is `200.html`, not `index.html`, because `index.html` is now the
 * prerendered landing page; writing the fallback there would overwrite it.
 * `savvagent-platform-server` and the Worker both serve `200.html` for unmatched
 * paths, with an `X-Robots-Tag: noindex` header, and the server refuses to
 * start without it.
 *
 * TypeScript's `strict` is set in `tsconfig.json`, which extends the generated
 * `$app/tsconfig`. The `typescript.config` hook that used to force it here is
 * deprecated in SvelteKit 3, and the generated base sets `strict` itself.
 *
 * `version.pollInterval` is 0, as it was by default before SvelteKit 3 (which
 * polls hourly). Nothing here reads `updated` from `$app/state`, so polling
 * would only add a request an hour for every open tab.
 */
const kit = sveltekit({
  preprocess: vitePreprocess(),
  adapter: adapter({ fallback: '200.html', strict: false }),
  version: { pollInterval: 0 }
});

export default defineConfig({
  plugins: [paraglide, tailwindcss(), kit],
  // Vitest resolves package `exports` with a "node" condition by default,
  // which is what mounting a Svelte component needs to avoid — Svelte's
  // package exports a server-only build under "default", and only the
  // "browser" condition resolves to the client build that has `mount`.
  // Scoped to `process.env.VITEST` so dev/build keep their normal resolution.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  server: {
    port: 5173,
    proxy: {
      '/api': proxied,
      '/oauth': proxied,
      '/sso': proxied,
      '/.well-known': proxied
    }
  }
});
