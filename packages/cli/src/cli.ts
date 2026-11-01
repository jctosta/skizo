#!/usr/bin/env node
import { run } from "./run";

const ac = new AbortController();
process.once("SIGINT", () => ac.abort());
process.exitCode = await run(process.argv.slice(2), {
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
  cwd: process.cwd(),
  signal: ac.signal,
});
