// Placeholder content (rows=N, lorem=N) is generated, so its goldens alone can't show it is deterministic
// and seeded by node path. These tests pin that through the CLI.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { runCli, withFiles } from "./helpers/run-cli";

/** The text of every default-size paragraph, in the Preview (`class=`) or an export (`className=`). */
const paragraphs = (markup: string) => [...markup.matchAll(/<p class(?:Name)?="text-sm">([^<]*)<\/p>/g)].map((m) => m[1]!);

async function previewParagraphs(source: string) {
  const cwd = withFiles({ "sketch.skz": source });
  await runCli(["preview", "sketch.skz"], cwd);
  return paragraphs(readFileSync(join(cwd, "sketch.html"), "utf8"));
}

test("Text lorem=N previews as N words of placeholder text", async () => {
  const [text] = await previewParagraphs(`Screen "Orders"\n  Text lorem=12\n`);
  expect(text!.split(" ")).toHaveLength(12);
});

test("the Preview and the export show the same placeholder text", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Text lorem=20\n` });
  await runCli(["preview", "orders.skz"], cwd);
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  const exported = paragraphs(readFileSync(join(cwd, "orders.tsx"), "utf8"));
  expect(exported).toEqual(paragraphs(readFileSync(join(cwd, "orders.html"), "utf8")));
});

test("two lorem Texts on one Screen get different placeholder text", async () => {
  const [first, second] = await previewParagraphs(`Screen "Orders"\n  Text lorem=8\n  Text lorem=8\n`);
  expect(first).not.toBe(second);
});

test("adding Elements elsewhere leaves placeholder text unchanged, even when its line shifts", async () => {
  const before = await previewParagraphs(`Screen "Orders"\n  Text lorem=8\n\nScreen "Details"\n  Text lorem=8\n`);
  const after = await previewParagraphs(`Screen "Orders"\n  Text lorem=8\n  Heading "Added"\n\nScreen "Details"\n  Text lorem=8\n`);
  expect(after).toEqual(before);
});

const exportCells = async (source: string) => {
  const cwd = withFiles({ "customers.skz": source });
  await runCli(["export", "customers.skz", "--target", "shadcn"], cwd);
  const tsx = readFileSync(join(cwd, "customers.tsx"), "utf8");
  return [...tsx.matchAll(/<TableCell>(.*)<\/TableCell>/g)].map((m) => m[1]);
};

test("rows=N fills a Table with N rows whose cells are guessed from the column names", async () => {
  const row = (n: number) => [
    expect.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+$/),
    expect.stringMatching(/^[a-z]+\.[a-z]+@example\.com$/),
    expect.stringMatching(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/),
    expect.stringMatching(/^[A-Z][a-z]+$/),
    expect.stringMatching(/^\$\d+\.\d\d$/),
    `Item ${n}`,
  ];
  const cells = await exportCells(`Screen "Customers"\n  Table cols="Customer name,Email,Signup date,Status,Amount,Plan" rows=2\n`);
  expect(cells).toEqual([...row(1), ...row(2)]);
});

test("same-shaped Tables in different Tabs get different placeholder rows", async () => {
  const table = `Table cols="Name,Amount" rows=3`;
  const cells = await exportCells(`Screen "Customers"\n  Tabs\n    Tab "Paid"\n      ${table}\n    Tab "Open"\n      ${table}\n`);
  expect(cells.slice(0, 6)).not.toEqual(cells.slice(6));
});

test("the Email cell belongs to the Name in the same row", async () => {
  const [name, email] = await exportCells(`Screen "Customers"\n  Table cols="Name,Email" rows=1\n`);
  expect(email).toBe(`${name!.toLowerCase().replace(" ", ".")}@example.com`);
});
