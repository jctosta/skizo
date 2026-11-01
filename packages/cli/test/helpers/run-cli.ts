import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../../src/run";

export const tempDir = () => mkdtempSync(join(tmpdir(), "skizo-"));

/** Runs the CLI in-process, the way `skizo <argv>` would from `cwd`. */
export async function runCli(argv: string[], cwd = tempDir()) {
  let stdout = "";
  let stderr = "";
  const code = await run(argv, { stdout: (s) => (stdout += s), stderr: (s) => (stderr += s), cwd });
  return { code, stdout, stderr, cwd };
}

/** Writes `files` (name → content) into a fresh temp dir and returns its path. */
export function withFiles(files: Record<string, string>) {
  const cwd = tempDir();
  for (const [name, content] of Object.entries(files)) writeFileSync(join(cwd, name), content);
  return cwd;
}
