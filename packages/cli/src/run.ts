import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { check, didYouMean, type CheckError, type Document } from "@skizo/core";

export type Io = { stdout(s: string): void; stderr(s: string): void; cwd: string; signal?: AbortSignal };

type Command = {
  options?: ParseArgsOptionsConfig;
  run(file: string, flags: Record<string, unknown>, io: Io): Promise<number> | number;
};

/** One entry per CLI command. Each takes one source file plus its own options. */
const COMMANDS: Record<string, Command> = {
  check: {
    options: { json: { type: "boolean" } },
    run(file, flags, io) {
      const result = load(file, io);
      if (!result) return 2;
      const { errors } = result;
      if (flags.json) io.stdout(`${JSON.stringify({ errors: errors.map((e) => ({ file, ...e })) }, null, 2)}\n`);
      else io.stdout(errors.length ? errorLines(file, errors) : `${file}: ok\n`);
      return errors.length ? 1 : 0;
    },
  },
};

/** The whole CLI. Never touches process: argv in, exit code out, file paths resolved against io.cwd. */
export async function run(argv: string[], io: Io): Promise<number> {
  const [name = "", ...rest] = argv;
  const command = COMMANDS[name];
  if (!command) {
    io.stderr(`skizo: unknown command "${name}"${didYouMean(name, Object.keys(COMMANDS))}\n`);
    return 2;
  }
  let args;
  try {
    args = parseArgs({ args: rest, options: command.options ?? {}, allowPositionals: true });
  } catch (e) {
    io.stderr(`skizo ${name}: ${(e as Error).message}\n`);
    return 2;
  }
  const [file, ...extra] = args.positionals;
  if (!file || extra.length) {
    io.stderr(`skizo ${name}: expected one <file.skz>\n`);
    return 2;
  }
  return command.run(file, args.values, io);
}

function load(file: string, io: Io) {
  let source;
  try {
    source = readFileSync(resolve(io.cwd, file), "utf8");
  } catch {
    io.stderr(`skizo: cannot read ${file}\n`);
    return undefined;
  }
  return check(source);
}

/**
 * For Backends: the checked document, or the exit code after printing why there is none.
 * A file that fails check gets the same error lines as `skizo check`, on stderr.
 */
export function loadChecked(file: string, io: Io): Document | number {
  const result = load(file, io);
  if (!result) return 2;
  if (!result.errors.length) return result.document;
  io.stderr(errorLines(file, result.errors));
  return 1;
}

const errorLines = (file: string, errors: CheckError[]) =>
  errors.map((e) => `${file}:${e.line}  ${e.type}  ${e.message}\n`).join("");
