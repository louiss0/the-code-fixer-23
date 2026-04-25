import { runCli } from './lib/run-cli.js';

const statusCode = await runCli(process.argv.slice(2));

process.exitCode = statusCode;
