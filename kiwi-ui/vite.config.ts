import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const reactPdfRequire = createRequire(require.resolve('react-pdf'));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{
      // Resolve the worker from react-pdf's own PDF.js dependency.
      find: /^\/@react-pdf-worker(?=\?|$)/,
      replacement: reactPdfRequire.resolve('pdfjs-dist/build/pdf.worker.min.mjs'),
    }],
  },
  server: {
    open: true,
    port: 3001,
  },
  test: {
    dir: './src',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    coverage: {
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        'src/services/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        'dist/',
        'coverage/',
        'public/',
        '**/*.d.ts'
      ],
    },
  },
});
