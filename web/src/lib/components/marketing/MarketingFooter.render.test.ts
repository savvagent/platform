// @vitest-environment jsdom
/**
 * The footer's language links, and the header's sign-in link.
 *
 * Each language link must be *this page* in that language, and each must
 * reload the document: Paraglide's messages are plain calls, so a client-side
 * navigation would leave the layout speaking the old language. The header's
 * `/login` crosses into the console, which boots its own locale getter, so it
 * needs the reload too.
 */

import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', async () => await import('./fake-app-state.svelte'));

import { useLocale } from '#lib/locale.js';
import { getLocale, overwriteGetLocale } from '#lib/paraglide/runtime.js';
import { session } from '#lib/session.svelte.js';
import { CONTACT_EMAIL } from '#lib/site.js';
import type { Me } from '#lib/types.js';
import { APP_VERSION } from '#lib/version.js';
import { page } from './fake-app-state.svelte';
import MarketingFooter from './MarketingFooter.svelte';
import MarketingHeader from './MarketingHeader.svelte';

const PLATFORM = 'https://platform.example.test';
const defaultGetLocale = getLocale;
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  useLocale('es', overwriteGetLocale);
  // The header's shell fetches the service list; an empty one keeps it off the network.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ version: 1, services: [] }))
  );
});

afterEach(() => {
  container.remove();
  page.url = new URL('http://localhost/');
  session.clear();
  vi.unstubAllGlobals();
  useLocale('en', overwriteGetLocale);
  overwriteGetLocale(defaultGetLocale);
});

describe('the marketing footer', () => {
  it('links each language to the same page in that language, reloading the document', () => {
    page.url = new URL('http://localhost/es/pricing');
    const instance = mount(MarketingFooter, {
      target: container,
      props: { lang: 'es', platformUrl: PLATFORM }
    });

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[hreflang]'));
    // Written out rather than rebuilt with `localizedPath`, so a bug there
    // cannot make this agree with itself. English has no prefix.
    expect(links.map((a) => [a.hreflang, a.getAttribute('href')])).toEqual([
      ['en', '/pricing'],
      ['es', '/es/pricing'],
      ['de', '/de/pricing'],
      ['fr', '/fr/pricing'],
      ['it', '/it/pricing'],
      ['hi', '/hi/pricing']
    ]);
    for (const a of links) {
      expect(a.hasAttribute('data-sveltekit-reload'), a.hreflang).toBe(true);
    }
    expect(links.filter((a) => a.hasAttribute('aria-current')).map((a) => a.hreflang)).toEqual([
      'es'
    ]);
    expect(links.find((a) => a.hreflang === 'es')?.getAttribute('aria-current')).toBe('true');
    for (const a of links) expect(a.lang).toBe(a.hreflang);

    unmount(instance);
  });

  /**
   * `check-build` finds the page's last string by this marker, so its shape
   * (a `data-languages` nav labelled in the page's language) is part of the
   * build's contract.
   */
  it('labels the language list in the page’s language, as check-build expects', () => {
    page.url = new URL('http://localhost/es/pricing');
    const instance = mount(MarketingFooter, {
      target: container,
      props: { lang: 'es', platformUrl: PLATFORM }
    });

    const nav = container.querySelector('nav[data-languages]');
    expect(nav?.getAttribute('aria-label')).toBe('Idioma');
    expect(nav?.querySelectorAll('a[hreflang]')).toHaveLength(6);

    unmount(instance);
  });

  /**
   * The API reference is absolute on the platform's origin: the prerender
   * crawler follows same-origin links, there is no `/api` at build time, and
   * a 404 would fail the build.
   */
  it('carries the API reference, the contact address and the version in the shared footer', () => {
    page.url = new URL('http://localhost/es/pricing');
    const instance = mount(MarketingFooter, {
      target: container,
      props: { lang: 'es', platformUrl: PLATFORM }
    });

    const api = container.querySelector<HTMLAnchorElement>(
      `a[href="${PLATFORM}/api/openapi.json"]`
    );
    expect(api?.textContent?.trim()).toBe('Referencia de la API');
    const contact = container.querySelector<HTMLAnchorElement>(`a[href="mailto:${CONTACT_EMAIL}"]`);
    expect(contact?.textContent?.trim()).toBe(`Contacto: ${CONTACT_EMAIL}`);
    const version = container.querySelector<HTMLAnchorElement>(
      `a[href="https://github.com/savvagent/platform/releases/tag/v${APP_VERSION}"]`
    );
    expect(version?.textContent?.trim()).toBe(`v${APP_VERSION}`);
    // The shared footer's copyright link goes to the platform's home.
    expect(container.querySelector(`footer a[href="${PLATFORM}/"]`)).not.toBeNull();

    unmount(instance);
  });
});

describe('the marketing header', () => {
  const loginLinks = () =>
    Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href="/login"]'));

  it('reloads the document on its sign-in link, and drops it once signed in', () => {
    page.url = new URL('http://localhost/es/pricing');
    const instance = mount(MarketingHeader, {
      target: container,
      props: { lang: 'es', platformUrl: PLATFORM }
    });
    flushSync();

    expect(loginLinks().length).toBeGreaterThan(0);
    for (const a of loginLinks()) {
      expect(a.hasAttribute('data-sveltekit-reload')).toBe(true);
    }

    session.me = {
      orgs: [
        { orgId: 'o1', userId: 'u1', role: 'owner', orgSlug: 'acme', orgName: 'Acme', plan: 'free' }
      ]
    } as unknown as Me;
    flushSync();
    expect(loginLinks()).toHaveLength(0);
    const entry = container.querySelector<HTMLAnchorElement>('a[href="/o/acme"]');
    expect(entry?.textContent?.trim()).toBe('Abrir la consola');
    expect(entry?.hasAttribute('data-sveltekit-reload')).toBe(true);
    expect(container.querySelector('a[href="/signup"]')).toBeNull();

    unmount(instance);
  });
});
