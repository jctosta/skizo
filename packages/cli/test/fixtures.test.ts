// Golden fixtures: one directory per rule or sketch under fixtures/, holding input.skz and its goldens.
// check.txt is the stdout of `skizo check input.skz`. Inputs that pass check also get preview.html and shadcn/<screen id>.tsx,
// plus shadcn-<router>/<screen id>.tsx for each such folder in the fixture (make the empty folder, then run -u).
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

    // A shadcn-<router>/ folder in the fixture holds the export with --router <router>.
    const routers = readdirSync(dir).filter((name) => name.startsWith("shadcn-"));
    for (const out of ["shadcn", ...routers]) {
      const router = out === "shadcn" ? [] : ["--router", out.slice("shadcn-".length)];
      const exported = await runCli(["export", "input.skz", "--target", "shadcn", ...router, "--out", out], cwd);
      expect(exported.code).toBe(0);
      for (const file of readdirSync(join(cwd, out)))
        await expect(readFileSync(join(cwd, out, file), "utf8")).toMatchFileSnapshot(join(dir, out, file));
    }
  });
}
