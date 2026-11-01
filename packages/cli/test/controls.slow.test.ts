import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";
import { runCli, withFiles } from "./helpers/run-cli";

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

const SKETCH = `Screen "New order"
  Button "More actions" icon=ellipsis icon-only variant=ghost
  Select "Status" options="Open,Paid" value=Open
  Select "Plan" options="Free,Pro" placeholder="Pick a plan" open
  Card "Order #1042"
    actions
      Menu "Row actions" icon=ellipsis icon-only variant=ghost
        Item "Edit"
        Item "Duplicate"
        Item "Delete" destructive
`;

/** Opens the Preview of `sketch` with the network blocked; `external` collects any request that left the file. */
async function openPreview(sketch = SKETCH): Promise<{ page: Page; external: string[] }> {
  const cwd = withFiles({ "order.skz": sketch });
  await runCli(["preview", "order.skz"], cwd);
  const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const external: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) return route.continue();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(cwd, "order.html")).href);
  return { page, external };
}

test("a Select opens on click and shows its options, without network requests", async () => {
  const { page, external } = await openPreview();
  const paid = page.getByRole("option", { name: "Paid" });
  const hiddenBefore = await paid.isHidden();
  await page.getByRole("combobox", { name: "Status" }).click();
  expect({ hiddenBefore, visibleAfter: await paid.isVisible(), external }).toEqual({
    hiddenBefore: true,
    visibleAfter: true,
    external: [],
  });
  await page.context().close();
});

test("a Select flagged open shows its options on load", async () => {
  const { page } = await openPreview();
  expect(await page.getByRole("option", { name: "Pro" }).isVisible()).toBe(true);
  await page.context().close();
});

test("a Menu opens on click, unclipped by its Card and inside the window, and closes on an outside click", async () => {
  const { page } = await openPreview();
  const deleteItem = page.getByRole("menuitem", { name: "Delete" });
  const hiddenBefore = await deleteItem.isHidden();
  await page.getByRole("button", { name: "Row actions" }).click();
  // The last item hangs below its short Card: the pointer hits it only if the Card's overflow-hidden does not clip it.
  const unclipped = await deleteItem.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
  });
  const box = await page.getByRole("menu", { name: "Row actions" }).boundingBox();
  await page.getByRole("heading", { name: "New order" }).click();
  const insideWindow = box!.x >= 0 && box!.x + box!.width <= 640;
  expect({ hiddenBefore, unclipped, insideWindow, hiddenAfter: await deleteItem.isHidden() }).toEqual({
    hiddenBefore: true,
    unclipped: true,
    insideWindow: true,
    hiddenAfter: true,
  });
  await page.context().close();
});

test("a Select in a Card opens unclipped by the Card", async () => {
  const { page } = await openPreview(`Screen "Billing"\n  Card "Payment"\n    Select "Currency" options="EUR,USD,BRL"\n`);
  await page.getByRole("combobox", { name: "Currency" }).click();
  // The last option hangs below the short Card: the pointer hits it only if the Card's overflow-hidden does not clip it.
  const unclipped = await page.getByRole("option", { name: "BRL" }).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
  });
  expect(unclipped).toBe(true);
  await page.context().close();
});

test("an icon-only Button shows only its icon and keeps its Label as the accessible name", async () => {
  const { page } = await openPreview();
  const button = page.getByRole("button", { name: "More actions" });
  const box = await button.boundingBox();
  // The visible content is the icon alone: a square icon button (shadcn size="icon", 36px).
  expect({ icons: await button.locator("svg").count(), width: box?.width, height: box?.height }).toEqual({
    icons: 1,
    width: 36,
    height: 36,
  });
  await page.context().close();
});
