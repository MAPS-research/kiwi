import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `montserrat.css` re-declares the faces shipped by `@fontsource-variable/montserrat`
 * under the plain family name `Montserrat` (the package calls them
 * `Montserrat Variable`), so every font stack in the app can be literally
 * `'Montserrat', sans-serif`.
 *
 * That copy is the cost of the rename, and a stale copy fails quietly — a dropped
 * subset just falls back to `sans-serif` for those glyphs. These tests pin it to the
 * package: same faces, same unicode ranges, same files, and every file resolvable so
 * Vite can emit it. Regenerate `montserrat.css` (see its header) if this fails after
 * a package upgrade.
 */

const require = createRequire(import.meta.url);

const PACKAGE_STYLESHEETS = [
  '@fontsource-variable/montserrat/index.css', // normal
  '@fontsource-variable/montserrat/wght-italic.css', // italic
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

const localCssPath = resolve(__dirname, 'montserrat.css');
const localFaces = parseFaces(readFileSync(localCssPath, 'utf8'));

const packageFaces = PACKAGE_STYLESHEETS.flatMap((specifier) =>
  parseFaces(readFileSync(require.resolve(specifier), 'utf8'))
);

/** Identity of a face, ignoring the family rename we deliberately apply. */
const identity = ({ style, weight, file, unicodeRange }: Face) =>
  [style, weight, file, unicodeRange].join(' | ');

describe('self-hosted Montserrat', () => {
  it('declares the family as plain "Montserrat"', () => {
    expect(localFaces.length).toBeGreaterThan(0);
    expect([...new Set(localFaces.map((face) => face.family))]).toEqual(['Montserrat']);
  });

  it('covers every face the fontsource package ships', () => {
    expect(localFaces.map(identity).sort()).toEqual(packageFaces.map(identity).sort());
  });

  it('covers the 300-700 weights the UI uses, in both styles', () => {
    for (const style of ['normal', 'italic']) {
      const faces = localFaces.filter((face) => face.style === style);

      expect(faces.length).toBeGreaterThan(0);

      for (const face of faces) {
        const [min, max] = face.weight.split(/\s+/).map(Number);

        expect(min).toBeLessThanOrEqual(300);
        expect(max).toBeGreaterThanOrEqual(700);
      }
    }
  });

  it('resolves every font file from the npm package, with no CDN fallback', () => {
    const css = readFileSync(localCssPath, 'utf8');
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map(([, url]) =>
      url.trim().replace(/^["']|["']$/g, '')
    );

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.startsWith('@fontsource-variable/montserrat/files/'))).toBe(true);
    // A remote @font-face src would defeat self-hosting.
    expect(css).not.toMatch(/https?:\/\//);

    const packageRoot = dirname(require.resolve('@fontsource-variable/montserrat/index.css'));
    const unresolved = urls.filter(
      (url) => !existsSync(resolve(packageRoot, url.replace('@fontsource-variable/montserrat/', '')))
    );

    expect(unresolved).toEqual([]);
  });
});
