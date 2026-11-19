import { defineConfig } from 'vite';

// base './' — сайт работает по любому пути GitHub Pages (например /demo-repository/).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: { include: ['tests/**/*.test.js'] },
});
