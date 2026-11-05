# Console on `@savvagent/console-ui` Implementation Plan

> Execute task-by-task (fresh implementer per task, review between tasks). Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Render the platform's console and marketing pages in the shared Savvagent shell (header,
footer, theme) and replace the hand-written UI components with the package's shadcn-svelte ones.

**Architecture:** `@savvagent/console-ui@0.2.0` supplies the theme, `ConsoleHeader`,
`ConsoleFooter`, the locale module and `ui/*` components. The platform keeps its own pages and
composites, rewritten on the shared tokens. Both layouts map their state into the shell's props.

**Tech Stack:** SvelteKit 3, Svelte 5 runes, Tailwind 4, Paraglide 2, Vitest, adapter-static.

**Ticket:** savvagent/platform#158 (part of #154)

**Spec:** `docs/specs/2026-11-05-console-ui-adoption-design.md`

## Global Constraints

- Worktree: `/home/robhicks/dev/savvagent-services/platform/.claude/worktrees/feat-158-console-ui`
  only. Trunk (`main`) changes only through the PR.
- Every `npm ci` or `npm install` needs `export NODE_AUTH_TOKEN=$(gh auth token)`.
- Gates, from `web/`: `npm run check`, `npm run lint`, `npm test`, `npm run build`. Run `npm run
format` before `lint` when files changed.
- Evidence: report each command's pass, fail and skip counts and the HEAD SHA. A skipped test is
  not a pass.
- Invariants: no credential is spent on a `GET`, and the session cookie stays in the browser
  (the console stays `ssr = false`); marketing pages are prerendered and each is in its
  URL's language top to bottom; every link that crosses between the console and marketing is a
  full document load; `200.html` is in the bundle; console `noindex`, marketing `index, follow`.
- Commits: Conventional Commits, scope `web` (or `ci`, `docs`), with a body that says why. No
  attribution of any kind: no Co-Authored-By, no "Generated with", no credit markers.

## File Structure

| File                                                                                                                                                                 | Responsibility                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Create.** `web/.npmrc`                                                                                                                                             | `@savvagent` scope to GitHub Packages, with the token from `NODE_AUTH_TOKEN` |
| **Modify.** `web/package.json`, `web/package-lock.json`                                                                                                              | `@savvagent/console-ui` 0.2.0 (exact), Tailwind ^4.3.4                       |
| **Modify.** `.github/workflows/ci.yml`                                                                                                                               | `packages: read` and the token for `web`, `docker-build` and `deploy`        |
| **Modify.** `Dockerfile`                                                                                                                                             | BuildKit secret for `npm ci` in the `console` stage                          |
| **Modify.** `web/README.md`, `docs/deploy/fly.md`, `docs/deploy/cloudflare.md`                                                                                       | how to authenticate installs and image builds                                |
| **Modify.** `web/src/app.css`, `web/src/app.html`                                                                                                                    | the shared theme; the theme script                                           |
| **Create.** `web/static/theme.js`                                                                                                                                    | sets `.dark` from `prefers-color-scheme`                                     |
| **Modify.** `web/src/lib/locale.ts` (+ `locale.test.ts`)                                                                                                             | re-export of the package's locale API                                        |
| **Create.** `web/src/lib/console-session.ts` (+ test)                                                                                                                | `/api/me` to `ConsoleSession`                                                |
| **Modify.** `web/src/lib/navigate.ts` (+ test)                                                                                                                       | `crossesHalves`                                                              |
| **Create.** `web/src/lib/components/Spinner.svelte`                                                                                                                  | the pending spinner, shared by `Loading` and buttons                         |
| **Modify.** `web/src/routes/(console)/+layout.svelte` (+ test)                                                                                                       | shared header and footer                                                     |
| **Modify.** `web/src/routes/(marketing)/[[lang=lang]]/+layout.svelte`, `web/src/lib/components/marketing/MarketingHeader.svelte`, `MarketingFooter.svelte` (+ tests) | shared header and footer                                                     |
| **Modify.** `web/scripts/check-build.mjs` (+ test)                                                                                                                   | the language-nav marker                                                      |
| **Modify.** every page and component using a replaced component or an old palette utility                                                                            | component and token swap                                                     |
| **Delete.** `web/src/lib/components/{Alert,Button,Card,Field,LinkButton}.svelte`, `button.ts`                                                                        | replaced by the package                                                      |

