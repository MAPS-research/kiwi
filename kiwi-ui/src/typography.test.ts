import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import theme from './Theme.ts';

/**
 * Montserrat is the only typeface for ordinary product UI — body text, headings,
 * buttons, forms, navigation, and anything inheriting the MUI theme. These are the
 * guards that keep it that way: the UI used to run on a `-apple-system, …` system
 * font stack while MUI silently fell back to its own Roboto/Helvetica default, and
 * that mix is easy to reintroduce one `sx={{ fontFamily: … }}` at a time.
 *
 * The scan below deliberately tolerates the narrow set of fonts that carry meaning
 * (math, monospace, icon fonts, third-party internals) so it does not become noise.
 * See "Typography: Montserrat only" in README.md.
 */

const projectRoot = resolve(__dirname, '..');

const UI_FONT_STACK = "'Montserrat', sans-serif";

/** Generic CSS families used only to recognize likely font-stack literals. */
const GENERIC_FAMILIES = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-monospace',
  'inherit',
  'initial',
  'unset',
]);

/** CSS-wide control values do not select a new typeface. */
const CONTROL_VALUES = new Set(['inherit', 'initial', 'unset']);

/**
 * Files allowed to declare a non-Montserrat UI font, with the reason. Keep this
 * list short: every entry is a place the rule does not hold.
 */
const EXEMPT_FILES = new Map([
  [
    'src/components/Email/TemplatedEmailForm.tsx',
    'HTML email template — mail clients cannot load our self-hosted webfont, so the ' +
      'inlined template falls back to a font they all have.',
  ],
]);

const sourceFiles = (): string[] => {
  const out: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      // Generated API client; never hand-edited, and it declares no styles.
      if (entry === 'services' || entry === 'node_modules') continue;

      const path = join(dir, entry);

      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (/\.(ts|tsx|css)$/.test(entry)) {
        out.push(path);
      }
    }
  };

  walk(resolve(projectRoot, 'src'));

  return [...out, resolve(projectRoot, 'public/kiwi-design-tokens.css')];
};

const splitFamilies = (value: string): string[] =>
  value
    .split(',')
    .map((family) => family.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);

/**
 * A declaration is fine when it is the Montserrat stack, or when it is clearly a
 * monospace stack (code, commands, IDs, JSON — an allowed exception). `var(…)`
 * indirection is checked where the custom property is defined instead.
 */
const isAllowedStack = (value: string): boolean => {
  if (value.includes('var(')) return true;

  const families = splitFamilies(value.replace(/!important/g, ''));

  if (families.length === 0) return true;
  if (families.length === 1 && CONTROL_VALUES.has(families[0].toLowerCase())) return true;
  if (families[families.length - 1].toLowerCase() === 'monospace') return true;

  return (
    families[0] === 'Montserrat' &&
    (families.length === 1 ||
      (families.length === 2 && families[1].toLowerCase() === 'sans-serif'))
  );
};

/**
 * Bare string literals that are unambiguously font stacks — a comma-separated list
 * of plain family names ending in a generic family. Anything with sentence
 * punctuation is prose (Storybook docs, comments) and is left alone.
 */
