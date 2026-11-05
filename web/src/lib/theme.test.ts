// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
  The platform used to declare its own palette (`bg-surface`, `text-muted`,
  `bg-accent`, ...). The shared console theme uses shadcn's token names, and
  several of them mean something different there: `text-muted` is a background
  colour, and `accent` is a hover background. A leftover old utility would not
  fail to build; it would silently render nothing or the wrong thing. So this
  test fails on any old utility, naming the file and the class.
*/

const SRC = join(__dirname, '..');
const SELF = join(__dirname, 'theme.test.ts');
const SKIP = join(SRC, 'lib', 'paraglide');

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (path === SKIP || path === SELF) return [];
    if (entry.isDirectory()) return sources(path);
    return /\.(svelte|ts)$/.test(entry.name) ? [path] : [];
  });
}

const PREFIX =
  '(?:bg|text|border|divide|ring|decoration|outline|from|to|fill|stroke|accent|placeholder:text)';
// `accent` is old for every prefix; `muted` only as text (`bg-muted` is a valid new token,
// `text-muted-foreground` is the new text grey).
const NAME = '(?:canvas|surface|raised|edge|ink|faint|accent-ink|ok|busy|warn|bad|accent)';
// Also `var(--color-<old>)` in <style> blocks: the new theme defines `--color-accent` and
// `--color-muted` too, but the platform never meant shadcn's versions of them.
const OLD = new RegExp(
  `(?<![\\w-])(?:${PREFIX}-${NAME}|text-muted)(?![\\w-])(?:/[\\w.\\[\\]%]+)?` +
    `|var\\(--color-(?:${NAME}|muted)\\)`,
  'g'
);

describe('theme', () => {
  it('uses no utility from the old platform palette', () => {
    const found: string[] = [];
    for (const file of sources(SRC)) {
      for (const match of readFileSync(file, 'utf8').matchAll(OLD)) {
        found.push(`${relative(SRC, file)}: ${match[0]}`);
      }
    }
    expect(found).toEqual([]);
  });
});