## Task Order & Rationale

Auth first, because nothing installs without it. Then the theme and token sweep, which touches
every file mechanically and leaves the app building (old components restyled). Then the locale,
session and navigation helpers, which are pure and testable, and which the layouts need. Then
the two layouts. Then the component swap page by page, deleting the hand-written copies last.
Screenshots and fixes come after that, then docs.

---

### Task 1: GitHub Packages auth and the dependency

Model: sonnet

**Files:** `web/.npmrc`, `web/package.json`, `web/package-lock.json`, `.github/workflows/ci.yml`,
`Dockerfile`

- [x] `web/.npmrc` holds exactly the two lines in the spec. Pin `"@savvagent/console-ui":
"0.2.0"`, and `tailwindcss` and `@tailwindcss/vite` to `^4.3.4`. Run `npm install`, and check
      that `package-lock.json` resolves the package from `npm.pkg.github.com`.
- [x] `ci.yml` `web` job: `permissions: { contents: read, packages: read }`, and `env:
NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on the `npm ci` step.
- [x] `ci.yml` `docker-build`: `permissions: { contents: read, packages: read }`, and `secrets: |
npm_token=${{ secrets.GITHUB_TOKEN }}` on `docker/build-push-action`.
- [x] `ci.yml` `deploy`: `packages: read`, and `flyctl deploy --remote-only -a otto-platform
--build-secret npm_token=${{ secrets.GITHUB_TOKEN }}`. A comment says the token is the job's own
      short-lived read-only one.
- [x] `Dockerfile` `console` stage: `COPY web/package.json web/package-lock.json web/.npmrc ./`,
      then `RUN --mount=type=secret,id=npm_token,required=true NODE_AUTH_TOKEN="$(cat
/run/secrets/npm_token)" npm ci`. Explain in a comment why it is a secret mount, not an ARG.
- [x] Verify: `docker build --secret id=npm_token,env=NODE_AUTH_TOKEN --target console -t
platform158-console .` succeeds. `docker history --no-trunc platform158-console | grep -c
"$NODE_AUTH_TOKEN"` prints 0. `docker run --rm platform158-console sh -c 'cat
/web/.npmrc; ls /run/secrets 2>&1'` shows only the placeholder and no secret.
- [x] Gates: `npm run check && npm run lint && npm test && npm run build`.
- [x] Commit `build(web): install @savvagent/console-ui from GitHub Packages`.

### Task 2: The shared theme and the token sweep

Model: sonnet

**Files:** `web/src/app.css`, `web/src/app.html`, `web/static/theme.js`, every `.svelte` and
`.ts` under `web/src` that uses an old palette utility or `sav-card`, `sav-input` or `sav-label`

- [x] `app.css` as the spec's Theme section: the two imports, the focus rule on
      `var(--color-ring)`, `.sav-mono`, `.sav-kicker`, and `.sav-select`. `.sav-select` uses the
      `Input` classes from `node_modules/@savvagent/console-ui/dist/components/ui/input/input.svelte`
      plus `appearance-auto`.
- [x] `static/theme.js`, as in the spec. `app.html` loads it in `<head>`, before
      `%sveltekit.head%`, and `<body>` loses `bg-canvas text-ink`.
