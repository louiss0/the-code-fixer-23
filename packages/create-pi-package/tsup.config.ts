import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: false,
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  minify: false,
  sourcemap: false,
  target: 'node20',
  tsconfig: './tsconfig.tsup.json'
});
