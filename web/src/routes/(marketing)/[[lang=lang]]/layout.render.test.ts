// @vitest-environment jsdom
/**
 * The marketing layout's wiring that its header and footer tests cannot see:
 * the page's language reaches the app's messages and the shared shell, and
 * the full-load guard is registered (its rules are in `navigate.test.ts`).
 */

import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn() }));
vi.mock(
  '$app/state',
  async () => await import('#lib/components/marketing/fake-app-state.svelte.js')
);

import { beforeNavigate } from '$app/navigation';
import { page } from '#lib/components/marketing/fake-app-state.svelte.js';
import { fullLoadGuard } from '#lib/navigate.js';
import { getLocale, overwriteGetLocale } from '#lib/paraglide/runtime.js';
import Layout from './+layout.svelte';

let container: HTMLElement;
const original = getLocale;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  // Nothing answers: the session check and the service list stay pending.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );
});

afterEach(() => {
  container.remove();
  vi.unstubAllGlobals();
  overwriteGetLocale(original);
});

function render(lang: 'en' | 'es', path: string) {
  page.url = new URL(`https://savvagent.com${path}`);
  const children = createRawSnippet(() => ({ render: () => '<p>page</p>' }));
  const instance = mount(Layout, {
    target: container,
    props: { children, data: { lang } } as never
  });
  flushSync();
  return instance;
}

describe('the marketing layout', () => {
  it('registers the full-load guard', () => {
    const instance = render('en', '/pricing');
    expect(beforeNavigate).toHaveBeenCalledWith(fullLoadGuard);
    unmount(instance);
  });

  it('pins both the app and the shell to the page’s language', () => {
    const instance = render('es', '/es/pricing');
    expect(getLocale()).toBe('es');
    expect(container.querySelector('header button[aria-label="Idioma"]')).not.toBeNull();
    unmount(instance);
  });
});
