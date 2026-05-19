import { writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  type BashOperations,
  CustomEditor,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  type ExtensionAPI,
  truncateTail,
} from "@mariozechner/pi-coding-agent";
import type {
  AutocompleteItem,
  AutocompleteProvider,
  AutocompleteSuggestions,
} from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

const nushellGuidelines = [
  "Prefer Nushell-native commands over Bash-style text pipelines. Nushell works best when commands pass structured values such as lists, records, and tables instead of plain text.",
  "Do not assume Nushell is Bash. Avoid Bash-only syntax such as test brackets, awk-heavy parsing, sed-heavy parsing, xargs-first workflows, and output redirection with >.",
  "Use `save` for writing pipeline output to a file. Example: `'hello' | save output.txt` instead of `echo 'hello' > output.txt`.",
  "When command output is a string with multiple lines, convert it into a list before processing it. Use `lines` for newline-separated output.",
  "When command output is a delimited string, convert it before filtering or mapping. Use `split row` to create a list and `split column` to create a table.",
  "Use `split words` when a string needs to become a list of shell-like words, but do not use it as a full Bash parser.",
  "Use `str trim` before comparing strings that may contain extra whitespace.",
  "Use `str contains`, `str starts-with`, `str ends-with`, `str replace`, and regex operators instead of piping through grep, sed, or awk when the data is already in Nushell.",
  "Prefer `where` for filtering structured data. Example: `ls | where type == dir` instead of `ls -d */`.",
  "Prefer `get`, `select`, `reject`, `rename`, `insert`, `update`, and `upsert` for shaping records and tables instead of parsing display output.",
  "When iterating over lists or tables, use `each`. Remember that a table is a list of records, so `each` receives one row record at a time.",
  "When a closure inside `each` returns a stream and the result should be flattened, use `each --flatten`.",
  "For recursive file discovery, prefer Nushell glob patterns such as `ls **/*.rs` instead of Bash `find . -name '*.rs'`.",
  "Treat globs and strings differently. Quoted strings like `'*.txt'` or `\"*.txt\"` are literal strings, while bare patterns like `*.txt` may be interpreted as globs by commands that accept globs.",
  "When a string must be used as a glob, convert it explicitly with `into glob`.",
  "When a glob must be treated as literal text, convert it explicitly with `into string` or quote it carefully depending on the target command.",
  "Use `glob` when the agent needs a list of matching paths as data. Example: `glob **/*.nu` returns a list of fully qualified pathnames.",
  "Use `path` subcommands for path manipulation instead of manual string splitting. Use `path split`, `path parse`, `path basename`, `path dirname`, `path join`, and `path expand` as appropriate.",
  "Do not split paths using `/` or `\\` manually. Use `path split` so the command works across platforms.",
  "When a value represents a filesystem path, prefer path-aware commands and path annotations where possible instead of treating the path as a plain string.",
  "Use `open` for reading structured files when possible. Nushell can load formats like JSON, TOML, YAML, CSV, and others into structured data.",
  "After `open`, operate on the structured value directly. Example: `open package.json | get scripts` instead of catting the file and parsing text.",
  "Use `to json`, `to yaml`, `to toml`, or similar format converters when the agent needs to serialize structured data back into text.",
  "Use `from json`, `from yaml`, `from toml`, `from csv`, or similar parsers when external command output returns structured text.",
  "If an external command returns plain text, immediately convert it into Nushell data before processing. Common conversions are `lines`, `split row`, `split column`, `parse`, or `from json`.",
  "Prefer external commands only when Nushell does not provide the needed behavior or when the external tool is the actual target, such as `git`, `npm`, `go`, or `cargo`.",
  "Use `^command` when the agent must force execution of an external command that has the same name as a Nushell command.",
  "Do not rely on Unix-only tools such as grep, sed, awk, find, xargs, tr, or cut unless the task explicitly requires them or the environment is known to provide them.",
  "For command success and failure, prefer Nushell error handling instead of Bash `$?` habits.",
  "Avoid producing commands that depend on shell-specific quoting tricks. Prefer Nushell lists, records, and variables to build arguments safely.",
  "When passing multiple arguments to a command, keep them as separate arguments rather than one joined string whenever possible.",
  "When the agent receives a command as a single string, decide whether it is meant to be executed as text or transformed into data. For data transformation, convert the string using `lines`, `split row`, `split words`, `parse`, or a `from ...` command.",
  "When transforming Bash-like command output, first identify the output shape: newline list, delimiter-separated rows, key-value lines, JSON/YAML/TOML, filesystem paths, or free text.",
  "For newline command output, use: `<command> | lines`.",
  "For comma-separated values, use: `<string> | split row ','` for a list or `<string> | split column ','` for columns.",
  "For whitespace-separated values, use: `<string> | split words`.",
  "For key-value text, prefer `parse` or `split column` followed by `rename` so the result becomes a table with meaningful column names.",
  "For JSON output from tools, request JSON from the tool when possible and pipe to `from json` if Nushell does not parse it automatically.",
  "Prefer `http get` and Nushell-native JSON handling instead of `curl | jq` for simple API reads.",
  "Prefer `select field1 field2` instead of `jq '{field1, field2}'` when working with structured records or tables.",
  "Prefer `where name =~ 'pattern'` or `find` over `grep` when filtering Nushell values.",
  "Prefer `str replace` over `sed` for simple string replacements.",
  "Prefer `math`, `length`, `first`, `last`, `sort-by`, `uniq`, and `group-by` over Bash pipelines when working with lists or tables.",
  "Before writing a Nushell command, ask: 'What type is flowing through the pipeline right now: string, list, record, table, path, glob, or binary?'",
  "Do not parse Nushell table display output. The display table is for humans; use the underlying structured values instead.",
  "When in doubt, make the pipeline more explicit: convert strings into lists, lists into tables, tables into selected records, and records into serialized output only at the end.",
];

