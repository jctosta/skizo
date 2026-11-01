// Type-checks the shadcn export of every fixture that passes check against the vendored shadcn sources
// in shadcn-app/ (Radix base, style radix-vega), once plain and once with each --router (stubs in src/routers.d.ts).
// New Element types are covered by adding a fixture.
import { spawnSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { runCli } from "./helpers/run-cli";

const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));
const APP = fileURLToPath(new URL("./shadcn-app/", import.meta.url));
// TS 7 has no JS API and `bin/tsc` is not in its exports: run the script with node.
const TSC = join(dirname(createRequire(import.meta.url).resolve("typescript/package.json")), "bin/tsc");

test("exported TSX type-checks against the vendored shadcn components", async () => {
  // Inside the app (not a tmpdir) so imports resolve through packages/cli/node_modules.
  const screens = join(APP, "src/screens");
  rmSync(screens, { recursive: true, force: true });
  const exported: string[] = [];
  for (const name of readdirSync(FIXTURES)) {
    const input = join(FIXTURES, name, "input.skz");
    for (const router of [[], ["--router", "next"], ["--router", "react-router"]]) {
      const out = join(screens, [name, ...router.slice(1)].join("-"));
      const { code } = await runCli(["export", input, "--target", "shadcn", ...router, "--out", out]);
      if (code === 0) exported.push(out);
    }
  }
  expect(exported).not.toEqual([]);

  const tsc = spawnSync(process.execPath, [TSC, "-p", APP], { encoding: "utf8" });
  expect({ status: tsc.status, diagnostics: tsc.stdout }).toEqual({ status: 0, diagnostics: "" });
});
