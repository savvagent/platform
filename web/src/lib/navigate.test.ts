import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn(() => Promise.resolve()) }));

import { goto } from '$app/navigation';
import { crossesHalves, gotoOrLoad } from './navigate';

afterEach(() => {
  vi.mocked(goto).mockReset();
  vi.unstubAllGlobals();
});

function stubLocation() {
  const assign = vi.fn();
  vi.stubGlobal('location', { assign });
  return assign;
}

describe('gotoOrLoad', () => {
  it('uses the client router, replacing the entry, when it can', async () => {
    const assign = stubLocation();
    vi.mocked(goto).mockResolvedValue(undefined);
    await gotoOrLoad('/o/acme');
    expect(goto).toHaveBeenCalledWith('/o/acme', { replace: true });
    expect(assign).not.toHaveBeenCalled();
  });

  // SvelteKit 3's `goto` rejects a path with no route. A stale `next` must
  // still get somewhere, not strand a signed-in user on the sign-in page.
  it('loads the path fully when the router rejects it', async () => {
    const assign = stubLocation();
    vi.mocked(goto).mockRejectedValue(new Error('no route'));
    await gotoOrLoad('/no/such/page');
    expect(assign).toHaveBeenCalledWith('/no/such/page');
  });
});

describe('crossesHalves', () => {
  const console_ = '/(console)/o/[org]/members';
  const settings = '/(console)/settings';
  const landing = '/(marketing)/[[lang=lang]]';
  const product = '/(marketing)/[[lang=lang]]/products/[slug]';

  it('is true from the console to a marketing page and back', () => {
    expect(crossesHalves(console_, landing)).toBe(true);
    expect(crossesHalves(product, settings)).toBe(true);
  });

  it('is false within one half', () => {
    expect(crossesHalves(console_, settings)).toBe(false);
    expect(crossesHalves(landing, product)).toBe(false);
  });

  // An unknown route, or one outside both groups (`/sitemap.xml`), is left to
  // SvelteKit, which loads it fully anyway when nothing matches.
  it('is false when either route is unknown or in neither group', () => {
    expect(crossesHalves(console_, null)).toBe(false);
    expect(crossesHalves(null, landing)).toBe(false);
    expect(crossesHalves(console_, '/sitemap.xml')).toBe(false);
  });
});
