# The platform console on `@savvagent/console-ui`

> **Status:** IN PROGRESS
> **Issue:** savvagent/platform#158, part of #154

## Brief

Issue #158, "Adopt @savvagent/console-ui and shadcn-svelte in the platform console". Its
acceptance criteria, verbatim:

1. The console and marketing layouts use the shared header, footer and theme.
2. The hand-written Button, Card, Alert, Field and similar components are replaced by
   shadcn-svelte equivalents from the package.
3. No visual regressions in the console or the marketing pages (screenshot check in light and
   dark).

The issue's comment named two blockers (savvagent/console-ui#6 and #7). Both shipped in
`@savvagent/console-ui@0.2.0`: a signed-out `ConsoleHeader` with `platformUrl`, `nav` and
`signedOut`; `useLocale` for prerendered pages; `ui/alert` with `default`, `destructive`,
`warning` and `success`; `ui/field`; and `warning` and `success` theme tokens. The comment's
CI and Docker requirements are in scope here. The package's Actions access for this repo has
already been granted.

## Premise corrections

- **"No visual regressions" cannot mean "pixel-identical".** The console today is dark-only, with
  its own palette (`canvas`, `surface`, `ink`, `accent` and so on in `web/src/app.css`). AC1 swaps
  that palette for the shared one, which changes every colour on purpose, and adds a light theme
  that does not exist today. So AC3 is read as: every page renders the same content, layout and
  states as before, and nothing is lost, clipped, overlapping, unreadable or broken in either
  theme. The colours and component shapes may change to the shared ones. The screenshot check
  compares before and after side by side, plus a diff of each page's visible text.
- **The platform's palette names collide with shadcn's.** `text-muted` is a text grey here but a
  background in the shared theme, and `accent` is the brand cyan here but a hover background
  there. Importing the theme alone would make most secondary text invisible. Every palette
  utility has to be rewritten, not only the components.
- **Locale state must be single.** `web/src/lib/locale.ts` is a copy of the package's
  `locale.ts`, with the same `otto.locale` cache key. Each copy holds its own "current locale", and
  the shell's language picker reads the package's. Running both would leave the picker showing
  English in a Spanish console. The platform's module becomes a re-export of the package's.

## Assumptions

