import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import theme from './Theme.ts';

/**
 * Source Sans 3 is the typeface for ordinary product UI (kiwi-ui/DESIGN.md, Type):
 * body text, headings, buttons, forms, navigation, and anything inheriting the MUI
 * theme, with the CJK fallbacks of --font-ui. Montserrat survives only as the
 * KiwiWordmark's face. These are the guards that keep it that way: a mix of faces
 * is easy to reintroduce one `sx={{ fontFamily: … }}` at a time.
 *
 * The scan below deliberately tolerates the narrow set of fonts that carry meaning
 * (math, monospace, icon fonts, third-party internals) so it does not become noise.
 * See "Typography: Source Sans 3" in README.md.
 */

const projectRoot = resolve(__dirname, '..');

/** The --font-ui stack of the generated design tokens. */
const UI_FONT_STACK =
  '"Source Sans 3", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const UI_FAMILIES = ['Source Sans 3', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'];

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
 * Files allowed to declare another face, with the reason. Keep this list short:
 * every entry is a place the rule does not hold.
 */
const EXEMPT_FILES = new Map([
  [
    'src/components/Email/TemplatedEmailForm.tsx',
    'HTML email template — mail clients cannot load our self-hosted webfont, so the ' +
      'inlined template falls back to a font they all have.',
  ],
  [
    'src/fonts/montserrat.css',
    'the @font-face rules of the wordmark face; only KiwiWordmark uses the family.',
  ],
  [
    'src/theme/generated/kiwi-ui.tokens.css',
    'the generated design tokens, which define --font-wordmark beside --font-ui.',
  ],
  [
    'public/kiwi-design-tokens.css',
    'the v1 public contract for Kiwi Apps keeps its Montserrat font token until the ' +
      'public tokens move to the Stage 1 design in their 2.0.0 release.',
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
 * A declaration is fine when it is the UI stack (or a prefix of it ending in the
 * generic family), the bare `Source Sans 3` of its @font-face rules, or clearly a
 * monospace stack (code, commands, IDs, JSON: an allowed exception). `var(…)`
 * indirection is checked where the custom property is defined instead.
 */
const isAllowedStack = (value: string): boolean => {
  if (value.includes('var(')) return true;

  const families = splitFamilies(value.replace(/!important/g, ''));

  if (families.length === 0) return true;
  if (families.length === 1 && CONTROL_VALUES.has(families[0].toLowerCase())) return true;
  if (families[families.length - 1].toLowerCase() === 'monospace') return true;
  if (families.length === 1) return families[0] === 'Source Sans 3';

  return (
    families[0] === 'Source Sans 3' &&
    families[families.length - 1] === 'sans-serif' &&
    families.every((family) => UI_FAMILIES.includes(family))
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

/** `font-family:` and `--*font*:` declarations, including inside CSS-in-template-strings. */
const CSS_DECLARATION = /(?:^|[;{\s])(?:font-family|--[\w-]*font[\w-]*)\s*:\s*([^;}]+)/g;
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

describe('Source Sans 3 is the UI font', () => {
  it.each(['sans-serif', 'serif', 'system-ui', 'ui-sans-serif', 'cursive', 'fantasy', "'Montserrat', sans-serif"])(
    'rejects %s as an ordinary-UI font',
    (fontFamily) => {
      expect(isAllowedStack(fontFamily)).toBe(false);
    }
  );

  it.each([UI_FONT_STACK, "'Source Sans 3'", '"Source Sans 3", sans-serif', 'inherit', 'initial', 'unset', 'monospace'])(
    'accepts the intended stack or exception: %s',
    (fontFamily) => {
      expect(isAllowedStack(fontFamily)).toBe(true);
    }
  );

  it('is the MUI theme font family', () => {
    expect(theme.typography.fontFamily).toBe(UI_FONT_STACK);
  });

  it('is the --font-ui token of the generated design tokens', () => {
    const tokens = readFileSync(resolve(projectRoot, 'src/theme/generated/kiwi-ui.tokens.css'), 'utf8');

    expect(tokens).toContain(`--font-ui: ${UI_FONT_STACK};`);
    expect(tokens).toMatch(/--font-wordmark:\s*"Montserrat",\s*sans-serif;/);
  });

  it('is the global body font, loaded from the shared entry stylesheet', () => {
    const css = readFileSync(resolve(projectRoot, 'src/index.css'), 'utf8');

    // Imported from index.css (not main.tsx) so the Storybook preview, which
    // imports the same stylesheet, gets the fonts without duplicating the wiring.
    expect(css).toMatch(/@import\s+['"]\.\/fonts\/source-sans-3\.css['"]/);
    expect(css).toMatch(/body\s*\{[^}]*font-family:\s*var\(--font-ui\);/);
  });

  it('never synthesises a bold or an italic, and sets CJK emphasis upright', () => {
    const base = readFileSync(resolve(projectRoot, 'src/theme/base.css'), 'utf8');

    expect(base).toMatch(/html\s*\{[^}]*font-synthesis:\s*none;/);
    expect(base).toMatch(/\[data-script="cjk"\] em[^{]*\{[^}]*font-style:\s*normal;[^}]*font-weight:\s*var\(--weight-semibold\);/);
  });

  it('keeps Montserrat inside the KiwiWordmark', () => {
    const wordmark = readFileSync(resolve(projectRoot, 'src/components/Brand/KiwiWordmark.tsx'), 'utf8');

    expect(wordmark).toContain('var(--font-wordmark)');
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

    expect(readme).toContain('### Typography: Source Sans 3');
    expect(readme).toContain('@fontsource-variable/source-sans-3');
    // Self-hosted: the point of the package is that there is no runtime CDN request.
    expect(readme).not.toMatch(/https?:\/\/fonts\.(googleapis|gstatic)\.com/);
  });

  it('tells external Kiwi Apps how to match the font of the public tokens', () => {
    const kiwiApps = readFileSync(resolve(projectRoot, 'KIWI-APPS.md'), 'utf8');

    expect(kiwiApps).toContain('Montserrat');
    expect(kiwiApps).toContain('@fontsource-variable/montserrat');
  });

  it('shows Source Sans 3 rather than a system font stack in Storybook', () => {
    const story = readFileSync(resolve(projectRoot, '.storybook/stories/Typography.stories.tsx'), 'utf8');

    expect(story).toContain('Source Sans 3');
    expect(story).not.toMatch(/system font stack/i);
  });
});
