// @vitest-environment jsdom
/**
 * The marketing header on the shared shell: `ConsoleHeader` from
 * `@savvagent/console-ui`, with the site's brand, navigation and way into the
 * console in its slots, and no session (marketing pages never show the org
 * switcher or the account menu, whose links cross into the console).
 *
 * The small-screen menu is a `<details>`, which the browser opens and closes
 * on its own — but a `<details>` knows nothing about routing. A client-side
 * navigation from one of its links leaves the new page under an open menu,
 * and nothing about Escape closes one. Both are this component's job.
 *
 * The shell fetches the service list from `platformUrl`; `fetch` is stubbed
 * so no test reaches the network.
 */

import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', async () => await import('./fake-app-state.svelte'));

import { appRuntime, useLocale, type Locale } from '#lib/locale.js';
import { getLocale, overwriteGetLocale } from '#lib/paraglide/runtime.js';
import { page } from './fake-app-state.svelte';
import MarketingHeader from './MarketingHeader.svelte';

const SERVICES = {
  version: 1,
  services: [
    {
      slug: 'tower',
      name: 'Savvagent Tower',
      consoleUrl: 'https://tower.savvagent.com',
      mcpUrl: 'https://tower.savvagent.com/mcp',
      connectPath: '/products/tower#connect'
    }
  ]
};

const defaultGetLocale = getLocale;
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  page.url = new URL('http://localhost/');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) =>
      new URL(String(input), location.origin).pathname === '/services/v1.json'
        ? Response.json(SERVICES)
        : new Response(null, { status: 404 })
    )
  );
});

afterEach(() => {
  container.remove();
  vi.unstubAllGlobals();
  // `useLocale` pins both runtimes; put English and the app's own getter back.
  useLocale('en', appRuntime);
  overwriteGetLocale(defaultGetLocale);
});

/** Mounts the header as the layout does: the locale pinned first. */
function mountHeader(lang: Locale) {
  useLocale(lang, appRuntime);
  return mount(MarketingHeader, {
    target: container,
    props: { lang, platformUrl: 'http://localhost' }
  });
}

function openMenu(): { details: HTMLDetailsElement; summary: HTMLElement } {
  // Let the mount's own effects settle first, so the open below is the last word.
  flushSync();
  const details = container.querySelector('details') as HTMLDetailsElement;
  const summary = details.querySelector('summary') as HTMLElement;
  details.open = true;
  details.dispatchEvent(new Event('toggle'));
  flushSync();
  expect(details.open).toBe(true);
  return { details, summary };
}

describe('the marketing header menu', () => {
  it('closes when the page changes', () => {
    const instance = mountHeader('en');
    const { details } = openMenu();

    page.url = new URL('http://localhost/products/flags');
    flushSync();

    expect(details.open).toBe(false);
    unmount(instance);
  });

  it('closes on Escape and hands focus back to its toggle', () => {
    const instance = mountHeader('en');
    const { details, summary } = openMenu();
    const link = details.querySelector('nav a') as HTMLAnchorElement;
    link.focus();

    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flushSync();

    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
    unmount(instance);
  });

  it('marks the current page with more than colour', () => {
    page.url = new URL('http://localhost/products/flags');
    const instance = mountHeader('en');

    const current = container.querySelector('a[aria-current="page"]');
    expect(current?.getAttribute('href')).toBe('/products/flags');
    expect(current?.className).toMatch(/aria-\[current=page\]:underline/);
    unmount(instance);
  });

  it('links the CLI page in the visitor’s language, and marks it when current', () => {
    page.url = new URL('http://localhost/es/cli');
    const instance = mountHeader('es');

    const links = Array.from(container.querySelectorAll('a[href="/es/cli"]'));
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.textContent?.trim()).toBe('CLI');
      expect(link.getAttribute('aria-current')).toBe('page');
    }
    unmount(instance);
  });
});

describe('the marketing header on the shared shell', () => {
  it('links the brand, products, pricing and CLI in the page’s language', () => {
    page.url = new URL('http://localhost/es/pricing');
    const instance = mountHeader('es');
    flushSync();

    const brand = container.querySelector<HTMLAnchorElement>('a[aria-label="Savvagent"]');
    expect(brand?.getAttribute('href')).toBe('/es');
    for (const href of ['/es/products/tower', '/es/products/flags', '/es/pricing', '/es/cli']) {
      expect(container.querySelector(`a[href="${href}"]`), href).not.toBeNull();
    }
    const pricing = container.querySelector('a[href="/es/pricing"]');
    expect(pricing?.textContent?.trim()).toBe('Precios');
    unmount(instance);
  });

  it('shows sign-in and create-account while signed out, each reloading the document', () => {
    const instance = mountHeader('es');
    flushSync();

    const signIn = container.querySelector<HTMLAnchorElement>('a[href="/login"]');
    expect(signIn?.textContent?.trim()).toBe('Iniciar sesión');
    expect(signIn?.hasAttribute('data-sveltekit-reload')).toBe(true);

    const signUp = container.querySelector<HTMLAnchorElement>('a[href="/signup"]');
    expect(signUp?.textContent?.trim()).toBe('Crear cuenta');
    expect(signUp?.hasAttribute('data-sveltekit-reload')).toBe(true);
    unmount(instance);
  });

  /**
   * The shell's picker reads the package's own current locale, not the
   * app's Paraglide runtime. Showing "Español" proves `useLocale` reached it,
   * and the trigger's Spanish label proves the shell's messages followed.
   */
  it('shows the page’s language in the shell’s language picker', () => {
    const instance = mountHeader('es');
    flushSync();

    expect(container.querySelector('header')?.textContent).toContain('Español');
    // And the shell's own messages (its Paraglide runtime), not just the name.
    expect(container.querySelector('header button[aria-label="Idioma"]')).not.toBeNull();
    unmount(instance);
  });
});
