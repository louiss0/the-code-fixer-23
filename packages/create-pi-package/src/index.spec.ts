import { beforeEach, describe, expect, it, vi } from "vitest";

import { handler, setupRunCli } from "./index";

describe("runCli", () => {
  let handlerSpy: Parameters<typeof setupRunCli>[0];
  let runCli: ReturnType<typeof setupRunCli>;

  beforeEach(() => {
    handlerSpy = vi.fn(handler);
    runCli = setupRunCli(handlerSpy, {});
  });

  it("returns the configured commander program", () => {
    runCli();
    expect(handlerSpy).toBeCalled();
  });
});