- [x] Rewrite every utility with the spec's table. Check with `grep -rnE
"\b(bg|text|border|divide|ring|decoration|placeholder:text)-(canvas|surface|raised|edge|ink|faint|accent-ink|ok|busy|warn|bad)\b|\btext-muted\b(?!-)|\b(text|bg|border|decoration)-accent\b"
web/src` (use `grep -P`) and expect no match outside `node_modules` and `paraglide`. An inline
      text link that was `text-accent` gets `text-primary underline underline-offset-4`.
      `.sav-card` becomes `rounded-xl bg-card ring-1 ring-foreground/10`, which is the `Card` look,
      until Task 6 replaces it. `.sav-label` on a label stays until Task 6, renamed to the
      `FieldLabel` classes. Elsewhere it becomes `.sav-kicker`.
- [x] A test that searches for the old utilities: `web/src/lib/theme.test.ts` reads every
      `.svelte` and `.ts` file under `src` (excluding `paraglide`) and fails on any old palette
      utility, naming the file. Write it first and see it fail.
- [x] Gates. Commit `feat(web): adopt the shared console theme`.

### Task 3: Locale, session mapping, and the cross-half rule

Model: sonnet

**Files:** `web/src/lib/locale.ts`, `locale.test.ts`, `console-session.ts`,
`console-session.test.ts`, `navigate.ts`, `navigate.test.ts`

- [x] Tests first, and see them fail (`npm test`): `toConsoleSession` (org mapping; `currentOrg` from the slug and `null` for an
      unknown or missing slug; the user name falls back to the label only when there is neither name
      nor email; `platformUrl` passed through). `crossesHalves(from, to)` is true from
      `/(console)/…` to `/(marketing)/…` and back, false within a group, and false when either id is
      `null`. Locale: the package's `SUPPORTED` equals the platform runtime's `locales`.
- [x] `locale.ts` re-exports from `@savvagent/console-ui`, per the spec. Delete the duplicated
      tests in `locale.test.ts` and keep the equality test. Every importer of `#lib/locale.js` still
      compiles. `resolveAtBoot` now takes runtimes: the console layout calls
      `resolveAtBoot(overwriteGetLocale)`.
- [x] Gates. Commit `refactor(web): take the locale module from console-ui`.

### Task 4: The console layout on the shared header and footer

Model: opus

**Files:** `web/src/routes/(console)/+layout.svelte`, `layout.render.test.ts`

- [x] Update `layout.render.test.ts` first, and see it fail. Add `beforeNavigate` to its
      `$app/navigation` mock, and stub `fetch` for `/services/v1.json` (or the header fetches for
      real). Replace the test of the removed `ServiceLink` nav variant. Signed in: there is an account menu button
      (`aria-label` is the package's `cui_account_label`), an org switcher, and a brand link to
      `/home`. Signed out on `/login`: a "Sign in" link once the session resolves. The footer
      contains the API reference link and `v<version>`. A `PATCH /api/me` failure in `changeLocale`
      shows an alert. Keep the existing guard, fatal and loading tests.
- [x] Implement as in the spec's "Console layout" section: `ConsoleHeader` with snippets,
      `ConsoleFooter`, `changeLocale`, `localeError`, and a `beforeNavigate` that uses
      `crossesHalves` (`cancel()` then `location.assign(to.url.href)`).
- [x] Gates. Commit `feat(web): render the console in the shared shell`.

### Task 5: The marketing layout on the shared header and footer

Model: opus

**Files:** `web/src/routes/(marketing)/[[lang=lang]]/+layout.svelte`,
`web/src/lib/components/marketing/MarketingHeader.svelte`, `MarketingFooter.svelte`, their
`*.render.test.ts`, `web/scripts/check-build.mjs`, `check-build.test.mjs`, `web/vite.config.ts`
(the comment only)

- [x] Tests first, and see them fail. Stub `fetch` for `/services/v1.json`. Header in `es`: the brand links to `/es`, the product, pricing and CLI links
      are there, "Sign in" and "Create account" show while signed out, and the language trigger shows
      "Español". Footer: the language nav has `data-languages` and links every locale to this page,
      and the shared footer carries the API reference, contact and version links.
      `check-build.test.mjs`: a page whose language nav label is wrong is reported.
- [x] Implement as in the spec's "Marketing layout" section. `useLocale(data.lang,
overwriteGetLocale)` replaces `overwriteGetLocale(() => data.lang)` at the top of the layout
      script, and the comment above it is updated. Add the `beforeNavigate` cross-half guard. The
      marker in `check-build.mjs` becomes `/<nav data-languages(?:="")? aria-label="([^"]*)"/`
      (Svelte's server render writes the bare attribute as `data-languages=""`; the test fixture
      copies that real output).
