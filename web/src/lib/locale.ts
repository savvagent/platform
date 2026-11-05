/**
 * Which language the console renders in: `@savvagent/console-ui`'s locale
 * module, re-exported.
 *
 * The package holds the single copy of the resolution rules (the account's
 * choice, then the browser storage cache, then the browser) and of the
 * "current locale" the shared header's picker reads. A second copy here would
 * hold a second current locale, and the picker would disagree with the page.
 *
 * The console calls `resolveAtBoot(overwriteGetLocale)` and the marketing
 * pages `useLocale(lang, overwriteGetLocale)`, passing this app's generated
 * Paraglide runtime (`#lib/paraglide/runtime.js`) as is, so its messages follow
 * the same locale as the shell's. The package types the getter it installs as
 * returning its own `Locale`, so the runtime type-checks without a cast as
 * long as this app's locales include the package's. `locale.test.ts` pins that
 * the package ships exactly this app's locales.
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
