import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * KaTeX styles used to be loaded from a hand-vendored `public/assets/katex.min.css`
 * via a <link> in index.html. Vite copies `public/` verbatim, so it never processed
 * that file's relative `url(fonts/KaTeX_*)` references and the fonts 404'd in
 * production. These are source-level guards: asserting against the built `dist/`
 * would require running a full production build inside the unit test suite, so we
 * instead pin the two things that make the build correct — the app imports the CSS
 * from the npm package (so Vite rewrites the font URLs and emits the files), and
 * the vendored copy stays gone.
 */

const projectRoot = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const KATEX_CSS_SPECIFIER = 'katex/dist/katex.min.css';

describe('KaTeX asset loading', () => {
  it('imports the KaTeX stylesheet from the npm package', () => {
    const mainTsx = readFileSync(resolve(projectRoot, 'src/main.tsx'), 'utf8');

    expect(mainTsx).toContain(KATEX_CSS_SPECIFIER);
  });

  it('does not load KaTeX CSS from a hand-vendored public/ copy', () => {
    const indexHtml = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');

    expect(indexHtml).not.toMatch(/katex/i);
    expect(existsSync(resolve(projectRoot, 'public/assets/katex.min.css'))).toBe(false);
    expect(existsSync(resolve(projectRoot, 'public/assets/fonts'))).toBe(false);
  });

  it('resolves every font referenced by the packaged stylesheet', () => {
    const cssPath = require.resolve(KATEX_CSS_SPECIFIER);
    const css = readFileSync(cssPath, 'utf8');

    const fontUrls = [...css.matchAll(/url\(([^)]+)\)/g)].map(([, url]) =>
      url.trim().replace(/^["']|["']$/g, '')
    );

    expect(fontUrls.length).toBeGreaterThan(0);

    const unresolved = fontUrls.filter(
      (url) => !existsSync(resolve(dirname(cssPath), url))
    );

    expect(unresolved).toEqual([]);
  });
});
