import { logger, type Tree, readProjectConfiguration } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { libraryGenerator } from "./library";
import type { LibraryGeneratorSchema } from "./schema";

describe("library generator", () => {
  // Mock prompt utils to control interactivity and user choice
  vi.mock("./prompt", () => {
    return {
      isInteractive: () => false, // default non-interactive for deterministic fallbacks
      selectOrDefault: async (
        _q: string,
        _choices: string[],
        defaultChoice: string,
      ) => defaultChoice,
    };
  });
  let tree: Tree;
  const options: LibraryGeneratorSchema = {
    name: "test-lib",
    importPath: "@test/test-lib",
    directory: "packages",
    description: "A TypeScript library built with Tsup.",
    skipFormat: true,
  };

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    vi.spyOn(logger, "info").mockImplementation(() => undefined);
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    tree = createTreeWithEmptyWorkspace();
  });

  it("should generate library with default options", async () => {
    await libraryGenerator(tree, options);

    const config = readProjectConfiguration(tree, "test-lib");
    expect(config).toBeDefined();
    expect(config.root).toBe("packages/test-lib");
    expect(config.projectType).toBe("library");
  });

  it("should create required files", async () => {
    await libraryGenerator(tree, options);

    expect(tree.exists("packages/test-lib/tsconfig.json")).toBe(true);
    expect(tree.exists("packages/test-lib/tsconfig.lib.json")).toBe(true);
    expect(tree.exists("packages/test-lib/package.json")).toBe(true);
    expect(tree.exists("packages/test-lib/tsup.config.ts")).toBe(true);
    expect(tree.exists("packages/test-lib/src/index.ts")).toBe(true);
    expect(tree.exists("packages/test-lib/README.md")).toBe(true);
  });

  it("should build through package scripts backed by tsup config", async () => {
    await libraryGenerator(tree, options);

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    const tsupConfig = tree.read("packages/test-lib/tsup.config.ts", "utf-8");

    expect(config.targets?.build).toBeUndefined();
    expect(packageJson.scripts.build).toBe("tsup");
    expect(packageJson.scripts.dev).toBe("tsup --watch");
    expect(tsupConfig).toContain("format: ['esm', 'cjs']");
    expect(tsupConfig).toContain("minify: true");
  });

  it("should test through package scripts when testRunner is vitest", async () => {
    await libraryGenerator(tree, { ...options, testRunner: "vitest" });

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    const vitestConfig = tree.read(
      "packages/test-lib/vitest.config.ts",
      "utf-8",
    );
    const specTsConfig = tree.read(
      "packages/test-lib/tsconfig.spec.json",
      "utf-8",
    );

    expect(config.targets?.test).toBeUndefined();
    expect(packageJson.scripts.test).toBe("vitest run");
    expect(vitestConfig).toContain("coverage: { provider: 'v8' }");
    expect(specTsConfig).toContain('"vitest/importMeta"');
    expect(specTsConfig).toContain('"vite/client"');
    expect(tree.exists("packages/test-lib/src/index.spec.ts")).toBe(true);
  });

  it("should add an ESM-safe jest setup when testRunner is jest", async () => {
    tree.write(
      "package.json",
      JSON.stringify({ devDependencies: { jest: "^30.0.0" } }, null, 2),
    );

    await libraryGenerator(tree, { ...options, testRunner: "jest" });

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    const jestConfig = tree.read("packages/test-lib/jest.config.ts", "utf-8");
    const specTsConfig = tree.read(
      "packages/test-lib/tsconfig.spec.json",
      "utf-8",
    );

    expect(config.targets?.test).toBeUndefined();
    expect(packageJson.scripts.test).toBe("jest");
    expect(packageJson.devDependencies.jest).toBe("^30.0.0");
    expect(jestConfig).toContain("extensionsToTreatAsEsm: ['.ts']");
    expect(jestConfig).toContain("useESM: true");
    expect(jestConfig).toContain("'^(\\\\.{1,2}/.*)\\\\.js$': '$1'");
    expect(specTsConfig).toContain('"types": [');
    expect(specTsConfig).toContain('"jest"');
    expect(specTsConfig).toContain('"node"');
    expect(tree.exists("packages/test-lib/src/index.spec.ts")).toBe(true);
  });

  it("should not add test target when testRunner is none", async () => {
    await libraryGenerator(tree, { ...options, testRunner: "none" });

    const config = readProjectConfiguration(tree, "test-lib");
    expect(config.targets?.test).toBeUndefined();
    expect(tree.exists("packages/test-lib/vitest.config.ts")).toBe(false);
    expect(tree.exists("packages/test-lib/jest.config.ts")).toBe(false);
  });

  it("should lint through package scripts when linter is eslint", async () => {
    await libraryGenerator(tree, { ...options, linter: "eslint" });

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    expect(config.targets?.lint).toBeUndefined();
    expect(packageJson.scripts.lint).toBe("eslint .");
    expect(packageJson.scripts["configure:eslint"]).toBe(
      "pnpm dlx @eslint/create-config@latest",
    );
    expect(tree.exists("packages/test-lib/eslint.config.mjs")).toBe(true);
  });

  it("should use the command package manager for eslint config creation", async () => {
    vi.stubEnv("npm_config_user_agent", "npm/10.0.0 node/v25.1.0");
    tree.write("pnpm-lock.yaml", "lockfileVersion: 9");

    await libraryGenerator(tree, { ...options, linter: "eslint" });

    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );

    expect(packageJson.scripts["configure:eslint"]).toBe(
      "npx @eslint/create-config@latest",
    );
  });

  it("should lint through package scripts when linter is biome", async () => {
    await libraryGenerator(tree, { ...options, linter: "biome" });

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    expect(config.targets?.lint).toBeUndefined();
    expect(packageJson.scripts.lint).toBe("biome lint .");
    expect(tree.exists("packages/test-lib/biome.json")).toBe(true);
  });

  it("should not add lint target when linter is none", async () => {
    await libraryGenerator(tree, { ...options, linter: "none" });

    const config = readProjectConfiguration(tree, "test-lib");
    expect(config.targets?.lint).toBeUndefined();
    expect(tree.exists("packages/test-lib/eslint.config.mjs")).toBe(false);
    expect(tree.exists("packages/test-lib/biome.json")).toBe(false);
  });

  it("should typecheck through package scripts", async () => {
    await libraryGenerator(tree, options);

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    expect(config.targets?.typecheck).toBeUndefined();
    expect(packageJson.scripts.typecheck).toBe(
      "tsc -p tsconfig.lib.json --noEmit",
    );
  });

  it("should generate tsconfig paths relative to package depth", async () => {
    await libraryGenerator(tree, {
      ...options,
      directory: "libs/shared",
    });

    const tsconfig = JSON.parse(
      tree.read("libs/shared/test-lib/tsconfig.json", "utf-8") ?? "{}",
    );
    const tsconfigLib = JSON.parse(
      tree.read("libs/shared/test-lib/tsconfig.lib.json", "utf-8") ?? "{}",
    );

    expect(tsconfig.extends).toBe("../../../tsconfig.json");
    expect(tsconfigLib.extends).toBe("../../../tsconfig.base.json");
    expect(tsconfigLib.compilerOptions.outDir).toBe("../../../dist/out-tsc");
  });

  it("should create package.json with correct metadata", async () => {
    await libraryGenerator(tree, {
      ...options,
      description: "Test library description",
    });

    const content = tree.read("packages/test-lib/package.json", "utf-8");
    const packageJson = JSON.parse(content ?? "{}");
    expect(packageJson.name).toBe("@test/test-lib");
    expect(packageJson.version).toBe("0.0.0");
    expect(packageJson.type).toBe("module");
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
  });
  it("auto-detects vitest when only vitest is present and options omitted", async () => {
    tree.write(
      "package.json",
      JSON.stringify({ devDependencies: { vitest: "^3.2.4" } }, null, 2),
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    expect(config.targets?.test).toBeUndefined();
    expect(packageJson.scripts.test).toBe("vitest run");
    expect(tree.exists("packages/test-lib/vitest.config.ts")).toBe(true);
  });

  it("auto-detects jest when only jest is present and options omitted", async () => {
    tree.write(
      "package.json",
      JSON.stringify({ devDependencies: { jest: "^29.7.0" } }, null, 2),
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    expect(config.targets?.test).toBeUndefined();
    expect(packageJson.scripts.test).toBe("jest");
    expect(tree.exists("packages/test-lib/jest.config.ts")).toBe(true);
  });

  it("when both jest and vitest are present and non-interactive, falls back to jest", async () => {
    tree.write(
      "package.json",
      JSON.stringify(
        { devDependencies: { jest: "^29.7.0", vitest: "^3.2.4" } },
        null,
        2,
      ),
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    expect(config.targets?.test).toBeUndefined();
    expect(packageJson.scripts.test).toBe("jest");
  });

  it("auto-detects eslint when only eslint is present and options omitted", async () => {
    tree.write(
      "package.json",
      JSON.stringify({ devDependencies: { eslint: "^9.37.0" } }, null, 2),
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    expect(config.targets?.lint).toBeUndefined();
    expect(packageJson.scripts.lint).toBe("eslint .");
    expect(tree.exists("packages/test-lib/eslint.config.mjs")).toBe(true);
  });

  it("when both eslint and biome are present and non-interactive, falls back to eslint", async () => {
    tree.write(
      "package.json",
      JSON.stringify(
        { devDependencies: { eslint: "^9.37.0", "@biomejs/biome": "^1.9.4" } },
        null,
        2,
      ),
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, "test-lib");
    const packageJson = JSON.parse(
      tree.read("packages/test-lib/package.json", "utf-8") ?? "{}",
    );
    expect(config.targets?.lint).toBeUndefined();
    expect(packageJson.scripts.lint).toBe("eslint .");
  });
});