const looksLikeFontStack = (value: string): boolean => {
  const parts = value.split(',').map((part) => part.trim());

  if (parts.length < 2) return false;
  if (!parts.every((part) => /^(["']?)[A-Za-z0-9\- ]+\1$/.test(part))) return false;

  const last = parts[parts.length - 1].replace(/^["']|["']$/g, '');

  return GENERIC_FAMILIES.has(last.toLowerCase());
};

/** `font-family:` and `--kiwi-font-family*:` declarations, including inside CSS-in-template-strings. */
const CSS_DECLARATION = /(?:^|[;{\s])(?:font-family|--[\w-]*font-family[\w-]*)\s*:\s*([^;}]+)/g;
/** `fontFamily: '…'` in `sx`/`style` objects and `fontFamily="…"` JSX props. */
const JS_DECLARATION = /fontFamily\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
const STRING_LITERAL = /(["'`])((?:(?!\1)[^\\\n])*)\1/g;

const declarationsIn = (text: string): string[] => {
  const values = [
    ...[...text.matchAll(CSS_DECLARATION)].map((match) => match[1]),
    ...[...text.matchAll(JS_DECLARATION)].map((match) => match[1] ?? match[2] ?? match[3]),
    ...[...text.matchAll(STRING_LITERAL)]
      .map((match) => match[2].trim())
      .filter(looksLikeFontStack),
  ];

  return values.map((value) => value.replace(/\s+/g, ' ').trim());
};

describe('Montserrat is the only UI font', () => {
  it.each(['sans-serif', 'serif', 'system-ui', 'ui-sans-serif', 'cursive', 'fantasy'])(
    'rejects %s as a standalone ordinary-UI font',
    (fontFamily) => {
      expect(isAllowedStack(fontFamily)).toBe(false);
    }
  );

  it.each(["'Montserrat'", "'Montserrat', sans-serif", 'inherit', 'initial', 'unset', 'monospace'])(
    'accepts the intended stack or exception: %s',
    (fontFamily) => {
      expect(isAllowedStack(fontFamily)).toBe(true);
    }
  );

  it('is the MUI theme font family', () => {
    expect(theme.typography.fontFamily).toBe(UI_FONT_STACK);
  });

  it('is the global body font, loaded from the shared entry stylesheet', () => {
    const css = readFileSync(resolve(projectRoot, 'src/index.css'), 'utf8');

    // Imported from index.css (not main.tsx) so the Storybook preview, which
    // imports the same stylesheet, gets the font without duplicating the wiring.
    expect(css).toMatch(/@import\s+['"]\.\/fonts\/montserrat\.css['"]/);
    expect(css).toMatch(/body\s*\{[^}]*font-family:\s*'Montserrat',\s*sans-serif;/);
  });

  it('is the ordinary-UI font token published to external Kiwi Apps', () => {
    const css = readFileSync(resolve(projectRoot, 'public/kiwi-design-tokens.css'), 'utf8');

    expect(css).toMatch(/--kiwi-font-family:\s*"Montserrat",\s*sans-serif;/);
    // The monospace token is a legitimate separate stack and stays as-is.
    expect(css).toMatch(/--kiwi-font-family-mono:[^;]*monospace;/);
  });

  it('is the only UI font declared anywhere in src/ and the design tokens', () => {
    const offenders = sourceFiles().flatMap((file) => {
      const relativePath = relative(projectRoot, file);

      if (relativePath === relative(projectRoot, __filename)) return [];
      if (EXEMPT_FILES.has(relativePath)) return [];

      return declarationsIn(readFileSync(file, 'utf8'))
        .filter((value) => !isAllowedStack(value))
        .map((value) => `${relativePath}: ${value}`);
    });

    expect(offenders).toEqual([]);
  });
});

describe('typography documentation', () => {
  it('records the rule and how the font loads in the README', () => {
    const readme = readFileSync(resolve(projectRoot, 'README.md'), 'utf8');

    expect(readme).toContain('### Typography: Montserrat only');
    expect(readme).toContain('@fontsource-variable/montserrat');
    // Self-hosted: the point of the package is that there is no runtime CDN request.
    expect(readme).not.toMatch(/https?:\/\/fonts\.(googleapis|gstatic)\.com/);
  });

  it('tells external Kiwi Apps how to match the font', () => {
    const kiwiApps = readFileSync(resolve(projectRoot, 'KIWI-APPS.md'), 'utf8');

    expect(kiwiApps).toContain('Montserrat');
    expect(kiwiApps).toContain('@fontsource-variable/montserrat');
  });

  it('shows Montserrat rather than a system font stack in Storybook', () => {
    const story = readFileSync(resolve(projectRoot, '.storybook/stories/Typography.stories.tsx'), 'utf8');

    expect(story).toContain('Montserrat');
    expect(story).not.toMatch(/system font stack/i);
  });
});