- **Run Profile.** The repo has no `CLAUDE.md`, `AGENTS.md` or `## Development Workflow` section.
  Everything below was found in `README.md`, `web/README.md`, `.github/workflows/ci.yml`,
  `docs/deploy/*.md` and recent merged PRs (#161, #162):
  - slug `savvagent/platform`, trunk `main`, tracker GitHub
  - branch `<type>/<issue>-<slug>`; Conventional Commits, and the PR title is checked by
    `amannn/action-semantic-pull-request`, scope `web` here; squash merge,
    `gh pr merge --squash --delete-branch`
  - PR body: `Fixes #158` and `Part of #154`
  - gates for `web/`: `npm ci`, `npm run check`, `npm run lint`, `npm test`, `npm run build`
    (CI `web` job). Rust: `cargo fmt --all -- --check`, `cargo clippy --all-targets -- -D
warnings`, `cargo test --workspace` (Postgres). `docker-build` builds the image. This change
    touches no Rust.
  - design docs: `committed`, with specs in `docs/specs/` and plans in `docs/plans/`
  - deploy: `ci-auto` on release. release-please keeps a `chore: release X.Y.Z` PR open, and
    merging it deploys to Fly (`flyctl deploy --remote-only -a otto-platform`). The optional
    Cloudflare Worker is deployed by hand (`npm run deploy`), so no Worker build runs in CI.
  - verify: `https://savvagent.com` serves the new bundle. `/readyz` and the release's image ref
    are on Fly.
  - human-only: secrets, DNS, new paid resources (Rob)
- **Dark mode follows the operating system.** The package makes dark mode a `.dark` class and
  leaves the policy to each console. The platform has been dark-only. The issue asks for a light
  and dark check, so both have to exist, and following `prefers-color-scheme` is the policy that
  needs no new setting. A blocking `static/theme.js` (not inline, so a `script-src 'self'` policy
  still holds) sets the class before first paint and follows changes. There is no in-app toggle,
  which would be a new feature. Without JavaScript a page renders in the light theme, where it
  used to be dark. Its content is unchanged.
- **`service="platform"`.** The platform is not an entry in the service list. The package README
  uses `service="platform"` for its own example, so the header's service switcher is labelled
  "platform" until a service is chosen. Changing that label is the package's concern.
- **Spinners and `pending`.** The package's Button has no `pending` state. Call sites pass
  `disabled={disabled || pending}` and render a small `Spinner` (extracted from `Loading`) as the
  first child. `Spinner` is an icon, not a replacement Button.
- **Native `<select>` stays.** The package's `Select` is a bits-ui listbox with a different
  keyboard model and markup. Selects keep the native element, styled like `Input` through one
  `.sav-select` class in `app.css`.
- **Platform-specific composites stay.** `Empty`, `Loading`, `CopyField`, `Meter`, `Logo`,
  `ServiceLink`, `BudgetForm`, `BudgetAlerts`, `PaymentRequiredNotices`, `Seo` and the marketing
  cards are not shadcn components. `ServiceLink`'s `nav` variant was used only by the old
  console header, so it goes and the `card` variant stays. They are restyled on the shared tokens and built from the
  package's parts where one fits (`CopyField` uses `Button`, the marketing cards use `Card`).
- **The language links stay on marketing pages.** The header's picker needs JavaScript, and
  crawlers and no-script readers need `<a hreflang>` links. A one-row language `<nav>` sits
  directly above the shared footer. `check-build`'s end-of-page locale marker now looks for it by
  a `data-languages` attribute instead of inside `<footer>`.

## Goal and success criteria

The platform's console and marketing pages render inside the shared Savvagent shell, look like
the other consoles, and lose no content or behaviour.

- Both layouts render `ConsoleHeader` and `ConsoleFooter` from `@savvagent/console-ui@0.2.0`
  (exact pin), and `app.css` imports `@savvagent/console-ui/theme.css`.
- `web/src/lib/components/{Alert,Button,Card,Field,LinkButton}.svelte` and `button.ts` are
  deleted, and nothing references `sav-card`, `sav-input` or the old palette utilities.
- `npm ci` authenticates to GitHub Packages in CI's `web` job, the image's `console` stage (a
  BuildKit secret) and the Fly deploy (`--build-secret`). The token is never a build arg and is
  never left in a layer.
- The four `web/` gates and `docker build` pass.
- Before and after screenshots of 20 pages, in light and dark, show the same content and states,
  with no broken layout. Signed out: `/`, `/pricing`, `/products/tower`, `/cli`, `/es`,
  `/es/pricing`, `/login`, `/signup`. Signed in (an owner of `acme` who is also a member of
  `globex`): `/` again, `/o/acme` and its `members`, `teams`, `sso`, `usage` (with one service's
  price unreadable), `budgets`, `billing` and `audit` pages, `/settings`, `/settings/activity`
  and `/orgs/new`.

## Scope

**In:** `web/` (dependencies, `.npmrc`, theme, both layouts, every page and component that uses a
replaced component or an old palette utility, tests, `check-build`), `Dockerfile`,
`.github/workflows/ci.yml`, and the docs that describe installing or building the console
(`web/README.md`, `docs/deploy/fly.md`, `docs/deploy/cloudflare.md`).

**Out:** any change to `@savvagent/console-ui` itself (including the `--destructive` contrast,
savvagent/console-ui#10), a theme toggle, changes to the Rust server, the Worker's routing, new
pages, and copy changes beyond what a component swap needs.

## Architecture

### Dependencies and auth

- `web/package.json`: `"@savvagent/console-ui": "0.2.0"`, and `tailwindcss` and
  `@tailwindcss/vite` to `^4.3.4` (the package's peer range).
- `web/.npmrc`: `@savvagent:registry=https://npm.pkg.github.com` and
  `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`. It holds no secret. npm leaves an unset
  variable unexpanded, and only `npm ci` and `npm install` contact the registry.
- CI `web` job: `permissions: { contents: read, packages: read }`, and `NODE_AUTH_TOKEN: ${{
secrets.GITHUB_TOKEN }}` on the `npm ci` step only.
- CI `docker-build` job: `permissions: { contents: read, packages: read }`, and
  `docker/build-push-action` with `secrets: npm_token=${{ secrets.GITHUB_TOKEN }}`.
- `Dockerfile` `console` stage: copy `web/.npmrc` with the manifests, then
  `RUN --mount=type=secret,id=npm_token,required=true NODE_AUTH_TOKEN="$(cat
/run/secrets/npm_token)" npm ci`. The variable exists only for that command, the secret mount is
  never written to a layer, and `.npmrc` carries only the placeholder. A local
  `docker build` passes `--secret id=npm_token,env=NODE_AUTH_TOKEN`.
- CI `deploy` job: `permissions: { contents: read, packages: read }`, and
  `flyctl deploy --remote-only -a otto-platform --build-secret npm_token=${{
secrets.GITHUB_TOKEN }}`. The token is the job's own short-lived one, with read-only packages
  and contents.

### Theme

`web/src/app.css` becomes `@import 'tailwindcss'; @import '@savvagent/console-ui/theme.css';`,
plus the focus-ring rule (now `var(--color-ring)`), `.sav-mono`, `.sav-kicker` (the small
uppercase heading that `.sav-label` was when it labelled no control) and `.sav-select`. The
`@theme` palette is removed. The utilities are rewritten as follows:

| Old                                                 | New                                                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg-canvas`                                         | `bg-background`                                                                                                                                             |
| `bg-surface`                                        | `bg-card`                                                                                                                                                   |
| `bg-raised`                                         | `bg-muted`                                                                                                                                                  |
| `border-edge`, `bg-edge`, `divide-edge`             | `border-border`, `bg-border`, `divide-border`                                                                                                               |
| `text-ink`                                          | `text-foreground`                                                                                                                                           |
| `text-muted`, `text-faint`                          | `text-muted-foreground`                                                                                                                                     |
| `text-accent`, `border-accent`, `decoration-accent` | `text-primary`, `border-primary`, `decoration-primary`. An inline text link also gets `underline underline-offset-4`, since `primary` is not a link colour. |
| `bg-accent text-accent-ink`                         | `bg-primary text-primary-foreground`                                                                                                                        |
| `*-ok`                                              | `*-success`                                                                                                                                                 |
| `*-warn`, `*-busy`                                  | `*-warning`                                                                                                                                                 |
| `*-bad`                                             | `*-destructive`                                                                                                                                             |

Opacity modifiers carry over (`border-edge/60` becomes `border-border/60`). `app.html` drops
`bg-canvas text-ink` from `<body>` (the theme styles `body`) and loads
`<script src="%sveltekit.assets%/theme.js"></script>` in `<head>`. `static/theme.js` adds or
removes `dark` on `<html>` from `matchMedia('(prefers-color-scheme: dark)')`, and again on its
`change` event.

### Components

| Hand-written (deleted)                     | Package replacement                                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Alert tone=error` (also the default)      | `Alert variant="destructive"`                                                                                                                      |
| `Alert tone=warn` / `ok` / `info`          | `variant="warning"` / `"success"` / `"default"`                                                                                                    |
| `Button tone=primary` / `quiet` / `danger` | `Button variant="default"` / `"outline"` / `"destructive"`; `pending` becomes `disabled` plus `Spinner`                                            |
| `LinkButton href tone size`                | `Button href variant size` (`md` is `default`; marketing `lg` CTAs add `class="h-10 px-5"`)                                                        |
| `Card title description actions`           | `Card` > `CardHeader` (`CardTitle`, `CardDescription`, `CardAction`) and `CardContent`                                                             |
| `Field label hint` (wrapping label)        | `Field` > `FieldLabel for={id}`, the control with `id`, `FieldDescription`. Ids from `$props.id()`, suffixed with the item key inside an `{#each}` |
| `input.sav-input`, `textarea.sav-input`    | `Input`, `Textarea`                                                                                                                                |
| `select.sav-input`                         | native `select.sav-select`                                                                                                                         |

The package's `Alert` keeps the old roles: `destructive` is `role="alert"` and the rest are
`role="status"`.

### Locale

`#lib/locale.ts` re-exports `LOCALE_NAMES`, `SUPPORTED`, `applyLocale`, `currentLocale`,
`detect`, `isSupported`, `needsReload`, `readCached`, `reconcile`, `resolveAtBoot`, `useLocale`,
`writeCached` and the `Locale` and `LocaleStore` types from `@savvagent/console-ui`. Its
duplicated implementation and tests go. One test remains: the package's `SUPPORTED` equals the
platform's Paraglide `locales`, since the server validates `PATCH /api/me` against the
platform's list.

- Console layout: `resolveAtBoot(overwriteGetLocale)`, with the platform runtime's
  `overwriteGetLocale`, then `reconcile(session.me?.user.locale)` as today.
- Marketing layout: `useLocale(data.lang, overwriteGetLocale)` at the top of the script, in place
  of `overwriteGetLocale(() => data.lang)`. Svelte's async server rendering stays off, as the
  package requires. A comment in `vite.config.ts` says why.

### Session mapping

New `#lib/console-session.ts`:

```ts
export function toConsoleSession(
  me: Me,
  orgSlug: string | undefined,
  platformUrl: string,
): ConsoleSession;
```

It maps `me.orgs` to `{ id: orgId, slug: orgSlug, name: orgName, role }` and sets `currentOrg` by
slug. `user` is `{ id, email, name: name ?? (email ? null : label) }`, so the account menu shows
the generated label when there is neither name nor email, as the old header did.

### Console layout (`(console)/+layout.svelte`)

```svelte
<ConsoleHeader
  session={session.me ? toConsoleSession(session.me, page.params.org, origin) : undefined}
  platformUrl={origin}
  {services}
  service="platform"
  onSignOut={signOut}
  onLocaleChange={changeLocale}
>
  {#snippet brand()}<a href="/home">Logo + "Savvagent"</a>{/snippet}
  {#snippet nav()}{#if session.signedIn}<a href="/orgs/new" title={m.nav_create_org()}>+</a>{/if}{/snippet}
  {#snippet signedOut()}{#if session.ready}<Button href="/login" variant="ghost" size="sm">{m.nav_sign_in()}</Button>{/if}{/snippet}
</ConsoleHeader>
…
<ConsoleFooter platformUrl={origin} links={[{ label: m.nav_api_reference(), href: '/api/openapi.json' }, { label: `v${APP_VERSION}`, href: releaseUrl }]} />
```

- `origin` is `shellOrigin(location.origin)` and `services` is `shellServices(origin)`, both in
  `#lib/shell.ts`. The first falls back to the production origin when the shell would refuse the
  page's (plain http off loopback). The second hands the header the platform's own service list
  instead of letting it fetch `/services/v1.json`; the marketing header does the same, so the
  prerendered pages carry the real switcher.
- `brand` keeps `/home` as the logo's target. The package's default goes to `/`, which is the
  marketing landing page.
- `changeLocale(next)`: signed in, `PATCH /api/me { locale: next }` first and then
  `applyLocale(next)`. A failure sets a `localeError` shown as a destructive `Alert` above the
  page and rethrows, so the picker keeps its old value. The picker calls the handler with
  `void`, so the rejection is also logged as unhandled, which is accepted: it is a real failure. Signed out:
  `applyLocale(next)`. This is the same save-then-reload rule the settings page follows.
- **Crossing between the halves.** Shell links are rendered by the package and cannot carry
  `data-sveltekit-reload`: the service switcher's connect cards (`/products/flags#connect`) and
  the footer's copyright link (`/`). Both layouts register `fullLoadGuard` (`#lib/navigate.ts`),
  which cancels a client-side navigation into the other group, or between two marketing
  languages (those shell links are unprefixed), and does `location.assign` instead.
  The rule is `crossesHalves(fromRouteId, toRouteId)` in `#lib/navigate.ts`, which is tested. The
  existing `data-sveltekit-reload` links stay.
- `releaseUrl` is `https://github.com/savvagent/platform/releases/tag/v${APP_VERSION}`.

### Marketing layout

`MarketingHeader.svelte` wraps `ConsoleHeader platformUrl={platformUrl} service="platform"`:

- `brand`: Logo and "Savvagent", linking to `localizedPath(lang, '/')`.
- `nav`: today's product, pricing and CLI links (from `md` up) and the small-screen `<details>`
  menu, unchanged in behaviour.
- `signedOut`: "Sign in" (while `!session.signedIn`) and `ConsoleLink size="sm"`. No session is
  ever passed, so marketing pages never render the org switcher or account menu, whose links
  would cross into the console.
- `onLocaleChange(next)`: `writeCached(next)`, then `location.assign(localizedPath(next,
basePath))`.
- `platformUrl` is `$state(SITE_ORIGIN)` and is set to `location.origin` in `onMount`. The
  prerendered file names the production origin. A self-hosted copy repoints after hydration
  (Svelte keeps a server-rendered `href` through hydration, so it cannot be a `browser ? … : …`
  expression).

`MarketingFooter.svelte` renders the language `<nav data-languages aria-label=…>` row, then
`ConsoleFooter platformUrl={platformUrl}` with links: API reference
(`${platformUrl}/api/openapi.json`, absolute so the prerender crawler, whose origin is not
savvagent.com, does not follow it into a 404), the contact address (`mailto:`), and the version.

## Invariants impact

- **No credential on a `GET`; the session cookie stays in the browser.** Unchanged. Marketing pages
  still read no session at build time.
- **Every link that crosses the halves is a full document load.** Held by the existing
  `data-sveltekit-reload` links, plus the new `beforeNavigate` guard for links rendered by the
  shell.
- **Each prerendered page is in its URL's language, top to bottom.** `useLocale` is called
  synchronously at the top of the marketing layout. `check-build` still checks the skip link and
  the language nav, and a render test checks that the shell's own strings follow `es`.
- **`200.html` is in the bundle; prerendered pages are indexable; console pages are `noindex`.**
  Untouched. `check:build` enforces them.
- **Roles decide what is shown, never what is allowed.** Untouched.

No public interface changes: no route, API or wire field. The new static file `/theme.js` is
additive.

## Migration

None.

## Out-of-band

- Package Actions access for `savvagent/platform`: done by Rob before this run.
- Building `web/` or the image now needs a GitHub token that can read `@savvagent/console-ui`
  (`docker build --secret id=npm_token,env=NODE_AUTH_TOKEN .`). The package is private to the
  `savvagent` org and `"license": "UNLICENSED"`, while this repo is public and AGPL-3.0, so until
  the package is made public under a compatible licence nobody outside the org can build the
  console from source. That is Rob's decision (package visibility and licence), handed off; the
  docs (`web/README.md`, `docs/deploy/fly.md`, `docs/deploy/cloudflare.md`) say so meanwhile.
- No new secret: `GITHUB_TOKEN` is the workflow's own.
- Recurring cost: none expected. Installs inside Actions are free. The Fly remote builder pulls
  the package from outside Actions about once per release, and that transfer counts against the
  org's GitHub Packages allowance. The package is a few hundred kilobytes.

## Error handling and edge cases

- Service list fetch fails (no server in `vite dev`, or an outage): the header shows its disabled
  "unavailable" state. This is the package's behaviour.
- A `PATCH /api/me` locale failure shows a destructive alert and does not reload.
- Signed-out console pages (`/login`, `/signup`, `/claim`) render the signed-out header with "Sign
  in" only once the session has resolved, so a signed-in user never sees it flash.
- `useLocale` throws for an unsupported locale. The `lang` param matcher already refuses anything
  else, so the throw cannot be reached from a URL.

## Testing approach

- Unit tests (vitest, next to the module): `toConsoleSession`, `crossesHalves`, and the
  locale-list equality.
- Render tests (existing `*.render.test.ts`): the console layout (signed-in and signed-out
  header, the `/home` brand link, the footer), the marketing header and footer (localized shell
  strings in `es`, links, the signed-in swap of `ConsoleLink`), and the pages whose tests query
  the old markup. Each is updated to assert behaviour (roles, names, hrefs), not old class names.
- `check-build.test.mjs`: the new language-nav marker.
- `npm run check`, `lint`, `test`, `build`. Then `docker build` with the secret locally, and
  `docker history` to show no layer carries the token.
- Screenshots: a scratch harness serves `build/`, mocks `/api`, and shoots 20 pages in light and
  dark for the `main` build and for this branch. Each pair is compared side by side, with a diff
  of each page's `innerText`. Kept outside the repo.

## Risks and open questions

- Marketing pages: `platformUrl` changes from the production origin to `location.origin` on
  mount, so the header fetches the service list a second time. The two are the same origin on
  savvagent.com. On a preview or self-hosted copy the first fetch is cross-origin, which the
  list's `Access-Control-Allow-Origin: *` allows.
- The shadcn sizes are more compact than the old buttons (`h-8`). Pages may look denser. This is
  accepted as the shared look, but any clipping or wrapping it causes is fixed.
- `--destructive` text contrast is low in dark mode (savvagent/console-ui#10). Not worked around
  here.
- A Fly remote build now depends on GitHub Packages being reachable at deploy time.
