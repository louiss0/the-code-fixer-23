import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';

const external = [
  /^@nx\//,
  '@nx/devkit',
  'tslib',
  'node:path',
  'node:fs',
  'node:child_process',
  'readline',
  'assert',
  'enquirer',
  'tsup',
  'esbuild',
];

export default defineConfig({
  build: {
    lib: {
      // Keep root index as entry for package exports
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index',
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external,
      // Build generator/executor modules as separate chunks and preserve folder structure
      input: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'generators/library/library': path.resolve(
          __dirname,
          'src/generators/library/library.ts'
        ),
        'executors/build/build': path.resolve(
          __dirname,
          'src/executors/build/build.ts'
        ),
        'migrations/rename-outputPath-to-outDir': path.resolve(
          __dirname,
          'src/migrations/rename-outputPath-to-outDir.ts'
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
        // Keep JSON manifests at package root (they are already source-controlled)
        { src: 'generators.json', dest: '.' },
        { src: 'executors.json', dest: '.' },
        { src: 'migrations.json', dest: '.' },
        // Copy generator assets into dist so generators.json dist paths resolve
        { src: 'src/generators/**/schema.json', dest: 'generators' },
        { src: 'src/generators/**/files', dest: 'generators' },
        // Copy executor schema
        { src: 'src/executors/**/schema.json', dest: 'executors' },
      ],
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8',
    },
  },
});
