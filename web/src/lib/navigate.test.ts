import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn(() => Promise.resolve()) }));

import { goto } from '$app/navigation';
import { gotoOrLoad } from './navigate';

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
