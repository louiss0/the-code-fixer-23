import { Command } from "@commander-js/extra-typings";

interface Deps {
  prompter: {
    askForWhatTheyWantToMake(): Promise<string[]>;
  };
}

export async function handler(object: Record<string, string | number | boolean>, deps: Deps) {
  const choices = await deps.prompter.askForWhatTheyWantToMake();
  console.log(choices);

  // console.log(object, deps);
}
const program = new Command();

export function setupRunCli(
  handler: (object: Record<string, string | number | boolean>, deps: Deps) => Promise<void>,
  deps: Deps,
) {
  return (...args: string[]) => {
    program
      .action(async (flags) => {
        await handler(flags, deps);
      })
      .parse(args);
  };
}

const deps: Deps = {};

if (import.meta.env.PROD) {
  setupRunCli(handler, deps)(...process.argv.slice(2));
}
