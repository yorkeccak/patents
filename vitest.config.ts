import { defineConfig } from 'vitest/config';

// Unit tests target pure library functions only. Override the project's
// Tailwind v4 PostCSS config (which Vite's bundled loader can't parse) with an
// empty pipeline so test runs don't touch CSS at all.
export default defineConfig({
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
