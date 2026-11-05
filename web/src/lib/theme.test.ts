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
    return /\.(svelte|ts|css)$/.test(entry.name) ? [path] : [];
  });
}

// `border` with an optional side (`border-l-accent`), and every other colour utility.
const PREFIX =
  '(?:bg|text|border(?:-[trblxyse])?|divide|ring|ring-offset|decoration|outline|from|via|to|fill|stroke|shadow|caret|accent|placeholder:text)';
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
  it('recognises every form of an old utility', () => {
    const old = [
      'border-l-accent/60',
      'border-t-edge',
      'via-surface',
      'shadow-canvas',
      'ring-offset-canvas',
      'caret-accent',
      'hover:text-muted',
      'var(--color-faint)'
    ];
    for (const sample of old) expect(sample.match(OLD), sample).not.toBeNull();
    const current = ['text-muted-foreground', 'bg-muted', 'border-border/60', 'bg-primary'];
    for (const sample of current) expect(sample.match(OLD), sample).toBeNull();
  });

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
