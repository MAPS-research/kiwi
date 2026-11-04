import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `source-sans-3.css` re-declares the faces shipped by
 * `@fontsource-variable/source-sans-3` under the plain family name `Source Sans 3`
 * (the package calls them `Source Sans 3 Variable`), the name `--font-ui` uses.
 *
 * As with `montserrat.css`, a stale copy fails quietly: a dropped subset just falls
 * back to the next font in the stack. These tests pin the copy to the package: same
 * faces, same unicode ranges, same files, and every file resolvable so Vite can emit
 * it. Regenerate `source-sans-3.css` (see its header) if this fails after a package
 * upgrade.
 */

const require = createRequire(import.meta.url);

const PACKAGE_STYLESHEETS = [
  '@fontsource-variable/source-sans-3/index.css', // normal
  '@fontsource-variable/source-sans-3/wght-italic.css', // italic
];

type Face = {
  family: string;
  style: string;
  weight: string;
  file: string;
  unicodeRange: string;
};

const parseFaces = (css: string): Face[] =>
  [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
    const declaration = (name: string) =>
      body.match(new RegExp(`${name}\\s*:\\s*([^;]+)`))?.[1].trim() ?? '';

    return {
      family: declaration('font-family').replace(/^["']|["']$/g, ''),
      style: declaration('font-style'),
      weight: declaration('font-weight'),
      file: declaration('src').match(/url\(([^)]+)\)/)?.[1].split('/').pop() ?? '',
      unicodeRange: declaration('unicode-range'),
    };
  });

const localCssPath = resolve(__dirname, 'source-sans-3.css');
const localFaces = parseFaces(readFileSync(localCssPath, 'utf8'));

const packageFaces = PACKAGE_STYLESHEETS.flatMap((specifier) =>
  parseFaces(readFileSync(require.resolve(specifier), 'utf8'))
);

/** Identity of a face, ignoring the family rename we deliberately apply. */
const identity = ({ style, weight, file, unicodeRange }: Face) =>
  [style, weight, file, unicodeRange].join(' | ');

describe('self-hosted Source Sans 3', () => {
  it('declares the family as plain "Source Sans 3"', () => {
    expect(localFaces.length).toBeGreaterThan(0);
    expect([...new Set(localFaces.map((face) => face.family))]).toEqual(['Source Sans 3']);
  });

  it('covers every face the fontsource package ships', () => {
    expect(localFaces.map(identity).sort()).toEqual(packageFaces.map(identity).sort());
  });

  it('covers the 400 and 600 weights the UI uses, upright and italic', () => {
    for (const style of ['normal', 'italic']) {
      const faces = localFaces.filter((face) => face.style === style);

      expect(faces.length).toBeGreaterThan(0);

      for (const face of faces) {
        const [min, max] = face.weight.split(/\s+/).map(Number);

        expect(min).toBeLessThanOrEqual(400);
        expect(max).toBeGreaterThanOrEqual(600);
      }
    }
  });

  it('resolves every font file from the npm package, with no CDN fallback', () => {
    const css = readFileSync(localCssPath, 'utf8');
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map(([, url]) =>
      url.trim().replace(/^["']|["']$/g, '')
    );

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.startsWith('@fontsource-variable/source-sans-3/files/'))).toBe(
      true
    );
    // A remote @font-face src would defeat self-hosting.
    expect(css).not.toMatch(/https?:\/\//);

    const packageRoot = dirname(require.resolve('@fontsource-variable/source-sans-3/index.css'));
    const unresolved = urls.filter(
      (url) =>
        !existsSync(resolve(packageRoot, url.replace('@fontsource-variable/source-sans-3/', '')))
    );

    expect(unresolved).toEqual([]);
  });
});
