import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';

const external = [/^@nx\//, '@nx/devkit', 'tslib'];

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
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8'
    }
  }
});
