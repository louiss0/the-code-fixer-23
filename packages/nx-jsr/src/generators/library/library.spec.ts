import { logger, type Tree, readProjectConfiguration } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { libraryGenerator } from "./library";
import type { LibraryGeneratorSchema } from "./schema";

describe("library generator", () => {
  let tree: Tree;
  const options: LibraryGeneratorSchema = {
    name: "test",
    scope: "scope",
  };

  beforeEach(() => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    vi.spyOn(logger, "info").mockImplementation(() => undefined);
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    tree = createTreeWithEmptyWorkspace();
  });

  it("should generate in standalone mode by default (current directory)", async () => {
    await libraryGenerator(tree, options);
    // Standalone: no Nx project should be registered
    expect(() => readProjectConfiguration(tree, "test")).toThrow();
    // Files should exist in current directory
    expect(tree.exists("jsr.json")).toBe(true);
    expect(tree.exists("src/index.ts")).toBe(true);

    const jsrJson = JSON.parse(tree.read("jsr.json", "utf-8") ?? "{}");
    expect(jsrJson).toMatchObject({
      $schema: "https://jsr.io/schema/config-file.v1.json",
      name: "@scope/test",
      publish: {
        include: ["LICENSE.txt", "README.md", "src/**/*"],
        exclude: ["src/**/*.test.ts"],
      },
    });
  });

  it("should generate in subdirectory with project name when directory is specified", async () => {
    await libraryGenerator(tree, {
      ...options,
      directory: "packages",
      skipFormat: true,
      skipInstall: true,
    });
    const config = readProjectConfiguration(tree, "test");
    expect(config).toBeDefined();
    expect(config.root).toBe("packages/test");
    expect(tree.exists("packages/test/jsr.json")).toBe(true);
    expect(tree.exists("packages/test/src/index.ts")).toBe(true);

    const projectPackageJson = JSON.parse(
      tree.read("packages/test/package.json", "utf-8") ?? "{}",
    );
    expect(projectPackageJson.devDependencies).toBeUndefined();

    const rootPackageJson = JSON.parse(
      tree.read("package.json", "utf-8") ?? "{}",
    );
    expect(rootPackageJson.devDependencies.vitest).toBe("*");
  }, 20000);

  it("should use nx:run-commands for biome lint targets", async () => {
    await libraryGenerator(tree, {
      ...options,
      directory: "packages",
      linter: "biome",
      formatter: "none",
      skipFormat: true,
      skipInstall: true,
    });

    const config = readProjectConfiguration(tree, "test");

    expect(config.targets?.lint).toMatchObject({
      executor: "nx:run-commands",
      options: {
        commands: ["biome lint packages/test"],
      },
    });
  });

  it("should use nx:run-commands for formatter targets", async () => {
    await libraryGenerator(tree, {
      ...options,
      directory: "packages",
      linter: "eslint",
      formatter: "prettier",
      skipFormat: true,
      skipInstall: true,
    });

    const config = readProjectConfiguration(tree, "test");

    expect(config.targets?.format).toMatchObject({
      executor: "nx:run-commands",
      options: {
        commands: ["prettier --write packages/test"],
      },
    });
  });

  it("should allow importPath to override the scope convention", async () => {
    await libraryGenerator(tree, {
      ...options,
      importPath: "@other/custom",
      skipFormat: true,
    });

    const jsrJson = JSON.parse(tree.read("jsr.json", "utf-8") ?? "{}");
    expect(jsrJson.name).toBe("@other/custom");
  });

  it('should treat directory="." as standalone mode', async () => {
    await libraryGenerator(tree, { ...options, directory: "." });
    // Standalone: no Nx project should be registered
    expect(() => readProjectConfiguration(tree, "test")).toThrow();
    expect(tree.exists("jsr.json")).toBe(true);
    expect(tree.exists("src/index.ts")).toBe(true);
  });
});
