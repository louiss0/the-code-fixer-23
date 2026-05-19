import { detectInvokedPackageManager, resolvePackageManager } from "./index";

describe("detectInvokedPackageManager", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects pnpm from the invoking user agent", () => {
    expect(
      detectInvokedPackageManager("pnpm/10.0.0 npm/? node/v22.0.0 win32 x64"),
    ).toBe("pnpm");
  });

  it("falls back to other command signals when npm_config_user_agent is missing", () => {
    vi.stubEnv("npm_execpath", "/Users/test/.local/share/pnpm/pnpm.cjs");

    expect(detectInvokedPackageManager()).toBe("pnpm");
  });
});

describe("resolvePackageManager", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the package manager that invoked the generator", async () => {
    vi.stubEnv(
      "npm_config_user_agent",
      "pnpm/10.0.0 npm/? node/v22.0.0 win32 x64",
    );
    const askForWhichPackageManager = vi.fn();

    await expect(
      resolvePackageManager({ askForWhichPackageManager }),
    ).resolves.toBe("pnpm");
    expect(askForWhichPackageManager).not.toBeCalled();
  });

  it("defaults to npm when no invoked package manager signal is available", async () => {
    vi.stubEnv("npm_config_user_agent", "");
    vi.stubEnv("npm_execpath", "");
    vi.stubEnv("npm_lifecycle_script", "");
    const askForWhichPackageManager = vi.fn();

    await expect(
      resolvePackageManager({ askForWhichPackageManager }),
    ).resolves.toBe("npm");
    expect(askForWhichPackageManager).not.toBeCalled();
  });
});
