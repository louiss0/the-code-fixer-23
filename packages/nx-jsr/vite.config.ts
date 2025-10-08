import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';

const external = [/^@nx\//, '@nx/devkit', 'tslib', 'semver', 'dotenv'];

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index'
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external
    }
  },
  plugins: [
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true, rollupTypes: true }),
    viteStaticCopy({
      targets: [
        { src: 'generators.json', dest: '.' },
        { src: 'executors.json', dest: '.' },
        { src: 'src/**/schema.json', dest: 'schemas' }
      ]
    })
  ],
  test: {
    name: '@code-fixer-23/nx-jsr',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8'
    }
  }
});