const nushellRipgrepGuidelines = [
  "Use `rg` as the preferred external search tool for source-code and text search. It is fast, cross-platform, respects ignore files by default, and is commonly available in agent coding environments.",
  "Prefer `rg --json` when the search results need to be filtered, grouped, transformed, or consumed by later Nushell commands.",
  "When using `rg --json`, pipe the output into `from json --objects` so each JSON line becomes a Nushell value.",
  "Use this pattern for structured ripgrep results: `rg --json 'pattern' | from json --objects | where type == 'match'`.",
  "After parsing `rg --json`, access fields through records instead of parsing text. Common fields are `data.path.text`, `data.line_number`, `data.lines.text`, and `data.submatches`.",
  "Use this pattern to get matching files: `rg --json 'pattern' | from json --objects | where type == 'match' | get data.path.text | uniq`.",
  "Use this pattern to create a clean match table: `rg --json 'pattern' | from json --objects | where type == 'match' | select data.path.text data.line_number data.lines.text`.",
  "When plain text output is enough for humans, normal `rg 'pattern'` is acceptable. When another Nushell command must consume the result, prefer `rg --json`.",
  "Avoid parsing normal ripgrep output with `split row ':'` unless the command is intentionally simple. File paths and matched text can contain colons, so plain text parsing is fragile.",
  "If normal `rg` output must be transformed, prefer flags that make the output shape simple, such as `--files`, `--files-with-matches`, `--count`, or `--line-number`.",
  "For file discovery, prefer `rg --files` when respecting `.gitignore` matters. Pipe it through `lines` to convert the output into a Nushell list.",
  "Use this pattern for ignored-aware file lists: `rg --files | lines`.",
  "Use this pattern for filtering files with Nushell after discovery: `rg --files | lines | where $it =~ '\\.ts$'`.",
  "Use this pattern for searching only specific file types: `rg --json -t ts 'pattern' | from json --objects | where type == 'match'`.",
  "Use `-g` globs with `rg` when the file filter belongs to ripgrep. Example: `rg --json 'pattern' -g '*.go' | from json --objects`.",
  "Use Nushell `where`, `get`, `select`, `group-by`, `sort-by`, and `uniq` after `from json --objects` instead of using grep, awk, sed, or cut on ripgrep output.",
  "When the agent needs only filenames, prefer `rg --files-with-matches 'pattern' | lines` over parsing full match output.",
  "When the agent needs counts, prefer `rg --count 'pattern' | lines` for simple use, or use `rg --json` if the counts need reliable structured handling.",
  "When invoking ripgrep from Nushell, use `^rg` if there is any chance of name collision or command shadowing.",
  "Do not use `rg` as a replacement for structured file parsing. For JSON, YAML, TOML, CSV, and similar formats, prefer `open` or `from ...` commands when the task depends on syntax-aware data.",
];

