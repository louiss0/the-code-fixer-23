import { Command } from "@commander-js/extra-typings";

const newLocal: Parameters<Command["action"]>[0] = function (value) {
  console.log(value);
};
export function runCli(...args: string[]) {
  const program = new Command();

  return program
    .option("-e --extension", "Do you want to create a package with an extension?")
    .action(newLocal)
    .parse(args);
}

export function shouldRunCli(environment: ImportMetaEnv) {
  return !environment.DEV && environment.MODE !== "test";
}

if (shouldRunCli(import.meta.env)) {
  runCli(...process.argv.slice(2));
}
