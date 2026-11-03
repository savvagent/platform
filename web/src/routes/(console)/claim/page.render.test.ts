// @vitest-environment jsdom
/**
 * Where a claimed account lands: the console's home, `/home`. `/` is the
 * public marketing page now, and landing there would leave somebody who has
 * just recovered their account looking signed out.
 */

import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({
  goto: vi.fn(() => Promise.resolve())
}));

vi.mock(
  '$app/state',
  async () => await import('#lib/components/marketing/fake-app-state.svelte.js')
);

vi.mock('#lib/webauthn.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#lib/webauthn.js')>();
  return {
    ...actual,
    register: vi.fn(async () => ({ rawId: 'cred-1' })),
    signalAccount: vi.fn(async () => {})
  };
});

vi.mock('#lib/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#lib/api.js')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      claimStart: vi.fn(async () => ({ ceremonyId: 'c1', challenge: {} })),
      claimFinish: vi.fn(async () => ({})),
      me: vi.fn(async () => ({ orgs: [] }))
    }
  };
});

import { goto } from '$app/navigation';
import { api } from '#lib/api.js';
import { page } from '#lib/components/marketing/fake-app-state.svelte.js';
import { session } from '#lib/session.svelte.js';
import Page from './+page.svelte';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
  page.url = new URL('http://localhost/');
  session.clear();
});

describe('where the claim page lands', () => {
  it('lands on /home once the code is claimed', async () => {
    page.url = new URL('http://localhost/claim?code=abc-123');
    vi.mocked(goto).mockClear();
    const instance = mount(Page, { target: container });
    flushSync();

    (container.querySelector('form') as HTMLFormElement).requestSubmit();

    await vi.waitFor(() => expect(goto).toHaveBeenCalledOnce());
    expect(goto).toHaveBeenCalledWith('/home', { replace: true });
    expect(api.claimStart).toHaveBeenCalledWith('abc-123');
    unmount(instance);
  });
});
