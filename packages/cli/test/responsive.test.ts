// Responsive layout: both Backends write the same Tailwind breakpoint classes. Phone is the base classes,
// tablet is md: (from 768 px), desktop is lg: (from 1024 px). Slow checks at real widths: responsive.slow.test.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { CLASSES } from "../src/classes";
import { runCli, withFiles } from "./helpers/run-cli";

/** The class lists of `source`'s Preview and shadcn export, in document order. */
async function classLists(source: string) {
  const cwd = withFiles({ "app.skz": source });
  const checked = await runCli(["check", "app.skz"], cwd);
  expect(checked.stdout).toBe("app.skz: ok\n");
  await runCli(["preview", "app.skz"], cwd);
  await runCli(["export", "app.skz", "--target", "shadcn", "--out", "out"], cwd);
  const html = readFileSync(join(cwd, "app.html"), "utf8").replace(/<style>[\s\S]*?<\/style>/, "");
  const tsx = readFileSync(join(cwd, "out/app.tsx"), "utf8");
  return {
    preview: [...html.matchAll(/ class="([^"]*)"/g)].map((m) => m[1]),
    export: [...tsx.matchAll(/ className="([^"]*)"/g)].map((m) => m[1]),
  };
}

test("the precompiled Preview CSS styles every breakpoint class that CLASSES holds", () => {
  const css = readFileSync(new URL("../assets/preview.css", import.meta.url), "utf8");
  const all = (v: unknown): string[] => (typeof v === "string" ? v.split(" ").filter(Boolean) : Object.values(v as object).flatMap(all));
  const responsive = [...new Set(all(CLASSES))].filter((c) => /^(md|lg):/.test(c));
  // A class in CSS escapes every character that is not a letter, digit, - or _.
  expect(responsive.filter((c) => !css.includes(`.${c.replace(/[^\w-]/g, "\\$&")}`))).toEqual([]);
  expect(responsive).toContain("lg:grid-cols-6");
});

test("a Grid shows one column on phones, at most two on tablets and its cols on desktop, in both Backends", async () => {
  const { preview, export: exported } = await classLists(`Screen "App"\n  Grid cols=3\n    "A"\n  Grid\n    "B"\n`);
  const grids = (classes: (string | undefined)[]) => classes.filter((c) => c?.startsWith("grid grid-cols"));
  const expected = ["grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", "grid grid-cols-1 md:grid-cols-2 gap-4"];
  expect({ preview: grids(preview), export: grids(exported) }).toEqual({ preview: expected, export: expected });
});

test("a Grid child's span never exceeds the columns at each width, in both Backends", async () => {
  const source = `Screen "App"\n  Grid cols=4\n    Text "A" span=1\n    Text "B" span=2\n    Text "C" span=3\n    Text "D" span=4\n`;
  const { preview, export: exported } = await classLists(source);
  const cells = (classes: (string | undefined)[]) => classes.filter((c) => c?.includes("col-span-"));
  const expected = ["grid col-span-1", "grid md:col-span-2", "grid md:col-span-2 lg:col-span-3", "grid md:col-span-2 lg:col-span-4"];
  expect({ preview: cells(preview), export: cells(exported) }).toEqual({ preview: expected, export: expected });
});

test("a Row wraps its children onto more lines when they do not fit, in both Backends", async () => {
  const { preview, export: exported } = await classLists(`Screen "App"\n  Row gap=sm align=center\n    Text "A"\n`);
  const rows = (classes: (string | undefined)[]) => classes.filter((c) => c?.startsWith("flex flex-wrap"));
  const expected = ["flex flex-wrap gap-2 items-center"];
  expect({ preview: rows(preview), export: rows(exported) }).toEqual({ preview: expected, export: expected });
});

test("a Screen has smaller padding on phones, with or without a Sidebar, in both Backends", async () => {
  // One Screen per file: the export's out/app.tsx holds it, and the Preview has no other Screen.
  const pads = (classes: (string | undefined)[]) => classes.filter((c) => /min-h-screen p|flex-1 p/.test(c ?? ""));
  const plain = await classLists(`Screen "App"\n  "A"\n`);
  const shell = await classLists(`Screen "App"\n  Sidebar\n    Link "Home"\n  "A"\n`);
  expect([plain, shell].map(({ preview, export: exported }) => ({ preview: pads(preview), export: pads(exported) }))).toEqual([
    { preview: ["min-h-screen p-4 md:p-6"], export: ["min-h-screen p-4 md:p-6"] },
    { preview: ["min-w-0 flex-1 p-4 md:p-6"], export: ["min-w-0 flex-1 p-4 md:p-6"] },
  ]);
});

test("on phones the Sidebar column hides and a menu Button shows instead, in both Backends", async () => {
  const { preview, export: exported } = await classLists(`Screen "App"\n  Sidebar\n    Link "Home"\n  "A"\n`);
  // The display classes of the Elements that switch at md:: the column, then the menu Button.
  const switching = (classes: (string | undefined)[]) =>
    classes
      .filter((c) => /\bmd:(flex|hidden)\b/.test(c ?? ""))
      .map((c) => c!.split(" ").filter((k) => ["hidden", "md:flex", "md:hidden"].includes(k)).join(" "));
  const expected = ["hidden md:flex", "md:hidden"];
  expect({ preview: switching(preview), export: switching(exported) }).toEqual({ preview: expected, export: expected });
});
