import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { check } from "@skizo/core";

export type Io = { stdout(s: string): void; stderr(s: string): void; cwd: string; signal?: AbortSignal };

/** The whole CLI. Never touches process: argv in, exit code out, file paths resolved against io.cwd. */
export async function run(argv: string[], io: Io): Promise<number> {
  const [command, file] = argv;
  if (command === "check" && file) {
    const { errors } = check(readFileSync(resolve(io.cwd, file), "utf8"));
    if (!errors.length) io.stdout(`${file}: ok\n`);
    for (const e of errors) io.stdout(`${file}:${e.line}  ${e.type}  ${e.message}\n`);
    return errors.length ? 1 : 0;
  }
  io.stderr(`unknown command ${command}\n`);
  return 2;
}