- [x] Gates, including `npm run build`, whose `check:build` must report `36 pages, all good`.
      Commit `feat(web): render the marketing pages in the shared shell`.

### Task 6: Replace the hand-written components

Model: sonnet

**Files:** every importer of `Alert`, `Button`, `LinkButton`, `Card`, `Field` or `button.js` (18
files for `Alert` alone; `grep -rlE "components/(Alert|Button|LinkButton|Card|Field)\.svelte|components/button\.js" web/src`),
the `.sav-*` users, `Spinner.svelte`, `Loading.svelte`, `CopyField.svelte`, the marketing cards

- [x] First extend `theme.test.ts` to fail on `sav-card`, `sav-input` and `sav-label` and on
      any import of the deleted components, and see it fail.
- [x] Remove `ServiceLink`'s `nav` variant (only the old console header used it) and update
      `ServiceLink.render.test.ts`.
- [x] Follow the spec's component table. Import from `@savvagent/console-ui/ui/<name>`.
      `Spinner.svelte` is the spinner `<span aria-hidden>` from `Loading.svelte`. `Loading` uses it,
      and so does every button with `pending`.
- [x] Each `Field` gets ids from `$props.id()`. Inside an `{#each}`, append the item's key.
      `FieldDescription` gets an id, and the control's `aria-describedby` points at it.
- [x] Update render tests that query old markup so they query roles, names and labels. A test
      that relied on the wrapping `<label>` now relies on `for`/`id`; `getByLabelText` still works.
- [x] Delete `Alert.svelte`, `Button.svelte`, `button.ts`, `Card.svelte`, `Field.svelte` and
      `LinkButton.svelte`. `grep` shows no importer and no `sav-card`, `sav-input` or `sav-label`.
  - [x] Gates. Commit `feat(web): use the console-ui components`.

### Task 7: Screenshot comparison and fixes

Model: orchestrator

The harness lives outside the repo, in the session scratchpad
`S=/tmp/claude-1000/-home-robhicks-dev-savvagent-services/0692bf81-c677-412e-9924-020aa4c29537/scratchpad`:
`$S/platform158-harness/{serve.mjs,shoot.mjs,diff.mjs}`, with the `main` build's shots in
`$S/platform158-shots-before`.

- [x] `npm run build`, then `node $S/platform158-harness/serve.mjs web/build 4918 &`,
      `node $S/platform158-harness/shoot.mjs http://localhost:4918 $S/platform158-shots-after`, and
      `node $S/platform158-harness/diff.mjs $S/platform158-shots-before $S/platform158-shots-after
$S/platform158-shots-diff`. Compare each side-by-side pair and diff each `.txt` dump. Fix any
      lost content, broken layout or unreadable text. Re-run the gates after a fix and commit as
      `fix(web): …`.

### Task 8: Docs

Model: haiku

**Files:** `web/README.md`, `docs/deploy/fly.md`, `docs/deploy/cloudflare.md`

- [x] `web/README.md`: installing needs `NODE_AUTH_TOKEN` with `read:packages`. The shell comes
      from `@savvagent/console-ui`. Dark mode follows the OS. Update the paragraph about the locale
      override (now `useLocale`) and about the `data-sveltekit-reload` rule (plus the guard).
- [x] `docs/deploy/fly.md` "Deploying": the image build needs the `npm_token` BuildKit secret,
      CI passes the job token, and a local build uses `docker build --secret
id=npm_token,env=NODE_AUTH_TOKEN .`.
- [x] `docs/deploy/cloudflare.md`: `npm ci` before `npm run deploy` needs `NODE_AUTH_TOKEN`.
- [x] `npm run lint`. Commit `docs: install and build the console with console-ui`.