const nushellTextReplacementGuidelines = [
  "Do not use Python as the default tool for simple text replacement. Prefer Nushell's built-in `str replace` pipeline so the workflow does not depend on Python being installed.",
  "Use `str replace` for single replacement operations on strings.",
  "Use `str replace --all` when every occurrence should be replaced instead of only the first occurrence.",
  "Use `str replace --regex` when the search pattern is a regular expression.",
  "Use `str replace --all --regex` when every regex match should be replaced.",
  "Use capture groups with `str replace --regex` when restructuring text.",
  "Use `open --raw <file>` when reading a file as plain text for replacement.",
  "Write modified file contents with `save --force <file>` after replacement.",
  "Use this pattern for in-place text replacement: `open --raw file.txt | str replace --all 'old' 'new' | save --force file.txt`.",
  "Use `str replace` on table columns when replacing text inside structured Nushell data instead of flattening the table into text.",
  "Use `each` when applying text replacement across many files discovered by `fd`, `rg --files`, or `glob`.",
  "Use this pattern for many files: `fd -e ts | lines | each { |f| open --raw $f | str replace --all 'old' 'new' | save --force $f }`.",
  "Prefer `str replace` over Python, Perl, sed, or awk for simple text replacement tasks.",
  "Do not use Python one-liners like `python -c` or temporary Python scripts unless the replacement logic requires parsing, AST transforms, or complex multi-file programmatic logic.",
  "For structured files such as JSON, TOML, YAML, or CSV, prefer `open`, modify the structured value, then `save --force` instead of raw string replacement.",
  "Before replacing text in files, decide whether the target is plain text or structured data. Plain text can use `open --raw | str replace`; structured data should use `open` and data transformations.",
  "Use `str escape-regex` when user-provided literal text must be safely inserted into a regex pattern.",
  "Avoid regex replacement when literal replacement is enough. Literal replacement is easier to reason about and safer for agents.",
  "Prefer previewing affected files with `rg` before rewriting them.",
  "Use `rg --files-with-matches 'old' | lines` to discover candidate files before batch replacement.",
  "Use this safe batch pattern: `rg --files-with-matches 'old' | lines | each { |f| open --raw $f | str replace --all 'old' 'new' | save --force $f }`.",
  "Avoid replacing text in binary files, lock files, generated directories, dependency directories, or build outputs unless explicitly requested.",
  "Use `fd` or `rg --files` with ignore-aware defaults to avoid accidentally modifying dependency folders such as `node_modules`, `.git`, `dist`, `build`, `target`, or coverage outputs.",
  "Use `save --append` only when intentionally appending. Use `save --force` when overwriting a file with transformed contents.",
  "Do not use shell redirection as the default Nushell file-writing pattern. Prefer `save`.",
];

const NUSHELL_COMMAND = "nu";
const CANCEL_HINT = "Press Escape to cancel.";
const ENV_VARIABLE_NAMES = Object.keys(process.env).sort();

function getEnvSuggestions(prefix: string): AutocompleteItem[] {
  const normalizedPrefix = prefix.toLowerCase();

  return ENV_VARIABLE_NAMES.filter((name) =>
    prefix ? name.toLowerCase().startsWith(normalizedPrefix) : true,
  ).map((name) => ({
    value: name,
    label: name,
    description: "Environment variable",
  }));
}

