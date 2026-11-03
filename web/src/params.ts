import { defineParams } from '@sveltejs/kit/params';

import { baseLocale, locales } from '#lib/paraglide/runtime.js';

/**
 * The locales that appear as a URL prefix: every one but the base locale.
 *
 * English lives at unprefixed paths (`/pricing`), so `/en/pricing` would be a
 * second URL for the same page — duplicate content to a crawler, and a file
 * the build never writes. Derived from Paraglide's generated runtime rather
 * than typed out, so adding a locale to `project.inlang/settings.json` adds
 * its prefix too.
 *
 * The match is exact and case-sensitive, which is also what keeps
 * `[[lang=lang]]` from swallowing a console path like `/login`.
 */
const PREFIXED: ReadonlySet<string> = new Set(locales.filter((l) => l !== baseLocale));

/** Whether `param` is a locale that appears as a URL prefix. */
export const matchLang = (param: string): boolean => PREFIXED.has(param);

export const params = defineParams({
  lang: (param) => (matchLang(param) ? param : undefined)
});
