import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, onTestFinished, test, vi } from "vitest";
import { startCli, withFiles } from "./helpers/run-cli";

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

test("saving the source reloads the open Preview with the new content", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n` });
  const cli = startCli(["preview", "orders.skz", "--watch"], cwd);
  const url = await vi.waitUntil(() => cli.out.stdout.match(/^Preview: (http:\S+)$/m)?.[1]);

  const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
  onTestFinished(() => context.close());
  const page = await context.newPage();
  await page.goto(url);
  await page.getByRole("heading", { name: "Orders", level: 1 }).waitFor();

  writeFileSync(join(cwd, "orders.skz"), `Screen "Invoices"\n`);
  await page.getByRole("heading", { name: "Invoices", level: 1 }).waitFor({ timeout: 5_000 });
  expect(await page.title()).toBe("Invoices");
});