class NuAutocompleteProvider implements AutocompleteProvider {
  constructor(private readonly baseProvider: AutocompleteProvider) {}

  async getSuggestions(
    lines: string[],
    cursorLine: number,
    cursorCol: number,
    options: { signal: AbortSignal; force?: boolean },
  ): Promise<AutocompleteSuggestions | null> {
    const currentLine = lines[cursorLine] ?? "";
    const textBeforeCursor = currentLine.slice(0, cursorCol);
    const envPrefix = textBeforeCursor.match(/\$env(?:\.([A-Za-z0-9_]*))?$/);
    if (envPrefix) {
      const propPrefix = envPrefix[1] ?? "";
      const items = getEnvSuggestions(propPrefix);
      if (items.length > 0) {
        return {
          items,
          prefix: propPrefix,
        };
      }
    }

    const variablePrefix = textBeforeCursor.match(/\$[A-Za-z0-9_]*$/);
    if (variablePrefix && "$env".startsWith(variablePrefix[0])) {
      return {
        items: [
          {
            value: "$env",
            label: "$env",
            description: "Nushell environment record",
          },
        ],
        prefix: variablePrefix[0],
      };
    }

    return this.baseProvider.getSuggestions(
      lines,
      cursorLine,
      cursorCol,
      options,
    );
  }

  applyCompletion(
    lines: string[],
    cursorLine: number,
    cursorCol: number,
    item: AutocompleteItem,
    prefix: string,
  ) {
    return this.baseProvider.applyCompletion(
      lines,
      cursorLine,
      cursorCol,
      item,
      prefix,
    );
  }
}

class NuEditor extends CustomEditor {
  override setAutocompleteProvider(provider: AutocompleteProvider) {
    super.setAutocompleteProvider(new NuAutocompleteProvider(provider));
  }
}

function killNushellProcessTree(pid?: number) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    process.kill(pid, "SIGTERM");
  }
}

const nuOperations: BashOperations = {
  exec(command, cwd, options) {
    return new Promise((resolve, reject) => {
      const child = spawn(NUSHELL_COMMAND, getNuArgs(command), {
        cwd,
        detached: process.platform !== "win32",
        env: options.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let timedOut = false;
      const timeoutHandle = options.timeout
        ? setTimeout(() => {
            timedOut = true;
            killNushellProcessTree(child.pid);
          }, options.timeout * 1000)
        : undefined;

      const abortHandler = () => {
        killNushellProcessTree(child.pid);
      };

      options.signal?.addEventListener("abort", abortHandler, { once: true });

      child.stdout?.on("data", options.onData);
      child.stderr?.on("data", options.onData);

      child.on("error", (error) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        options.signal?.removeEventListener("abort", abortHandler);
        reject(error);
      });

      child.on("close", (code) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        options.signal?.removeEventListener("abort", abortHandler);

        if (options.signal?.aborted) {
          reject(new Error("aborted"));
          return;
        }

        if (timedOut) {
          reject(new Error(`timeout:${options.timeout}`));
          return;
        }

        resolve({ exitCode: code ?? 1 });
      });
    });
  },
};

function getNuArgs(command: string) {
  return ["-c", command];
}

function formatToolOutput(stdout: string, stderr: string, exitCode: number) {
  const output = [stdout, stderr].filter(Boolean).join("\n").trim();
  if (output) {
    return output;
  }

  return `(command exited with code ${exitCode})`;
}

