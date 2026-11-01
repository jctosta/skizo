import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { check, didYouMean, type CheckError, type Document } from "@skizo/core";
import { readAsset } from "./assets";
import { iconNames } from "./icons";
import { renderPreview } from "./preview/page";
import { watchPreview } from "./preview/watch";
import { exportShadcn } from "./shadcn/export";

export type Io = { stdout(s: string): void; stderr(s: string): void; cwd: string; signal?: AbortSignal };

type Command = {
  /** Set for commands that take no <file.skz>; `file` is then "". */
  noFile?: true;
  options?: ParseArgsOptionsConfig;
  run(file: string, flags: Record<string, unknown>, io: Io): Promise<number> | number;
};

/** Export targets by `--target` name. Each turns a checked document into files: name → content. */
const TARGETS = new Map([["shadcn", exportShadcn]]);

/** One entry per CLI command. Each takes one source file (unless noFile) plus its own options. */
const COMMANDS: Record<string, Command> = {
  guide: {
    noFile: true,
    run(_file, _flags, io) {
      io.stdout(readAsset("GUIDE.md"));
      return 0;
    },
  },
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
  preview: {
    options: { watch: { type: "boolean" } },
    run(file, flags, io) {
      const out = `${file.replace(/\.skz$/, "")}.html`;
      const build = () => {
        const document = loadChecked(file, io);
        if (typeof document === "number") return document;
        const html = renderPreview(document);
        writeFileSync(resolve(io.cwd, out), html);
        io.stdout(`wrote ${out}\n`);
        return html;
      };
      const html = build();
      if (typeof html === "number") return html;
      return flags.watch ? watchPreview(resolve(io.cwd, file), html, build, io) : 0;
    },
  },
  export: {
    options: { target: { type: "string" }, out: { type: "string" } },
    run(file, flags, io) {
      const target = flags.target as string | undefined;
      const exportTarget = TARGETS.get(target ?? "");
      if (!exportTarget) {
        const problem = target === undefined ? "--target is required" : `unknown target "${target}"${didYouMean(target, TARGETS.keys())}`;
        io.stderr(`skizo export: ${problem} (expected: ${[...TARGETS.keys()].join(", ")})\n`);
        return 2;
      }
      const document = loadChecked(file, io);
      if (typeof document === "number") return document;
      const files = exportTarget(document);
      const unsafe = Object.keys(files).find((name) => basename(name) !== name);
      if (unsafe) {
        io.stderr(`skizo export: "${unsafe}" is not a plain file name (check the Screen id)\n`);
        return 1;
      }
      const out = (flags.out as string | undefined) ?? dirname(file);
      mkdirSync(resolve(io.cwd, out), { recursive: true });
      for (const [name, content] of Object.entries(files)) {
        writeFileSync(resolve(io.cwd, out, name), content);
        io.stdout(`wrote ${join(out, name)}\n`);
      }
      return 0;
    },
  },
};

const USAGE = `Usage: skizo <command>   (alias: skz)

  skizo guide                                          print the Guide to the Skizo language
  skizo check   <file.skz> [--json]                    report every error in a file
  skizo preview <file.skz> [--watch]                   write <file>.html; --watch serves it with live reload
  skizo export  <file.skz> --target shadcn [--out dir] write one React file per Screen

Agents: run \`skizo guide\` before writing Skizo.
`;

/** The whole CLI. Never touches process: argv in, exit code out, file paths resolved against io.cwd. */
export async function run(argv: string[], io: Io): Promise<number> {
  const [name = "", ...rest] = argv;
  if (name === "--help" || name === "-h") {
    io.stdout(USAGE);
    return 0;
  }
  if (!name) {
    io.stderr(USAGE);
    return 2;
  }
  // hasOwn: `skizo toString` must not find Object.prototype's.
  const command = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
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
  const [file = "", ...extra] = args.positionals;
  if (command.noFile ? args.positionals.length : !file || extra.length) {
    io.stderr(`skizo ${name}: ${command.noFile ? "takes no arguments" : "expected one <file.skz>"}\n`);
    return 2;
  }
  return command.run(file, args.values, io);
}

function load(file: string, io: Io) {
  let source;
  try {
    source = readFileSync(resolve(io.cwd, file), "utf8");
  } catch (e) {
    io.stderr(`skizo: cannot read ${file} (${(e as NodeJS.ErrnoException).code ?? (e as Error).message})\n`);
    return undefined;
  }
  return check(source, { iconNames: iconNames() });
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
