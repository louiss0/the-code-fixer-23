export interface BuildExecutorSchema {
  outputPath: string;
  main: string;
  tsConfig: string;
  assets?: string[];
  format?: ('esm' | 'cjs' | 'iife')[];
  dts?: boolean;
  clean?: boolean;
  watch?: boolean;
  minify?: boolean;
  sourcemap?: boolean;
}
