/**
 * The locale module is `@savvagent/console-ui`'s (see `./locale.ts`), so its
 * behaviour is tested there. What is left to pin here is the one thing the
 * package cannot know: that it ships exactly the locales this app compiles.
 *
 * The server validates `PATCH /api/me` against the platform's list (an
 * `savvagent-core` test asserts it against `project.inlang/settings.json`), and
 * the shell's picker offers the package's. If the two drifted, the header
 * would offer a language the server refuses, or a page would render in a
 * locale this app has no messages for.
 */

import { describe, expect, it } from 'vitest';

import { baseLocale, locales } from '#lib/paraglide/runtime.js';
import { LOCALE_NAMES, SUPPORTED, isSupported } from './locale';

describe('the shared locale list', () => {
  it('is exactly the locales this app compiles', () => {
    expect([...SUPPORTED].sort()).toEqual([...locales].sort());
  });

  it('names every one of them and starts from the same base', () => {
    for (const locale of locales) expect(LOCALE_NAMES[locale]).toBeTruthy();
    expect(isSupported(baseLocale)).toBe(true);
  });
});
