import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, onTestFinished, test } from "vitest";
import { watchPreview, withFiles } from "./helpers/run-cli";

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

test("saving the source reloads the open Preview with the new content", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n` });
  const { url } = await watchPreview(cwd);

  const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
  onTestFinished(() => context.close());
  const page = await context.newPage();
  await page.goto(url);
  const sketch = page.frameLocator("iframe");
  await sketch.getByRole("heading", { name: "Orders", level: 1 }).waitFor();

  writeFileSync(join(cwd, "orders.skz"), `Screen "Invoices"\n`);
  await sketch.getByRole("heading", { name: "Invoices", level: 1 }).waitFor({ timeout: 5_000 });
  expect(await page.title()).toBe("Invoices");
});

test("a reload keeps the width picked in the toolbar and the Screen shown", async () => {
  const flow = (text: string) => `Screen "Orders"\n  Button "See invoices" to=invoices\n\nScreen "Invoices"\n  "${text}"\n`;
  const cwd = withFiles({ "orders.skz": flow("Nothing yet.") });
  const { url } = await watchPreview(cwd);

  const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
  onTestFinished(() => context.close());
  const page = await context.newPage();
  await page.goto(url);
  const sketch = page.frameLocator("iframe");
  await page.getByRole("button", { name: "Phone" }).click();
  await sketch.getByRole("link", { name: "See invoices" }).click();
  await sketch.getByRole("heading", { name: "Invoices", level: 1 }).waitFor();

  writeFileSync(join(cwd, "orders.skz"), flow("Two invoices."));
  await sketch.getByText("Two invoices.").waitFor({ timeout: 5_000 });
  expect({
    pressed: await page.getByRole("button", { pressed: true }).allTextContents(),
    width: await sketch.locator("html").evaluate(() => innerWidth),
    shown: await sketch.getByRole("heading", { level: 1 }).filter({ visible: true }).allTextContents(),
  }).toEqual({ pressed: ["Phone"], width: 390, shown: ["Invoices"] });
});
