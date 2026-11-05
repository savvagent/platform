/**
 * Which language the console renders in: `@savvagent/console-ui`'s locale
 * module, re-exported.
 *
 * The package holds the single copy of the resolution rules (the account's
 * choice, then the browser storage cache, then the browser) and of the
 * "current locale" the shared header's picker reads. A second copy here would
 * hold a second current locale, and the picker would disagree with the page.
 *
 * The console calls `resolveAtBoot(appRuntime)` and the marketing pages
 * `useLocale(lang, appRuntime)`, passing this app's Paraglide runtime (below)
 * so its messages follow the same locale as the shell's. `locale.test.ts` pins
 * that the package ships exactly this app's locales.
 */

export {
  LOCALE_NAMES,
  SUPPORTED,
  applyLocale,
  currentLocale,
  detect,
  isSupported,
  needsReload,
  readCached,
  reconcile,
  resolveAtBoot,
  useLocale,
  writeCached
} from '@savvagent/console-ui';
export type { Locale, LocaleStore } from '@savvagent/console-ui';

import type { OverwriteGetLocale } from '@savvagent/console-ui';
import { overwriteGetLocale } from '#lib/paraglide/runtime.js';

/**
 * This app's Paraglide runtime, as the package's `resolveAtBoot` and
 * `useLocale` take it.
 *
 * The package types the hook loosely (`() => string`) because it cannot know
 * an app's locale union; this app's generated runtime types it as its own
 * six. The getter the package installs only ever returns a locale it has
 * checked with `isSupported`, and `locale.test.ts` pins that its list is this
 * app's list, so the cast cannot let an unknown locale through.
 */
export const appRuntime = overwriteGetLocale as unknown as OverwriteGetLocale;
