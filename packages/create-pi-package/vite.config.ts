import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

function isExternal(id: string) {
  return id === "commander" || id === "inquirer" || id.startsWith("@inquirer/") || id.startsWith("node:");
}

export default defineConfig({
  root: packageRoot,
  build: {
    lib: {
      entry: path.resolve(packageRoot, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index",
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "node20",
    rollupOptions: {
      external: isExternal,
      output: {
        banner: "#!/usr/bin/env node",
      },
    },
  },
  plugins: [
    dts({
      entryRoot: "src",
      outDir: "dist",
      insertTypesEntry: true,
      rollupTypes: false,
      tsconfigPath: path.resolve(packageRoot, "tsconfig.lib.json"),
    }),
  ],
  test: {
    name: "@code-fixer-23/create-pi-package",
    watch: false,
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "./test-output/vitest/coverage",
      provider: "v8",
    },
  },
});
