import { writeFile } from "node:fs";
import { handler, setupRunCli } from "./index";
import type {
  AllowedBundlers,
  AllowedFolderChioceValues,
  AllowedTestRunnerChioces,
  Prompter,
} from "./index";

class MockPrompter implements Prompter {
  askForWhatTheyWantToMake(): Promise<AllowedFolderChioceValues> {
    return Promise.resolve([]);
  }

  askForWhichTestRunner(): Promise<AllowedTestRunnerChioces> {
    return Promise.resolve("vitest");
  }

  askForWhichBundler(): Promise<AllowedBundlers> {
    return Promise.resolve("rollup");
  }
}

function expectWriteFileToWriteBasedOnExpectedValue(chioce: AllowedFolderChioceValues[number]) {
  const chioceToFileAndContentMap: Record<
    AllowedFolderChioceValues[number],
    { file: string; content: string }
  > = {
    extensions: {
      file: "extensions/index.ts",
      content: `export default function (pi:ExtensionAPI) {

      }`,
    },
    prompts: {
      file: "prompts/example.md",
      content: `---
    description:   Summarize text
    argument-hint: "<tone> <word_limit> <text>"
    ---

    Summarize the following text.

    Tone: $1
    Word limit: $2
    Text: $\{@:3}

    Return only the summary.`,
    },
    skills: {
      file: "skills/example/SKILL.md",
      content: `---
    name: summarize-text
    description: Summarize user-provided text into a concise paragraph. Use when the user asks to summarize, condense, or extract key ideas from text.
    license: MIT
    ---

    # Summarize Text

    ## Purpose

    Condense input text into a clear, short summary while preserving key ideas.

    ## When to Use

    - User asks to "summarize", "shorten", or "condense" text
    - Large blocks of text need quick understanding

    ## Instructions

    1. Read the full input text carefully.
    2. Identify the main ideas and supporting points.
    3. Remove redundancy and minor details.
    4. Produce a concise summary (default ≤ 100 words unless specified).
    5. Match tone if the user provides one.

    ## Output

    - A single paragraph summary
    - No extra commentary`,
    },
    themes: {
      file: "themes/theme.json",
      content: `{
      "$schema": "https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json",
      "name": "my-theme",
      "vars": {
        "blue": "#0066cc",
        "gray": 242
      },
      "colors": {
        "accent": "blue",
        "muted": "gray",
        "text": ""
      }
    }`,
    },
  };

  expect(writeFile).toBeCalledWith(
    chioceToFileAndContentMap[chioce].file,
    chioceToFileAndContentMap[chioce].content,
  );
}

describe("runCli", () => {
  let handlerSpy: Parameters<typeof setupRunCli>[0];
  let runCli: ReturnType<typeof setupRunCli>;
  const prompter = new MockPrompter();
  const createPiFolderBasedOnChioces = vi.fn();

  beforeEach(() => {
    handlerSpy = vi.fn(handler);
    runCli = setupRunCli(handlerSpy, {
      prompter,
      createPiFolderBasedOnChioces,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("asks the user to choose what they want to make then creates the folder based on the choice", () => {
    const chioceCombosWithoutExtension = [
      ["prompts", "skills"],
      ["prompts"],
      ["skills"],
      ["themes"],
    ] as unknown as Array<AllowedFolderChioceValues>;

    it.for(chioceCombosWithoutExtension)(
      "For %i %i %i %i, prompter and createPiFolderBasedOnChioces are called with the correct values",

      async (values) => {
        const askForWhatTheyWantToMake = vi
          .spyOn(prompter, "askForWhatTheyWantToMake")
          .mockResolvedValue(values);

        runCli();

        expect(handlerSpy).toBeCalled();
        expect(askForWhatTheyWantToMake).toBeCalled();
        expect(createPiFolderBasedOnChioces).toBeCalledWith(values);

        values.forEach((value) => {
          expectWriteFileToWriteBasedOnExpectedValue(value);
        });
      },
    );

    const choiceCombosWithExtension = [
      ["extensions", "prompts", "skills", "themes"],
      ["extensions", "skills"],
      ["extensions", "prompts"],
      ["extensions", "themes"],
      ["extensions"],
    ] as unknown as Array<AllowedFolderChioceValues>;

    it.for(choiceCombosWithExtension)(
      "For %i %i %i %i, prompter and createPiFolderBasedOnChioces are called with the correct values",

      async (values) => {
        const askForWhatTheyWantToMake = vi
          .spyOn(prompter, "askForWhatTheyWantToMake")
          .mockResolvedValue(values);

        runCli();

        expect(handlerSpy).toBeCalled();
        expect(askForWhatTheyWantToMake).toBeCalled();

        const askForTestRunner = vi.spyOn(prompter, "askForWhichTestRunner");
        const askForWhichBundler = vi.spyOn(prompter, "askForWhichBundler");

        expect(askForTestRunner).toBeCalled();
        expect(askForWhichBundler).toBeCalled();

        expect(createPiFolderBasedOnChioces).toBeCalledWith(values);
        values.forEach((value) => {
          expectWriteFileToWriteBasedOnExpectedValue(value);
        });
      },
    );
  });

  describe("User chooses to make extensions and they choose a test runner", () => {
    const testRunnerToConfigFileAndContentMap: Record<
      AllowedTestRunnerChioces,
      { file: string; content: string }
    > = {
      vitest: {
        file: "",
        content: `// vitest.config.ts
        import { defineConfig } from 'vitest/config';

        export default defineConfig({
          test: {
            environment: 'node',
            include: ['src/**/*.test.ts'],
            coverage: {
              provider: 'v8',
              reporter: ['text', 'html']
            }
          }
        });`,
      },
      jest: {
        file: "jest.config.cjs",
        content: `/** @type {import('jest').Config} */
        module.exports = {
          testEnvironment: 'node',

          extensionsToTreatAsEsm: ['.ts'],

          transform: {
            '^.+\\.ts$': [
              'ts-jest',
              {
                useESM: true,
                tsconfig: './tsconfig.spec.json'
              }
            ]
          },

          moduleNameMapper: {
            '^(\\.{1,2}/.*)\\.js$': '$1'
            },

          testMatch: ['**/*.test.ts']
          };`,
      },
    };

    it.for(Object.keys(testRunnerToConfigFileAndContentMap) as Array<AllowedTestRunnerChioces>)(
      "For $i test runner file and content are written",
      async (testRunner) => {
        const askForWhatTheyWantToMake = vi
          .spyOn(prompter, "askForWhatTheyWantToMake")
          .mockResolvedValue(["extensions"]);

        const askForWhichTestRunner = vi.spyOn(prompter, "askForWhichTestRunner");

        runCli();

        expect(askForWhatTheyWantToMake).toBeCalled();

        expect(askForWhichTestRunner).toBeCalledWith(testRunner);

        expect(writeFile).toBeCalledWith(
          testRunnerToConfigFileAndContentMap[testRunner].file,
          testRunnerToConfigFileAndContentMap[testRunner].content,
        );

        expect(createPiFolderBasedOnChioces).toBeCalledWith(["extensions"]);
      },
    );
  });
});
