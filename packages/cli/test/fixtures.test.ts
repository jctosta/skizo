// Golden fixtures: one directory per rule or sketch under fixtures/, holding input.skz and its goldens.
// check.txt is the stdout of `skizo check input.skz`; preview.html is written only for inputs that pass check.
// Add a fixture by adding a directory; `vitest run -u` writes goldens for a new one (review them before committing).
import { copyFileSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { runCli, tempDir } from "./helpers/run-cli";

const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));

/** The inlined CSS changes whenever any emitter gains a class; keep it out of the goldens. */
const withoutCss = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/, "<style>/* preview.css */</style>");

for (const name of readdirSync(FIXTURES)) {
  const dir = join(FIXTURES, name);
  test(name, async () => {
    const cwd = tempDir();
    copyFileSync(join(dir, "input.skz"), join(cwd, "input.skz"));

    const checked = await runCli(["check", "input.skz"], cwd);
    await expect(checked.stdout).toMatchFileSnapshot(join(dir, "check.txt"));
    if (checked.code !== 0) return;

    const previewed = await runCli(["preview", "input.skz"], cwd);
    expect(previewed.code).toBe(0);
    await expect(withoutCss(readFileSync(join(cwd, "input.html"), "utf8"))).toMatchFileSnapshot(join(dir, "preview.html"));
  });
}
