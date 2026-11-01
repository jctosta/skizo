import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { runCli, tempDir, withFiles } from "./helpers/run-cli";

const VALID = `Screen "Orders" subtitle="Manage orders"\n  Heading "Recent orders"\n  "Nothing yet."\n`;
const PREVIEW_CSS = readFileSync(new URL("../assets/preview.css", import.meta.url), "utf8");

test("preview writes <name>.html next to the source", async () => {
  const cwd = tempDir();
  mkdirSync(join(cwd, "sketches"));
  writeFileSync(join(cwd, "sketches/orders.skz"), VALID);
  const { code, stdout } = await runCli(["preview", "sketches/orders.skz"], cwd);
  expect({ code, stdout, written: existsSync(join(cwd, "sketches/orders.html")) }).toEqual({
    code: 0,
    stdout: "wrote sketches/orders.html\n",
    written: true,
  });
});

test("preview refuses a file that fails check and prints the same errors", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Headng "Totals"\n` });
  const checked = await runCli(["check", "orders.skz"], cwd);
  const previewed = await runCli(["preview", "orders.skz"], cwd);
  expect({ code: previewed.code, stderr: previewed.stderr, written: existsSync(join(cwd, "orders.html")) }).toEqual({
    code: 1,
    stderr: checked.stdout,
    written: false,
  });
});

test("the Preview inlines the precompiled CSS and references nothing outside the file", async () => {
  const cwd = withFiles({ "orders.skz": VALID });
  await runCli(["preview", "orders.skz"], cwd);
  const html = readFileSync(join(cwd, "orders.html"), "utf8");
  expect(html).toContain(`<style>${PREVIEW_CSS}</style>`);
  expect(html).not.toMatch(/\b(src|href)=|url\(|@import/);
});

test("the Preview inlines SVG for the Lucide icons the file uses, and only those", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Button "New order" icon=plus\n  Button "Add more" icon=plus\n` });
  await runCli(["preview", "orders.skz"], cwd);
  const svgs = readFileSync(join(cwd, "orders.html"), "utf8").match(/<svg[\s\S]*?<\/svg>/g);
  // Lucide's plus: two strokes.
  expect(svgs?.map((svg) => svg.replace(/^<svg[^>]*>/, ""))).toEqual([
    '<path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    '<path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  ]);
});

test("a Preview of Screens that no to= links shows them all, since nothing could reach a hidden one", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  "First"\n\nScreen "Invoices"\n  "Second"\n` });
  await runCli(["preview", "orders.skz"], cwd);
  expect(readFileSync(join(cwd, "orders.html"), "utf8").match(/<section[^>]*>/g)).toEqual([
    '<section data-screen="orders" class="min-h-screen p-6">',
    '<section data-screen="invoices" class="min-h-screen p-6">',
  ]);
});

test("previewing the same file twice gives byte-identical output", async () => {
  const cwd = withFiles({ "orders.skz": VALID });
  await runCli(["preview", "orders.skz"], cwd);
  const first = readFileSync(join(cwd, "orders.html"), "utf8");
  await runCli(["preview", "orders.skz"], cwd);
  expect(readFileSync(join(cwd, "orders.html"), "utf8")).toBe(first);
});
