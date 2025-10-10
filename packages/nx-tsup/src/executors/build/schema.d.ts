export interface BuildExecutorSchema {
  outDir: string;
  main: string;
  tsConfig: string;
  assets?: string[];
  format?: ('esm' | 'cjs' | 'iife')[];
  dts?: boolean;
  clean?: boolean;
  watch?: boolean;
  minify?: boolean;
  sourcemap?: boolean | 'inline';
  splitting?: boolean;
  treeshake?: boolean | 'smallest' | 'recommended';
  target?: string;
  platform?: 'node' | 'browser' | 'neutral';
  external?: string[];
  noExternal?: string[];
  banner?: {
    js?: string;
    css?: string;
  };
  footer?: {
    js?: string;
    css?: string;
  };
  env?: Record<string, string>;
  define?: Record<string, string>;
  inject?: string[];
  esbuildOptions?: Record<string, unknown>;
  esbuildPlugins?: string[];
}
