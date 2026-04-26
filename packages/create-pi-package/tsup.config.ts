import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  minify: false,
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'node20',
  tsconfig: 'tsconfig.build.json',
});
