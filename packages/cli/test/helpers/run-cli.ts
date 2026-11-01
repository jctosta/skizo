import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished } from "vitest";
import { run } from "../../src/run";

export const tempDir = () => mkdtempSync(join(tmpdir(), "skizo-"));

/** Runs the CLI in-process, the way `skizo <argv>` would from `cwd`. */
export async function runCli(argv: string[], cwd = tempDir()) {
  let stdout = "";
  let stderr = "";
  const code = await run(argv, { stdout: (s) => (stdout += s), stderr: (s) => (stderr += s), cwd });
  return { code, stdout, stderr, cwd };
}

/**
 * Starts a long-running command such as `preview --watch` without waiting for it.
 * `out` fills as it prints; `stop()` is Ctrl-C and resolves to the exit code. It runs anyway when the test ends.
 */
export function startCli(argv: string[], cwd: string) {
  const ac = new AbortController();
  const out = { stdout: "", stderr: "" };
  const io = { stdout: (s: string) => (out.stdout += s), stderr: (s: string) => (out.stderr += s), cwd };
  const exited = run(argv, { ...io, signal: ac.signal });
  const stop = () => (ac.abort(), exited);
  onTestFinished(async () => {
    await stop();
  });
  return { out, stop };
}

/** Writes `files` (name → content) into a fresh temp dir and returns its path. */
export function withFiles(files: Record<string, string>) {
  const cwd = tempDir();
  for (const [name, content] of Object.entries(files)) writeFileSync(join(cwd, name), content);
  return cwd;
}
