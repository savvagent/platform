// @vitest-environment jsdom
/**
 * The console layout on the shared shell: `ConsoleHeader` and `ConsoleFooter`
 * from `@savvagent/console-ui`, with the platform's own brand, "create an org"
 * link, sign-in link and footer links in their slots.
 *
 * The language picker is the one part with behaviour of the layout's own: a
 * signed-in pick is saved to the account before it is applied, because a pick
 * applied without being saved is undone by `reconcile` on the next load. A
 * refused save leaves the page as it was and says so.
 */

import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({
  goto: vi.fn(() => Promise.resolve()),
  beforeNavigate: vi.fn()
}));
vi.mock(
  '$app/state',
  async () => await import('#lib/components/marketing/fake-app-state.svelte.js')
);
// `applyLocale` reloads the document, which jsdom cannot do.
vi.mock('#lib/locale.js', async (original) => ({
  ...(await original<typeof import('#lib/locale.js')>()),
  applyLocale: vi.fn()
}));

import { page } from '#lib/components/marketing/fake-app-state.svelte.js';
import { applyLocale } from '#lib/locale.js';
import { session } from '#lib/session.svelte.js';
import type { Me } from '#lib/types.js';
import { APP_VERSION } from '#lib/version.js';
import Layout from './+layout.svelte';

const SERVICES = {
  version: 1,
  services: [
    {
      slug: 'tower',
      name: 'Savvagent Tower',
      consoleUrl: 'https://tower.savvagent.com',
      mcpUrl: 'https://tower.savvagent.com/mcp',
      connectPath: null
    }
  ]
};

const ME = {
  user: { id: 'u1', email: 'ada@example.test', label: 'a-b-1' },
  orgs: [
    { orgId: 'o1', userId: 'u1', role: 'owner', orgSlug: 'acme', orgName: 'Acme', plan: 'free' }
  ]
} as unknown as Me;

/** What `GET /api/me` and `PATCH /api/me` answer; replaced per test. */
let getMe: () => Response | Promise<Response>;
let patchMe: () => Response;
let fetchMock: ReturnType<typeof vi.fn>;
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  page.url = new URL('http://localhost/o/acme');
  (page as { params?: Record<string, string> }).params = { org: 'acme' };
  getMe = () => Response.json(ME);
  patchMe = () => Response.json({ id: 'u1' });
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), location.origin);
    if (url.pathname === '/services/v1.json') return Response.json(SERVICES);
    if (url.pathname === '/api/me') return init?.method === 'PATCH' ? patchMe() : getMe();
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(applyLocale).mockClear();
  session.me = ME;
  session.ready = true;
});

afterEach(() => {
  container.remove();
  session.clear();
  vi.unstubAllGlobals();
});

function render() {
  const children = createRawSnippet(() => ({ render: () => '<p>page</p>' }));
  const instance = mount(Layout, { target: container, props: { children } });
  flushSync();
  return instance;
}

/** Let the fetches and the promise chains behind them settle. */
async function settle() {
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 0));
    await tick();
  }
  flushSync();
}

/** Open the language picker and choose `name`, by keyboard. */
async function pickLanguage(name: string) {
  const trigger = container.querySelector<HTMLElement>('button[aria-label="Language"]');
  expect(trigger).not.toBeNull();
  trigger!.focus();
  trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await settle();
  const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')).find(
    (el) => el.textContent?.trim() === name
  );
  expect(item, `no "${name}" in the language menu`).toBeDefined();
  item!.click();
  await settle();
}

describe('the console header', () => {
  it('shows the account menu, the org switcher, and a brand that goes to /home', async () => {
    const instance = render();
    await settle();

    expect(container.querySelector('button[aria-label="Account"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Organization"]')).not.toBeNull();
    const header = container.querySelector('header')!;
    const brand = header.querySelector('a');
    expect(brand?.getAttribute('href')).toBe('/home');
    expect(brand?.textContent).toContain('Savvagent');
    expect(header.querySelector('a[href="/orgs/new"]')).not.toBeNull();
    expect(header.textContent).not.toContain('Sign in');

    unmount(instance);
  });

  it('offers "Sign in" to a signed-out visitor, once the session has resolved', async () => {
    page.url = new URL('http://localhost/login');
    (page as { params?: Record<string, string> }).params = {};
    session.me = undefined;
    session.ready = false;
    let answer!: (response: Response) => void;
    getMe = () => new Promise((resolve) => (answer = resolve));
    const instance = render();
    await settle();

    const header = container.querySelector('header')!;
    expect(header.querySelector('a[href="/login"]')).toBeNull();

    answer(Response.json({ error: { code: 'unauthenticated' } }, { status: 401 }));
    await settle();

    const signIn = header.querySelector('a[href="/login"]');
    expect(signIn?.textContent?.trim()).toBe('Sign in');
    expect(container.querySelector('button[aria-label="Account"]')).toBeNull();
    expect(header.querySelector('a[href="/orgs/new"]')).toBeNull();

    unmount(instance);
  });
});

describe('the console footer', () => {
  it('links the API reference and the release of this build', async () => {
    const instance = render();
    await settle();

    const footer = container.querySelector('footer')!;
    const api = footer.querySelector('a[href="/api/openapi.json"]');
    expect(api?.textContent?.trim()).toBe('API reference');
    const release = footer.querySelector(
      `a[href="https://github.com/savvagent/platform/releases/tag/v${APP_VERSION}"]`
    );
    expect(release?.textContent?.trim()).toBe(`v${APP_VERSION}`);

    unmount(instance);
  });
});

describe('changing the language', () => {
  it('saves the pick to the account, then applies it', async () => {
    const instance = render();
    await settle();

    await pickLanguage('Español');

    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patch?.[0]).toBe('/api/me');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ locale: 'es' });
    expect(applyLocale).toHaveBeenCalledWith('es');
    expect(container.querySelector('[role="alert"]')).toBeNull();

    unmount(instance);
  });

  it('says so, and does not apply it, when the save is refused', async () => {
    patchMe = () =>
      Response.json({ error: { code: 'internal_error', message: 'boom' } }, { status: 500 });
    // The picker calls the handler with `void`, so the rethrow that keeps it on
    // the old value surfaces as an unhandled rejection, by design. Caught here
    // so it is asserted on rather than failing the run.
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const instance = render();
    await settle();

    await pickLanguage('Español');

    expect(applyLocale).not.toHaveBeenCalled();
    const alert = container.querySelector('main [role="alert"]');
    expect(alert?.textContent).toContain('Something went wrong on the server.');
    expect(unhandled).toHaveBeenCalledOnce();
    expect(container.querySelector('button[aria-label="Language"]')?.textContent).toContain(
      'English'
    );

    unmount(instance);
    process.off('unhandledRejection', unhandled);
  });
});
