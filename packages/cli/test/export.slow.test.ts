// Type-checks the shadcn export of every fixture that passes check against the vendored shadcn sources
// in shadcn-app/ (Radix base, style radix-vega), plain and with each --router whose output differs from the plain
// one (links, Next's "use client"; stubs in src/routers.d.ts). New Element types are covered by adding a fixture.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
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
  const contents = (dir: string) => readdirSync(dir).map((file) => readFileSync(join(dir, file), "utf8"));
  const exported: string[] = [];
  for (const name of readdirSync(FIXTURES)) {
    const input = join(FIXTURES, name, "input.skz");
    const plain = join(screens, name);
    if ((await runCli(["export", input, "--target", "shadcn", "--out", plain])).code !== 0) continue;
    exported.push(plain);
    for (const router of ["next", "react-router"]) {
      const out = `${plain}-${router}`;
      await runCli(["export", input, "--target", "shadcn", "--router", router, "--out", out]);
      if (JSON.stringify(contents(out)) === JSON.stringify(contents(plain))) rmSync(out, { recursive: true });
      else exported.push(out);
    }
  }
  // Each variant is type-checked somewhere.
  const variants = new Set(exported.map((dir) => dir.match(/-(next|react-router)$/)?.[1] ?? "plain"));
  expect(variants).toEqual(new Set(["plain", "next", "react-router"]));

  const tsc = spawnSync(process.execPath, [TSC, "-p", APP], { encoding: "utf8" });
  expect({ status: tsc.status, diagnostics: tsc.stdout }).toEqual({ status: 0, diagnostics: "" });
});
