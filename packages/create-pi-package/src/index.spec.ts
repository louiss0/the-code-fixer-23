import { handler, setupRunCli } from "./index";

class MockPrompter {
  async askForWhatTheyWantToMake(): Promise<string[]> {
    // const choices = ["extensions", "prompts", "skills", "themes"];

    return [];
  }
}

describe("runCli", () => {
  let handlerSpy: Parameters<typeof setupRunCli>[0];
  let runCli: ReturnType<typeof setupRunCli>;
  const prompter = new MockPrompter();

  beforeEach(() => {
    handlerSpy = vi.fn(handler);
    runCli = setupRunCli(handlerSpy, {
      prompter,
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  it("returns the configured commander program", () => {
    const askForWhatTheyWantToMake = vi.spyOn(prompter, "askForWhatTheyWantToMake");

    runCli();
    expect(handlerSpy).toBeCalled();
    expect(askForWhatTheyWantToMake).toBeCalled();
  });
});
