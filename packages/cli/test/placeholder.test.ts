// Placeholder content (Text lorem=N) is generated, so its goldens alone can't show it is deterministic
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
