import { defineConfig } from 'tsup';

export default defineConfig([
  // Package build: ESM + CJS + type declarations, for apps with a bundler.
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'es2020',
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  },
  // Single-file browser build for zero-build apps: <script src="…"> then
  // KiwiApp.create({...}). This is what kiwi-ui serves at /sdk/v1/.
  {
    entry: { 'kiwi-app-sdk': 'src/index.ts' },
    format: ['iife'],
    globalName: 'KiwiApp',
    dts: false,
    clean: false,
    sourcemap: true,
    target: 'es2020',
  },
]);
