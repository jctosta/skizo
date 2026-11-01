import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";
import { runCli, withFiles } from "./helpers/run-cli";

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

test("a Preview opened with the network blocked shows its content styled", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders" subtitle="Manage orders"\n  Heading "Recent orders"\n` });
  await runCli(["preview", "orders.skz"], cwd);

  const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const external: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) return route.continue();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(cwd, "orders.html")).href);

  const title = page.getByRole("heading", { name: "Orders", level: 1 });
  expect({
    visible: await title.isVisible(),
    fontWeight: await title.evaluate((el) => getComputedStyle(el).fontWeight),
    external,
  }).toEqual({ visible: true, fontWeight: "600", external: [] });
  await context.close();
});

test("clicking a Tab shows its panel and hides the others", async () => {
  const cwd = withFiles({
    "orders.skz": `Screen "Orders"\n  Tabs\n    Tab "All"\n      "Every order"\n    Tab "Open"\n      "Open orders"\n`,
  });
  await runCli(["preview", "orders.skz"], cwd);

  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  await page.goto(pathToFileURL(join(cwd, "orders.html")).href);
  await page.getByRole("tab", { name: "Open" }).click();

  expect({
    selected: await page.getByRole("tab", { selected: true }).textContent(),
    openPanel: await page.getByText("Open orders").isVisible(),
    allPanel: await page.getByText("Every order").isVisible(),
  }).toEqual({ selected: "Open", openPanel: true, allPanel: false });
  await page.close();
});
