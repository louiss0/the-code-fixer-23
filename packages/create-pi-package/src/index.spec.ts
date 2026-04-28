import { describe, expect, it, vi } from "vitest";

import { runCli, shouldRunCli } from "./index";

describe("runCli", () => {
  it("returns the configured commander program", () => {
    const result = runCli();

    vi.spyOn(result, "action");

    expect(result.).toBeCalled();
  });
});

describe("shouldRunCli", () => {
  it("skips the cli while running in development", () => {
    expect(shouldRunCli({ DEV: true, MODE: "development" } as ImportMetaEnv)).toBe(false);
  });

  it("runs the cli for production builds", () => {
    expect(shouldRunCli({ DEV: false, MODE: "production" } as ImportMetaEnv)).toBe(true);
  });

  it("skips the cli while running tests", () => {
    expect(shouldRunCli({ DEV: false, MODE: "test" } as ImportMetaEnv)).toBe(false);
  });
});