async function executeNushellCommand(
  command: string,
  cwd: string,
  signal?: AbortSignal,
  onChunk?: (output: string, exitCode?: number) => void,
) {
  return new Promise<{
    output: string;
    exitCode: number;
    cancelled: boolean;
    truncated: boolean;
  }>((resolve, reject) => {
    const child = spawn(NUSHELL_COMMAND, getNuArgs(command), {
      cwd,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const emitUpdate = (code?: number) => {
      if (!onChunk) {
        return;
      }

      onChunk(
        formatToolOutput(
          Buffer.concat(stdoutChunks).toString("utf-8"),
          Buffer.concat(stderrChunks).toString("utf-8"),
          code ?? 0,
        ),
        code,
      );
    };

    const abortHandler = () => {
      killNushellProcessTree(child.pid);
    };

    signal?.addEventListener("abort", abortHandler, { once: true });

    if (onChunk) {
      onChunk(CANCEL_HINT);
    }

    child.stdout?.on("data", (data) => {
      stdoutChunks.push(Buffer.from(data));
      emitUpdate();
    });

    child.stderr?.on("data", (data) => {
      stderrChunks.push(Buffer.from(data));
      emitUpdate();
    });

    child.on("error", (error) => {
      signal?.removeEventListener("abort", abortHandler);
      reject(error);
    });

    child.on("close", async (code) => {
      signal?.removeEventListener("abort", abortHandler);

      const exitCode = code ?? 1;
      const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
      const stderr = Buffer.concat(stderrChunks).toString("utf-8");
      const output = [stdout, stderr].filter(Boolean).join("\n").trim();
      const truncation = truncateTail(output, {
        maxBytes: DEFAULT_MAX_BYTES,
        maxLines: DEFAULT_MAX_LINES,
      });

      emitUpdate(exitCode);

      let finalOutput = "";

      if (truncation.truncated) {
        const timestamp = Date.now();
        const filename = `nu-tool-truncated-${timestamp}.txt`;
        const filepath = path.join(cwd, filename);
        try {
          await writeFile(filepath, output, "utf-8");
          finalOutput = `${finalOutput}\n\n[Output was truncated. Full output written to: ${filepath}]`;
        } catch {
          // ignore file write errors
        }
      }

      resolve({
        output:
          (truncation.content || formatToolOutput("", "", exitCode)) +
          finalOutput,
        exitCode,
        cancelled: Boolean(signal?.aborted),
        truncated: truncation.truncated,
      });
    });
  });
}

export default function nuBashExtension(pi: ExtensionAPI) {
  pi.on("session_start", (_, _ctx) => {
    _ctx.ui.setEditorComponent(
      (tui, theme, keybindings) => new NuEditor(tui, theme, keybindings),
    );
  });

  pi.registerTool({
    name: "nu",
    label: "nushell",
    description:
      "Execute shell commands through Nushell instead of the default bash backend.",
    promptSnippet: "Run Nushell commands in the current working directory",
    promptGuidelines: [
      ...nushellGuidelines,
      ...nushellRipgrepGuidelines,
      ...nushellTextReplacementGuidelines,
    ],
    parameters: Type.Object({
      command: Type.String({ description: "Bash command to execute" }),
      timeout: Type.Optional(
        Type.Number({
          description:
            "Optional timeout in seconds before the command is aborted",
        }),
      ),
    }) as never,
    async execute(
      _toolCallId,
      params: { command: string; timeout?: number },
      signal,
      onUpdate,
      ctx,
    ) {
      const timeoutSignal = params.timeout
        ? AbortSignal.timeout(params.timeout * 1000)
        : undefined;
      const combinedSignal = timeoutSignal
        ? AbortSignal.any(signal ? [signal, timeoutSignal] : [timeoutSignal])
        : signal;

      const result = await executeNushellCommand(
        params.command,
        ctx.cwd,
        combinedSignal,
        (output, exitCode) => {
          onUpdate?.({
            content: output ? [{ type: "text", text: output }] : [],
            details: {
              command: params.command,
              backend: "nu",
              cwd: ctx.cwd,
              exitCode,
              streaming: true,
            },
          });
        },
      );

      return {
        content: [
          {
            type: "text",
            text: result.output,
          },
        ],
        details: {
          command: params.command,
          backend: "nu",
          cwd: ctx.cwd,
          exitCode: result.exitCode,
          output: result.output,
          killed: result.cancelled,
          truncated: result.truncated,
        },
        isError: result.exitCode !== 0,
      };
    },
  });

  pi.on("user_bash", async () => {
    return {
      operations: nuOperations,
    };
  });
}
