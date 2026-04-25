import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';

const external = [
  /^@nx\//,
  '@nx/devkit',
  'tslib',
  'semver',
  'dotenv',
  'enquirer',
  // Node built-ins used by executors/generators
  'path',
  'fs',
  'child_process',
  'node:path',
  'node:fs',
  'node:child_process',
];

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index',
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external,
      input: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'generators/library/library': path.resolve(
          __dirname,
          'src/generators/library/library.ts'
        ),
        'executors/publish/publish': path.resolve(
          __dirname,
          'src/executors/publish/publish.ts'
        ),
        'executors/version/version': path.resolve(
          __dirname,
          'src/executors/version/version.ts'
        ),
        'executors/validate/validate': path.resolve(
          __dirname,
          'src/executors/validate/validate.ts'
        ),
      },
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: ({ name }) => `${name}.js`,
      },
    },
  },
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      insertTypesEntry: true,
      rollupTypes: true,
      tsconfigPath: path.resolve(__dirname, 'tsconfig.lib.json'),
    }),
    viteStaticCopy({
      targets: [
        { src: path.resolve(__dirname, 'generators.json'), dest: '.' },
        { src: path.resolve(__dirname, 'executors.json'), dest: '.' },
        {
          src: path.resolve(__dirname, 'src/generators/**/schema.json'),
          dest: 'generators',
          structured: true,
        },
        {
          src: path.resolve(__dirname, 'src/generators/**/files/**/*'),
          dest: 'generators',
          structured: true,
        },
        {
          src: path.resolve(__dirname, 'src/executors/**/schema.json'),
          dest: 'executors',
          structured: true,
        },
      ],
    }),
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
      provider: 'v8',
    },
  },
});
