import { runCli } from './lib/run-cli';

const statusCode = await runCli(process.argv.slice(2));

process.exitCode = statusCode;
