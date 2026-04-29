import { Command } from "@commander-js/extra-typings";

export function handler(
  object: Record<string, string | number | boolean>,
  deps: Record<string, unknown>,
) {
  console.log(object, deps);
}
const program = new Command();

export function setupRunCli(
  handler: (
    object: Record<string, string | number | boolean>,
    deps: Record<string, unknown>,
  ) => void,
  deps: Record<string, unknown>,
) {
  return (...args: string[]) => {
    program.action((flags) => handler(flags, deps)).parse(args);
  };
}

const deps: Record<string, unknown> = {};

if (import.meta.env.PROD) {
  setupRunCli(handler, deps)(...process.argv.slice(2));
}
