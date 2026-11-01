import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { runCli, tempDir, withFiles } from "./helpers/run-cli";

const TWO_SCREENS = `Screen "Orders"\n  Heading "Recent orders"\n\nScreen "Order details"\n  "Nothing yet."\n`;

test("export writes one .tsx per Screen next to the source, named after the Screen id", async () => {
  const cwd = tempDir();
  mkdirSync(join(cwd, "sketches"));
  writeFileSync(join(cwd, "sketches/orders.skz"), TWO_SCREENS);
  const { code, stdout } = await runCli(["export", "sketches/orders.skz", "--target", "shadcn"], cwd);
  expect({ code, stdout, files: readdirSync(join(cwd, "sketches")).sort() }).toEqual({
    code: 0,
    stdout: "wrote sketches/orders.tsx\nwrote sketches/order-details.tsx\n",
    files: ["order-details.tsx", "orders.skz", "orders.tsx"],
  });
});

test("--out writes the files into the chosen folder, creating it", async () => {
  const cwd = tempDir();
  writeFileSync(join(cwd, "orders.skz"), TWO_SCREENS);
  const { code, stdout } = await runCli(["export", "orders.skz", "--target", "shadcn", "--out", "src/screens"], cwd);
  expect({ code, stdout, files: readdirSync(join(cwd, "src/screens")).sort() }).toEqual({
    code: 0,
    stdout: "wrote src/screens/orders.tsx\nwrote src/screens/order-details.tsx\n",
    files: ["order-details.tsx", "orders.tsx"],
  });
});

test("each exported file exports a component named <PascalCaseId>Screen", async () => {
  const cwd = tempDir();
  writeFileSync(join(cwd, "orders.skz"), TWO_SCREENS);
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  expect(readFileSync(join(cwd, "order-details.tsx"), "utf8")).toContain("export function OrderDetailsScreen() {");
});

test("an Overlay without desc tells Radix it has no description, so the exported app logs no warning", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Dialog "Confirm"\n  Sheet "Filters" desc="Narrow the list"\n` });
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  const contents = readFileSync(join(cwd, "orders.tsx"), "utf8").match(/<(Dialog|Sheet)Content[^>]*>/g);
  expect(contents).toEqual(["<DialogContent aria-describedby={undefined}>", "<SheetContent>"]);
});

test("a disabled Button with to= exports as a disabled Button with no link", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Button "Next page" disabled to=orders\n` });
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  expect(readFileSync(join(cwd, "orders.tsx"), "utf8")).toContain("<Button disabled>Next page</Button>");
});

test("export refuses a file that fails check and prints the same errors", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Headng "Totals"\n` });
  const checked = await runCli(["check", "orders.skz"], cwd);
  const exported = await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  expect({ code: exported.code, stderr: exported.stderr, files: readdirSync(cwd) }).toEqual({
    code: 1,
    stderr: checked.stdout,
    files: ["orders.skz"],
  });
});

test("exporting an unchanged file twice gives byte-identical output", async () => {
  const cwd = withFiles({ "orders.skz": TWO_SCREENS });
  const read = () => ["orders.tsx", "order-details.tsx"].map((name) => readFileSync(join(cwd, name), "utf8"));
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  const first = read();
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  expect(read()).toEqual(first);
});

test("a Screen id that is not a plain file name is refused instead of written outside the folder", async () => {
  const cwd = tempDir();
  mkdirSync(join(cwd, "sketches"));
  writeFileSync(join(cwd, "sketches/orders.skz"), `Screen "Orders" id=../orders\n`);
  const { code, stderr } = await runCli(["export", "sketches/orders.skz", "--target", "shadcn"], cwd);
  expect({ code, stderr, files: readdirSync(cwd) }).toEqual({
    code: 1,
    stderr: 'skizo export: "../orders.tsx" is not a plain file name (check the Screen id)\n',
    files: ["sketches"],
  });
});

test("export without --target is a usage error that names the targets", async () => {
  const cwd = withFiles({ "orders.skz": TWO_SCREENS });
  const { code, stderr } = await runCli(["export", "orders.skz"], cwd);
  expect({ code, stderr, files: readdirSync(cwd) }).toEqual({
    code: 2,
    stderr: "skizo export: --target is required (expected: shadcn)\n",
    files: ["orders.skz"],
  });
});

test("an unknown --target gets a nearest-match hint", async () => {
  const cwd = withFiles({ "orders.skz": TWO_SCREENS });
  const { code, stderr } = await runCli(["export", "orders.skz", "--target", "shadcm"], cwd);
  expect({ code, stderr }).toEqual({
    code: 2,
    stderr: 'skizo export: unknown target "shadcm" — did you mean shadcn? (expected: shadcn)\n',
  });
});
