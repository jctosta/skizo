import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";
import { openPreview } from "./helpers/preview-page";

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

test("a Preview opened with the network blocked shows its content styled", async () => {
  const { sketch, external } = await openPreview(browser, `Screen "Orders" subtitle="Manage orders"\n  Heading "Recent orders"\n`, { window: 640 });
  const title = sketch.getByRole("heading", { name: "Orders", level: 1 });
  expect({
    visible: await title.isVisible(),
    fontWeight: await title.evaluate((el) => getComputedStyle(el).fontWeight),
    external,
  }).toEqual({ visible: true, fontWeight: "600", external: [] });
});

test("clicking a Tab shows its panel and hides the others", async () => {
  const { sketch } = await openPreview(browser, `Screen "Orders"\n  Tabs\n    Tab "All"\n      "Every order"\n    Tab "Open"\n      "Open orders"\n`);
  await sketch.getByRole("tab", { name: "Open" }).click();

  expect({
    selected: await sketch.getByRole("tab", { selected: true }).textContent(),
    openPanel: await sketch.getByText("Open orders").isVisible(),
    allPanel: await sketch.getByText("Every order").isVisible(),
  }).toEqual({ selected: "Open", openPanel: true, allPanel: false });
});
